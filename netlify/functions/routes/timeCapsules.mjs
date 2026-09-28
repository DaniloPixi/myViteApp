// netlify/functions/routes/timeCapsules.mjs
import express from 'express';
import { saveWithMedia, deleteDocumentWithMedia, flushMediaDeletions } from '../_shared/media.mjs';

export default function createTimeCapsulesRouter(db, cloudinary, sendPushNotification) {
  const router = express.Router();

  /**
   * Small helper to validate/normalize unlockAt
   * We expect unlockAt as an ISO string or "YYYY-MM-DDTHH:mm" from the frontend.
   */
  function parseUnlockAt(unlockAtRaw) {
    if (!unlockAtRaw) return null;
    const d = new Date(unlockAtRaw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString(); // stored as canonical ISO string
  }

  function dateKeyFromIso(iso) {
    if (!iso || typeof iso !== 'string') return null;
    return iso.slice(0, 10); // "YYYY-MM-DD"
  }

  /**
   * GET /api/time-capsules
   * List ALL capsules for any authenticated user.
   */
  router.get('/', async (req, res) => {
    const { uid } = req.user || {};
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: no user in request.' });
    }

    try {
      const col = db.collection('timeCapsules');
      const snap = await col.get();

      const items = [];
      snap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });

      // sort by unlockAt ascending
      items.sort((a, b) => {
        const da = a.unlockAt ? new Date(a.unlockAt).getTime() : 0;
        const db = b.unlockAt ? new Date(b.unlockAt).getTime() : 0;
        return da - db;
      });

      return res.status(200).json({ success: true, items });
    } catch (error) {
      console.error('Error in GET /api/time-capsules:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });

  /**
   * POST /api/time-capsules
   * Create a new time capsule.
   *
   * Body:
   * {
   *   toUid: string,            // recipient user id
   *   unlockAt: string,         // ISO or "YYYY-MM-DDTHH:mm"
   *   title?: string,
   *   message?: string,
   *   photos?: Array<{ url, resource_type }>
   * }
   */
  router.post('/', async (req, res) => {
    const { uid, name, email } = req.user || {};
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: no user in request.' });
    }

    const { toUid, unlockAt: unlockAtRaw, title, message, photos } = req.body || {};

    if (!toUid || !unlockAtRaw) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: toUid and unlockAt',
      });
    }

    const unlockAtIso = parseUnlockAt(unlockAtRaw);
    if (!unlockAtIso) {
      return res.status(400).json({
        success: false,
        message: 'Invalid unlockAt date/time format.',
      });
    }

    const now = new Date();
    const unlockDate = new Date(unlockAtIso);
    if (unlockDate.getTime() <= now.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'unlockAt must be in the future.',
      });
    }

    const unlockDateKey = dateKeyFromIso(unlockAtIso);

    try {
      const displayName = name || email || 'Someone';

      const requestId = req.body.requestId;
      if (requestId && !/^[\da-f-]{36}$/i.test(requestId))
        return res.status(400).json({ message: 'Invalid request ID.' });
      const docRef = requestId
        ? db.collection('timeCapsules').doc(requestId)
        : db.collection('timeCapsules').doc();
      const created = await saveWithMedia(
        db,
        docRef,
        {
          fromUid: uid,
          fromName: displayName,
          toUid,
          unlockAt: unlockAtIso,
          unlockDateKey,
          title: title || '',
          message: message || '',
          photos: Array.isArray(photos) ? photos : [],
          createdAt: new Date().toISOString(),
          openedAt: null,
          opened: false,
        },
        uid,
        { create: true }
      );
      if (!created) return res.status(201).json({ success: true, id: docRef.id });

      // 🔔 Notify the other person that a capsule has been scheduled
      try {
        const deepLinkUrl = `/?view=capsules&capsuleId=${docRef.id}`;
        const unlockPretty = unlockDate.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });

        const notifTitle = '⏳ New time capsule';
        const notifBody = title
          ? `"${title}" will unlock on ${unlockPretty}`
          : `A new capsule will unlock on ${unlockPretty}`;

        await sendPushNotification(
          notifTitle,
          notifBody,
          deepLinkUrl,
          uid, // exclude creator → only partner gets it (in prod)
          {
            type: 'capsuleCreated',
            url: deepLinkUrl,
            capsuleId: docRef.id,
            unlockAt: unlockAtIso,
            unlockDateKey,
            fromUid: uid,
            fromName: displayName,
            toUid,
          }
        );
      } catch (notifyError) {
        console.warn('[timeCapsules] Failed to send "capsule created" notification:', notifyError);
      }

      return res.status(201).json({
        success: true,
        id: docRef.id,
      });
    } catch (error) {
      console.error('Error in POST /api/time-capsules:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });

  /**
   * PUT /api/time-capsules/:id
   * Edit an existing capsule (only by creator, only before unlock time).
   * Also deletes photos from Cloudinary that are removed from the photos array.
   */
  router.put('/:id', async (req, res) => {
    const { uid } = req.user || {};
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: no user in request.' });
    }

    const { id } = req.params;
    const { title, message, unlockAt: unlockAtRaw, photos } = req.body || {};

    try {
      const docRef = db.collection('timeCapsules').doc(id);
      const snap = await docRef.get();

      if (!snap.exists) {
        return res.status(404).json({ success: false, message: 'Time capsule not found.' });
      }

      const data = snap.data();

      if (data.fromUid !== uid) {
        return res
          .status(403)
          .json({ success: false, message: 'Only the creator can edit this capsule.' });
      }

      if (data.opened) {
        return res
          .status(400)
          .json({ success: false, message: 'Cannot edit a capsule that has been opened.' });
      }

      const now = new Date();
      const unlockDate = new Date(data.unlockAt);
      if (unlockDate.getTime() <= now.getTime()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot edit a capsule after its unlock time.',
        });
      }

      const updateData = {};
      if (typeof title === 'string') updateData.title = title;
      if (typeof message === 'string') updateData.message = message;

      // Handle unlockAt change
      if (unlockAtRaw) {
        const unlockAtIso = parseUnlockAt(unlockAtRaw);
        if (!unlockAtIso) {
          return res.status(400).json({
            success: false,
            message: 'Invalid unlockAt date/time format.',
          });
        }
        const newUnlockDate = new Date(unlockAtIso);
        if (newUnlockDate.getTime() <= now.getTime()) {
          return res.status(400).json({
            success: false,
            message: 'New unlockAt must be in the future.',
          });
        }
        updateData.unlockAt = unlockAtIso;
        updateData.unlockDateKey = dateKeyFromIso(unlockAtIso);
      }

      if (Array.isArray(photos)) updateData.photos = photos;
      await saveWithMedia(db, docRef, updateData, uid, { merge: true });
      await flushMediaDeletions(db, cloudinary).catch((error) =>
        console.warn('Media cleanup queued for retry:', error.message)
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in PUT /api/time-capsules/:id:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });

  /**
   * POST /api/time-capsules/:id/open
   * Mark a capsule as opened by the recipient and notify the creator.
   */
  router.post('/:id/open', async (req, res) => {
    const { uid, name, email } = req.user || {};
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: no user in request.' });
    }

    const { id } = req.params;

    try {
      const docRef = db.collection('timeCapsules').doc(id);
      const snap = await docRef.get();

      if (!snap.exists) {
        return res.status(404).json({ success: false, message: 'Time capsule not found.' });
      }

      const data = snap.data();

      // Only the intended recipient (or creator, for self-capsule) can "open"
      if (data.toUid !== uid && data.fromUid !== uid) {
        return res.status(403).json({
          success: false,
          message: 'You are not allowed to open this capsule.',
        });
      }

      // Check unlock time
      const now = new Date();
      const unlockDate = new Date(data.unlockAt);
      if (unlockDate.getTime() > now.getTime()) {
        return res.status(400).json({
          success: false,
          message: 'This capsule is not unlocked yet.',
        });
      }

      // If already opened, just return success (idempotent)
      if (!data.opened) {
        await docRef.set(
          {
            opened: true,
            openedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Notify creator that their capsule was opened.
        try {
          const openerName = name || email || 'Someone';
          const deepLinkUrl = `/?view=capsules&capsuleId=${id}`;

          const title = 'Your time capsule was opened ✨';
          const body = data.title
            ? `${openerName} just opened "${data.title}".`
            : `${openerName} just opened one of your time capsules.`;

          await sendPushNotification(
            title,
            body,
            deepLinkUrl,
            uid, // exclude the opener → notify the creator
            {
              type: 'capsuleOpened',
              url: deepLinkUrl,
              capsuleId: id,
              unlockAt: data.unlockAt || '',
              fromUid: data.fromUid || '',
              toUid: data.toUid || '',
              openedByUid: uid,
              openedByName: openerName,
              capsuleTitle: data.title || '',
            }
          );
        } catch (notifyError) {
          console.warn('Failed to send time capsule opened notification:', notifyError);
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in POST /api/time-capsules/:id/open:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });

  /**
   * DELETE /api/time-capsules/:id
   * Only the creator can delete.
   * Also deletes all Cloudinary photos referenced by this capsule.
   */
  router.delete('/:id', async (req, res) => {
    const { uid } = req.user || {};
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: no user in request.' });
    }

    const { id } = req.params;

    try {
      const docRef = db.collection('timeCapsules').doc(id);
      const snap = await docRef.get();

      if (!snap.exists) {
        return res.status(404).json({ success: false, message: 'Time capsule not found.' });
      }

      const data = snap.data();

      if (data.fromUid !== uid) {
        return res
          .status(403)
          .json({ success: false, message: 'Only the creator can delete this capsule.' });
      }

      await deleteDocumentWithMedia(db, docRef);
      await flushMediaDeletions(db, cloudinary).catch((error) =>
        console.warn('Media cleanup queued for retry:', error.message)
      );

      return res.status(200).json({ success: true, message: 'Time capsule deleted.' });
    } catch (error) {
      console.error('Error in DELETE /api/time-capsules/:id:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });

  return router;
}
