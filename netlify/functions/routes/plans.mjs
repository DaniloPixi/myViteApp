
import express from 'express';

// This function will set up the routes and return a router.
// We'll pass in the 'db' and 'sendPushNotification' dependencies from api.mjs
export default function(db, sendPushNotification) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const plansSnapshot = await db.collection('plans').orderBy('date', 'desc').get();
      const plans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(plans);
    } catch (error) {
      console.error('Error in GET /api/plans:', error);
      res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { text, date, time, location, hashtags } = req.body;
      const { uid, name, email } = req.user;
      const newPlanRef = await db.collection('plans').add({
        text,
        date,
        time,
        location,
        hashtags,
        createdBy: name || email,
        creatorUid: uid,
        createdAt: new Date(),
      });
      await sendPushNotification('New Plan Added!', `\"${text}\" on ${date}`, '/#/plans', uid);
      res.status(201).json({ success: true, planId: newPlanRef.id });
    } catch (error) {
      console.error('Error in POST /api/plans:', error);
      res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  router.delete('/:planId', async (req, res) => {
    try {
      const { planId } = req.params;
      const { uid } = req.user;
      const planRef = db.collection('plans').doc(planId);
      const doc = await planRef.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Plan not found.' });
      }
      const { text, date } = doc.data();

      await planRef.delete();

      await sendPushNotification('Plan Deleted!', `\"${text}\" on ${date} was removed`, '/#/plans', uid);

      res.status(200).json({ success: true, message: 'Plan deleted successfully.' });
    } catch (error) {
      console.error('Error in DELETE /api/plans/:planId:', error);
      res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  router.put('/:planId', async (req, res) => {
    try {
      const { planId } = req.params;
      const { uid } = req.user;
      const { text, date, time, location, hashtags } = req.body;
      await db.collection('plans').doc(planId).update({
        text,
        date,
        time,
        location,
        hashtags
      });
      await sendPushNotification('Plan Updated!', `\"${text}\" on ${date}`, '/#/plans', uid);
      res.status(200).json({ success: true, message: 'Plan updated successfully.' });
    } catch (error) {
      console.error('Error in PUT /api/plans/:planId:', error);
      res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  return router;
}
