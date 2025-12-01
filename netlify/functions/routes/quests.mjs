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
      const body = `${displayName} just completed today’s quest. Yours is… not.`;
      const link = '/#/calendar';

      // ✅ NEW: check how many users have completed this date
      // Schema now: dailyQuests has docs like `${userId}_${date}`
      // with fields: { userId, date: 'YYYY-MM-DD', completed: true/false, ... }
      const snap = await db
        .collection('dailyQuests')
        .where('date', '==', date)
        .where('completed', '==', true)
        .get();

      const completedCount = snap.size;

      // In a 2-person app:
      // - 0 or 1 completed  -> still someone to side-eye ✅
      // - 2 or more         -> both done, no need to send
      const shouldSend = completedCount < 2;

      if (shouldSend) {
        await sendPushNotification(
          title,
          body,
          link,
          uid, // exclude sender
          {
            type: 'questCompleted',
            date,
            text,
            userName: displayName,
          },
        );
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
