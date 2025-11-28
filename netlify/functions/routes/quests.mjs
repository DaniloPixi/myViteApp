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

      const title = 'Daily Quest completed ✨';
      const body = `${displayName} completed today\'s quest: "${text}"`;

      // where the app should open when the notification is tapped
      const link = '/#/calendar';

      await sendPushNotification(title, body, link, uid);

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
