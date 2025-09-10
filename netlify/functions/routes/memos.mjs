
import express from 'express';

// This function will set up the routes and return a router.
// We'll pass in 'db', 'cloudinary', 'extractPublicId' and 'sendPushNotification' from api.mjs
export default function(db, cloudinary, extractPublicId, sendPushNotification) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
        const memosSnapshot = await db.collection('memos').orderBy('createdAt', 'desc').get();
        const memos = memosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(memos);
    } catch (error) {
        console.error('Error in GET /api/memos:', error);
        res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  router.post('/', async (req, res) => {
    const { description, date, location, hashtags, photoUrls } = req.body;
    const { uid, name, email } = req.user;
    try {
      const newMemoRef = await db.collection('memos').add({
        description, date, location, hashtags, photoUrls,
        creatorUid: uid, createdBy: name || email, createdAt: new Date().toISOString(),
      });
      await sendPushNotification('New Memo Added!', `\"${description}\"`, '/#/memos', uid);
      res.status(201).json({ success: true, memoId: newMemoRef.id });
    } catch (error) {
      console.error('Error in POST /api/memos:', error);
      res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  router.put('/:memoId', async (req, res) => {
    const { memoId } = req.params;
    const { uid } = req.user;
    const { description, date, location, hashtags, photoUrls } = req.body;
    try {
        const memoRef = db.collection('memos').doc(memoId);
        const doc = await memoRef.get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Memo not found.' });
        }

        const originalPhotoUrls = doc.data().photoUrls || [];
        const newPhotoUrls = photoUrls || [];
        const photosToDelete = originalPhotoUrls.filter(url => !newPhotoUrls.includes(url));

        if (photosToDelete.length > 0 && cloudinary.config().api_key) {
            const publicIdsToDelete = photosToDelete.map(extractPublicId).filter(id => id);
            if (publicIdsToDelete.length > 0) {
                console.log(`Deleting ${publicIdsToDelete.length} photos from Cloudinary...`);
                await cloudinary.api.delete_resources(publicIdsToDelete);
            }
        }

        const updateData = { description, date, location, hashtags, photoUrls };
        await memoRef.update(updateData);
        await sendPushNotification('Memo Updated!', `\"${description}\"`, '/#/memos', uid);
        res.status(200).json({ success: true, message: 'Memo updated successfully.' });
    } catch (error) {
        console.error('Error in /api/memos PUT:', error);
        res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
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
        const { description } = doc.data();

        const photosToDelete = doc.data().photoUrls || [];
        if (photosToDelete.length > 0 && cloudinary.config().api_key) {
            const publicIdsToDelete = photosToDelete.map(extractPublicId).filter(id => id);
            if (publicIdsToDelete.length > 0) {
                console.log(`Deleting ${publicIdsToDelete.length} photos from Cloudinary...`);
                await cloudinary.api.delete_resources(publicIdsToDelete);
            }
        }

        await memoRef.delete();
        await sendPushNotification('Memo Deleted!', `\"${description}\" was removed`, '/#/memos', uid);
        res.status(200).json({ success: true, message: 'Memo and associated photos deleted.' });
    } catch (error) {
        console.error('Error in /api/memos DELETE:', error);
        res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  return router;
}
