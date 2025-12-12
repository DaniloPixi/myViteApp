import express from 'express';

// This function will set up the routes and return a router.
// We'll pass in 'db', 'cloudinary', 'extractPublicId' and 'sendPushNotification' from api.mjs
export default function (db, cloudinary, extractPublicId, sendPushNotification) {
  const router = express.Router();

  // Helper to robustly get photos from a memo, supporting both old and new data structures.
  const getMemoPhotos = (memo) => {
    if (memo.photos && Array.isArray(memo.photos)) {
      return memo.photos; // New format: [{ url, isAdult }]
    }
    if (memo.photoUrls && Array.isArray(memo.photoUrls)) {
      // Old format: [url1, url2]
      const isAdult = memo.hashtags && memo.hashtags.includes('#18+');
      return memo.photoUrls.map((url) => ({ url, isAdult }));
    }
    return [];
  };

  const getDescriptionSnippet = (description) => {
    if (!description) return '';
    const trimmed = description.trim();
    if (trimmed.length <= 80) return trimmed;
    return trimmed.slice(0, 80) + '…';
  };

  router.get('/', async (req, res) => {
    try {
      const memosSnapshot = await db
        .collection('memos')
        .orderBy('createdAt', 'desc')
        .get();
      const memos = memosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(memos);
    } catch (error) {
      console.error('Error in GET /api/memos:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  router.post('/', async (req, res) => {
    const { description, date, location, hashtags, photos } = req.body;
    const { uid, name, email } = req.user;

    try {
      const createdBy = name || email || 'Someone';

      const memoData = {
        description,
        date,
        location,
        hashtags,
        photos: photos || [],
        creatorUid: uid,
        createdBy,
        createdAt: new Date().toISOString(),
      };

      const newMemoRef = await db.collection('memos').add(memoData);

      const snippet = getDescriptionSnippet(description);
      const viewUrl = `/?view=memos&memoId=${newMemoRef.id}`;

      const notifTitle = `📝 New moment from ${createdBy}`;
      const notifBody = snippet
        ? `“${snippet}”`
        : 'A new moment was saved for you.';

      await sendPushNotification(
        notifTitle,
        notifBody,
        viewUrl,
        uid, // exclude sender
        {
          type: 'memoCreated',
          url: viewUrl,
          memoId: newMemoRef.id,
          createdBy,
          description: snippet,
          location: location || '',
        }
      );

      res.status(201).json({ success: true, memoId: newMemoRef.id });
    } catch (error) {
      console.error('Error in POST /api/memos:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  router.put('/:memoId', async (req, res) => {
    const { memoId } = req.params;
    const { uid } = req.user;
    const { description, date, location, hashtags, photos } = req.body;

    try {
      const memoRef = db.collection('memos').doc(memoId);
      const doc = await memoRef.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Memo not found.' });
      }

      const originalPhotoUrls = getMemoPhotos(doc.data()).map((p) => p.url);
      const newPhotoUrls = photos ? photos.map((p) => p.url) : [];
      const photosToDelete = originalPhotoUrls.filter((url) => !newPhotoUrls.includes(url));

      if (photosToDelete.length > 0 && cloudinary.config().api_key) {
        const publicIdsToDelete = photosToDelete.map(extractPublicId).filter((id) => id);
        if (publicIdsToDelete.length > 0) {
          console.log(`Deleting ${publicIdsToDelete.length} photos from Cloudinary...`);
          await cloudinary.api.delete_resources(publicIdsToDelete);
        }
      }

      const updateData = { description, date, location, hashtags, photos };
      await memoRef.set(updateData, { merge: true });

      const snippet = getDescriptionSnippet(description);
      const viewUrl = `/?view=memos&memoId=${memoId}`;

      const notifTitle = '✏️ Moment updated';
      const notifBody = snippet
        ? `“${snippet}”`
        : 'One of your moments was updated.';

      await sendPushNotification(
        notifTitle,
        notifBody,
        viewUrl,
        uid, // exclude sender
        {
          type: 'memoUpdated',
          url: viewUrl,
          memoId,
          description: snippet,
          location: location || '',
        }
      );

      res.status(200).json({ success: true, message: 'Memo updated successfully.' });
    } catch (error) {
      console.error('Error in /api/memos PUT:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error.', details: error.message });
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

      const photoUrlsToDelete = getMemoPhotos(memoData).map((p) => p.url);
      if (photoUrlsToDelete.length > 0 && cloudinary.config().api_key) {
        const publicIdsToDelete = photoUrlsToDelete.map(extractPublicId).filter((id) => id);
        if (publicIdsToDelete.length > 0) {
          console.log(`Deleting ${publicIdsToDelete.length} photos from Cloudinary...`);
          await cloudinary.api.delete_resources(publicIdsToDelete);
        }
      }

      await memoRef.delete();

      const snippet = getDescriptionSnippet(description);
      const viewUrl = `/?view=memos&memoId=${memoId}`;

      const notifTitle = '🗑️ Moment deleted';
      const notifBody = snippet
        ? `“${snippet}” was removed`
        : 'One of your moments was removed.';

      await sendPushNotification(
        notifTitle,
        notifBody,
        viewUrl,
        uid, // exclude sender
        {
          type: 'memoDeleted',
          url: viewUrl,
          memoId,
          description: snippet,
        }
      );

      res
        .status(200)
        .json({ success: true, message: 'Memo and associated photos deleted.' });
    } catch (error) {
      console.error('Error in /api/memos DELETE:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  return router;
}
