import express from 'express';

// db is injected but we don't have to use it yet;
// sendPushNotification is the important part
export default function (db, sendPushNotification) {
  const router = express.Router();

  // Notify when a daily quest is completed
  router.post('/notify-completed', async (req, res) => {
    const { date, text } = req.body || {};
    const { uid, name, email } = req.user || {};

    if (!uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
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
      const body = `${displayName} completed today's quest: "${text}"`;

      // Link can be wherever you want them to land
      const url = '/#/calendar';

      await sendPushNotification(title, body, url, uid);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in POST /api/quests/notify-completed:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
        details: error.message,
      });
    }
  });

  return router;
}
