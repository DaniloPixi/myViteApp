// netlify/functions/routes/quests.mjs
import express from 'express';

export default function createQuestsRouter(db, sendPushNotification) {
  const router = express.Router();

  // POST /api/quests
  router.post('/', async (req, res) => {
    const { date, text } = req.body || {};
    const { uid, name, email } = req.user || {};

    if (!uid) {
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized: no user in request.' });
    }

    if (!date || !text) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: date and text',
      });
    }

    try {
      const displayName = name || email || 'Your partner';
      const title = 'Quest not finished 👀';
      const body = `${displayName} just completed today\'s quest. Yours is… not.`;
      const link = '/#/calendar';

      // 🔍 Check completions from Firestore (admin db, not client)
      const questRef = db.collection('dailyQuests').doc(date); // date is already "YYYY-MM-DD"
      const questSnap = await questRef.get();

      let shouldSend = true;

      if (questSnap.exists) {
        const data = questSnap.data();
        const completions = data.completions || {};
        const completedUids = Object.keys(completions).filter(
          (id) => completions[id],
        );

        // In a 2-person app: if 2+ people have completed, both are done -> no need to side-eye anyone
        if (completedUids.length >= 2) {
          shouldSend = false;
        }
      }

      if (shouldSend) {
        await sendPushNotification(title, body, link, uid);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in POST /api/quests:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });


  return router;
}
