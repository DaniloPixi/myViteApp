// netlify/functions/api.mjs  (or your current api file)

import express from 'express';
import serverless from 'serverless-http';
import { db, admin, cloudinary } from './_shared/services.mjs';
import createMediaRouter from './routes/media.mjs';
import { getMessaging } from 'firebase-admin/messaging';
import bodyParser from 'body-parser';

// Import route handlers
import createPlansRouter from './routes/plans.mjs';
import createMemosRouter from './routes/memos.mjs';
import createQuestsRouter from './routes/quests.mjs';
import createTimeCapsulesRouter from './routes/timeCapsules.mjs';

const app = express();
app.use(bodyParser.json());

// --- Middleware ---
const checkDb = (req, res, next) => {
  if (!db) {
    return res
      .status(503)
      .json({ success: false, message: 'DATABASE NOT CONNECTED. Check server logs.' });
  }
  next();
};

const authenticateToken = async (req, res, next) => {
  if (admin.apps.length === 0) {
    return res
      .status(503)
      .json({ success: false, message: 'Server config error: Firebase not initialized.' });
  }
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided.' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decodedToken.uid, name: decodedToken.name, email: decodedToken.email };
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ success: false, message: `Forbidden: Invalid token. (${error.code})` });
  }
};

// --- Helper Functions ---

/**
 * ✅ Web tokens only: send DATA-only and let the Service Worker render.
 * This prevents:
 * - double notifications
 * - Chrome bell fallback caused by auto-render paths
 *
 * IMPORTANT:
 * - Put a real monochrome transparent PNG at /badge-96.png
 * - If you update the badge, bump BADGE_VER to bust caches on Android
 */
const BADGE_VER = '2'; // bump to '2' if Android keeps showing an old cached badge/icon

async function sendPushNotification(title, body, link = '/', excludeUid, data = {}) {
  if (!db) {
    console.log('sendPushNotification: DB not available. Aborting.');
    return;
  }

  console.log(`--- Starting push notification process ---`);
  console.log(`Triggered by UID: ${excludeUid}`);
  console.log(`Notification Title: ${title}`);

  try {
    const tokensSnapshot = await db.collection('fcmTokens').get();
    if (tokensSnapshot.empty) {
      console.log('No FCM tokens found in the database.');
      return;
    }

    const allTokens = tokensSnapshot.docs.map((doc) => ({ token: doc.id, uid: doc.data().uid }));
    console.log(`Found ${allTokens.length} total tokens in DB.`);

    const isDevish =
      process.env.NETLIFY_DEV === 'true' ||
      (process.env.CONTEXT && process.env.CONTEXT !== 'production') ||
      process.env.NODE_ENV !== 'production';

    console.log(`Running in dev-ish mode: ${isDevish} (CONTEXT=${process.env.CONTEXT || 'n/a'})`);

    // In dev-ish mode: send to everyone (including yourself) so you can test easily.
    // In production: exclude the sender (if excludeUid is provided).
    const recipientTokens = isDevish
      ? allTokens.map((t) => t.token)
      : allTokens.filter((t) => t.uid !== excludeUid).map((t) => t.token);

    console.log(`Found ${recipientTokens.length} tokens to send to.`);

    if (recipientTokens.length === 0) {
      console.log('No recipient tokens after filtering. Aborting send.');
      console.log(`--- Push notification process finished ---`);
      return;
    }

    // Normalize and enrich data payload
    const baseData = {
      type: data.type || 'generic',
      url: data.url || link || '/',
      ...data,
    };

    // FCM "data" payload must be strings
    const stringifiedData = Object.fromEntries(
      Object.entries(baseData).map(([k, v]) => [String(k), String(v)])
    );

    // ✅ Force same-origin stable assets + cache busting
    const icon = stringifiedData.icon || `/icons/manifest-icon-192.png?v=${BADGE_VER}`;
    const badge = stringifiedData.badge || `/badge-96.png?v=${BADGE_VER}`;
    const url = stringifiedData.url || link || '/';

    // ✅ DATA-ONLY for web: DO NOT include any `notification` object anywhere.
    const message = {
      data: {
        ...stringifiedData,
        title: String(title),
        body: String(body),
        icon: String(icon),
        badge: String(badge),
        url: String(url),
      },

      webpush: {
        // This is fine to keep (click-through hint); SW still handles click.
        fcm_options: { link: String(url) },
        // DO NOT set webpush.notification here, or Chrome may auto-render.
      },

      tokens: recipientTokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} messages.`);

    if (response.failureCount > 0) {
      console.warn(`Failed to send ${response.failureCount} messages.`);
      const tokensToDelete = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`  - Token[${idx}]: ${recipientTokens[idx]}`, resp.error);
          const errorCode = resp.error?.errorInfo?.code;
          if (errorCode === 'messaging/registration-token-not-registered') {
            const invalidToken = recipientTokens[idx];
            console.log(`Scheduling token for deletion: ${invalidToken}`);
            tokensToDelete.push(db.collection('fcmTokens').doc(invalidToken).delete());
          }
        }
      });
      if (tokensToDelete.length > 0) {
        await Promise.all(tokensToDelete);
        console.log(`Successfully deleted ${tokensToDelete.length} invalid tokens.`);
      }
    }

    console.log(`--- Push notification process finished ---`);
  } catch (error) {
    console.error('Error during sendPushNotification function:', error);
  }
}

// --- API Endpoints ---
const apiRouter = express.Router();

// Authenticated routes
apiRouter.use(authenticateToken);
apiRouter.use(checkDb);

apiRouter.use('/media', createMediaRouter(db, cloudinary));

// Feature-specific routes
apiRouter.use('/plans', createPlansRouter(db, sendPushNotification));
apiRouter.use('/memos', createMemosRouter(db, cloudinary, sendPushNotification));
apiRouter.use('/quests', createQuestsRouter(db, sendPushNotification));
apiRouter.use('/time-capsules', createTimeCapsulesRouter(db, cloudinary, sendPushNotification));

// Standalone registration endpoint
app.post('/api/register', authenticateToken, checkDb, async (req, res) => {
  const { token } = req.body;
  const { uid } = req.user;
  if (!token) {
    return res.status(400).json({ success: false, message: 'FCM token is required.' });
  }
  try {
    await db.collection('fcmTokens').doc(token).set({ uid, createdAt: new Date() });
    res.status(200).json({ success: true, message: 'Token registered successfully.' });
  } catch (error) {
    console.error('Error in /api/register:', error);
    res
      .status(500)
      .json({ success: false, message: 'Internal server error.', details: error.message });
  }
});

app.post('/api/send-love', authenticateToken, checkDb, async (req, res) => {
  const { name } = req.user;
  const senderName = name || 'Someone';

  try {
    const url = '/';

    await sendPushNotification(`A message from ${senderName}`, 'I love you', url, null, {
      type: 'love',
      url,
    });

    res
      .status(200)
      .json({ success: true, message: '"I love you" notification sent successfully.' });
  } catch (error) {
    console.error('Error in /api/send-love:', error);
    res
      .status(500)
      .json({ success: false, message: 'Internal server error while sending notification.' });
  }
});

app.use((req, res, next) => {
  console.log('INCOMING', req.method, req.path);
  next();
});

app.use('/api', apiRouter);

export const handler = serverless(app);
