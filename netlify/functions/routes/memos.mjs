// netlify/functions/routes/memos.mjs
import express from 'express';
import { saveWithMedia, deleteDocumentWithMedia, flushMediaDeletions } from '../_shared/media.mjs';

// This function will set up the routes and return a router.
// Dependencies are shared with the API runtime.
export default function (db, cloudinary, sendPushNotification) {
  const router = express.Router();

  const getDescriptionSnippet = (description) => {
    if (!description) return '';
    const trimmed = description.trim();
    if (trimmed.length <= 80) return trimmed;
    return trimmed.slice(0, 80) + '…';
  };

  router.get('/', async (req, res) => {
    try {
      const memosSnapshot = await db.collection('memos').orderBy('createdAt', 'desc').get();
      const memos = memosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(memos);
    } catch (error) {
      console.error('Error in GET /api/memos:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });

  router.post('/', async (req, res) => {
    const { description, date, location, locationCoords, hashtags, photos } = req.body;
    const { uid, name, email } = req.user;

    try {
      const createdBy = name || email || 'Someone';

      const memoData = {
        description,
        date,
        location,
        locationCoords: locationCoords || null,
        hashtags,
        photos: photos || [],
        creatorUid: uid,
        createdBy,
        createdAt: new Date().toISOString(),
      };

      const requestId = req.body.requestId;
      if (requestId && !/^[\da-f-]{36}$/i.test(requestId))
        return res.status(400).json({ message: 'Invalid request ID.' });
      const newMemoRef = requestId
        ? db.collection('memos').doc(requestId)
        : db.collection('memos').doc();
      const created = await saveWithMedia(db, newMemoRef, memoData, uid, { create: true });
      if (!created) return res.status(201).json({ success: true, memoId: newMemoRef.id });

      const snippet = getDescriptionSnippet(description);
      const viewUrl = `/?view=memos&memoId=${newMemoRef.id}`;

      const notifTitle = `📝 New moment from ${createdBy}`;
      const notifBody = snippet ? `“${snippet}”` : 'A new moment was saved for you.';

      await sendPushNotification(notifTitle, notifBody, viewUrl, uid, {
        type: 'memoCreated',
        url: viewUrl,
        memoId: newMemoRef.id,
        createdBy,
        description: snippet,
        location: location || '',

        // Optional overrides (leave commented unless you create these assets):
        // icon: '/icons/manifest-icon-192.png',
        // badge: '/badge-96.png',
      }).catch((error) => console.warn('Notification failed after save:', error.message));

      res.status(201).json({ success: true, memoId: newMemoRef.id });
    } catch (error) {
      console.error('Error in POST /api/memos:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });

  router.put('/:memoId', async (req, res) => {
    const { memoId } = req.params;
    const { uid } = req.user;
    const { description, date, location, locationCoords, hashtags, photos } = req.body;

    try {
      const memoRef = db.collection('memos').doc(memoId);
      const doc = await memoRef.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Memo not found.' });
      }

      const updateData = {
        description,
        date,
        location,
        locationCoords: locationCoords || null,
        hashtags,
        photos,
      };
      await saveWithMedia(db, memoRef, updateData, uid, { merge: true });
      await flushMediaDeletions(db, cloudinary).catch((error) =>
        console.warn('Media cleanup queued for retry:', error.message)
      );

      const snippet = getDescriptionSnippet(description);
      const viewUrl = `/?view=memos&memoId=${memoId}`;

      const notifTitle = '✏️ Moment updated';
      const notifBody = snippet ? `“${snippet}”` : 'One of your moments was updated.';

      await sendPushNotification(notifTitle, notifBody, viewUrl, uid, {
        type: 'memoUpdated',
        url: viewUrl,
        memoId,
        description: snippet,
        location: location || '',

        // Optional overrides:
        // icon: '/icons/manifest-icon-192.png',
        // badge: '/badge-96.png',
      }).catch((error) => console.warn('Notification failed after save:', error.message));

      res.status(200).json({ success: true, message: 'Memo updated successfully.' });
    } catch (error) {
      console.error('Error in /api/memos PUT:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });

  router.delete('/:memoId', async (req, res) => {
    const { memoId } = req.params;
    const { uid } = req.user;

    try {
      const memoRef = db.collection('memos').doc(memoId);
      const doc = await memoRef.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Memo not found.' });
      }

      const memoData = doc.data();
      const description = memoData.description || '';

      await deleteDocumentWithMedia(db, memoRef);
      await flushMediaDeletions(db, cloudinary).catch((error) =>
        console.warn('Media cleanup queued for retry:', error.message)
      );

      const snippet = getDescriptionSnippet(description);
      const viewUrl = `/?view=memos&memoId=${memoId}`;

      const notifTitle = '🗑️ Moment deleted';
      const notifBody = snippet ? `“${snippet}” was removed` : 'One of your moments was removed.';

      await sendPushNotification(notifTitle, notifBody, viewUrl, uid, {
        type: 'memoDeleted',
        url: viewUrl,
        memoId,
        description: snippet,

        // Optional overrides:
        // icon: '/icons/manifest-icon-192.png',
        // badge: '/badge-96.png',
      }).catch((error) => console.warn('Notification failed after save:', error.message));

      res.status(200).json({ success: true, message: 'Memo and associated photos deleted.' });
    } catch (error) {
      console.error('Error in /api/memos DELETE:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });

  return router;
}
