import express from 'express';

// This function will set up the routes and return a router.
// We'll pass in the 'db' and 'sendPushNotification' dependencies from api.mjs
export default function (db, sendPushNotification) {
  const router = express.Router();

  // Helper to make a short text snippet
  const getTextSnippet = (text) => {
    if (!text) return '';
    const trimmed = text.trim();
    if (trimmed.length <= 80) return trimmed;
    return trimmed.slice(0, 80) + '…';
  };

  // Helper to format date/time in a readable way for notifications
  const formatWhen = (date, time) => {
    if (!date && !time) return '';
    if (date && time) return `${date} at ${time}`;
    return date || time || '';
  };

  router.get('/', async (req, res) => {
    try {
      const plansSnapshot = await db.collection('plans').orderBy('date', 'desc').get();
      const plans = plansSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(plans);
    } catch (error) {
      console.error('Error in GET /api/plans:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { text, date, time, location, hashtags } = req.body;
      const { uid, name, email } = req.user;

      const createdBy = name || email || 'Someone';

      const planData = {
        text,
        date,
        time,
        location,
        hashtags,
        createdBy,
        creatorUid: uid,
        createdAt: new Date(),
      };

      const newPlanRef = await db.collection('plans').add(planData);

      const snippet = getTextSnippet(text);
      const when = formatWhen(date, time);

      // OS notification title/body
      const notifTitle = 'New Plan Added!';
      const notifBody = snippet
        ? `"${snippet}"${when ? ` on ${when}` : ''}`
        : when
        ? `New plan on ${when}`
        : 'A new plan was added.';

      await sendPushNotification(
        notifTitle,
        notifBody,
        '/?view=plans',
        uid, // exclude sender (use null if you want creator to get it too)
        {
          type: 'planCreated',
          url: '/?view=plans',
          planId: newPlanRef.id,
          text: snippet,
          date: date || '',
          time: time || '',
          location: location || '',
          createdBy,
        }
      );

      res.status(201).json({ success: true, planId: newPlanRef.id });
    } catch (error) {
      console.error('Error in POST /api/plans:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error.', details: error.message });
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

      const planData = doc.data();
      const { text, date, time, location } = planData;

      await planRef.delete();

      const snippet = getTextSnippet(text);
      const when = formatWhen(date, time);

      const notifTitle = 'Plan Deleted!';
      const notifBody = snippet
        ? `"${snippet}"${when ? ` on ${when}` : ''} was removed`
        : when
        ? `Plan on ${when} was removed`
        : 'A plan was removed.';

      await sendPushNotification(
        notifTitle,
        notifBody,
        '/?view=plans',
        uid, // exclude sender
        {
          type: 'planDeleted',
          url: '/?view=plans',
          planId,
          text: snippet,
          date: date || '',
          time: time || '',
          location: location || '',
        }
      );

      res.status(200).json({ success: true, message: 'Plan deleted successfully.' });
    } catch (error) {
      console.error('Error in DELETE /api/plans/:planId:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  router.put('/:planId', async (req, res) => {
    try {
      const { planId } = req.params;
      const { uid } = req.user;
      const { text, date, time, location, hashtags } = req.body;

      const updateData = {
        text,
        date,
        time,
        location,
        hashtags,
      };

      await db.collection('plans').doc(planId).update(updateData);

      const snippet = getTextSnippet(text);
      const when = formatWhen(date, time);

      const notifTitle = 'Plan Updated!';
      const notifBody = snippet
        ? `"${snippet}"${when ? ` on ${when}` : ''}`
        : when
        ? `Plan on ${when} was updated`
        : 'A plan was updated.';

      await sendPushNotification(
        notifTitle,
        notifBody,
        '/?view=plans',
        uid, // exclude sender
        {
          type: 'planUpdated',
          url: '/?view=plans',
          planId,
          text: snippet,
          date: date || '',
          time: time || '',
          location: location || '',
        }
      );

      res.status(200).json({ success: true, message: 'Plan updated successfully.' });
    } catch (error) {
      console.error('Error in PUT /api/plans/:planId:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error.', details: error.message });
    }
  });

  return router;
}
