import express from 'express';
import serverless from 'serverless-http';
import admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

import createPlansRouter from './routes/plans.mjs';
import createMemosRouter from './routes/memos.mjs';
import createQuestsRouter from './routes/quests.mjs';
import createTimeCapsulesRouter from './routes/timeCapsules.mjs';

let db;

const getRuntimeEnv = () => {
  if (process.env.APP_ENV) return String(process.env.APP_ENV);
  if (process.env.CONTEXT === 'production') return 'production';
  return 'staging';
};

const APP_ENV = getRuntimeEnv();
const IS_PRODUCTION_ENV = APP_ENV === 'production';
const IS_TEST_MODE = String(process.env.TEST_MODE || 'false') === 'true';
const ALLOW_PUSH_IN_NON_PROD =
  String(process.env.ALLOW_PUSH_IN_NON_PROD || 'false') === 'true';

try {
  if (admin.apps.length === 0) {
    let serviceAccount;
    if (process.env.FIREBASE_PROJECT_ID) {
      serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      };
      console.log(`[api] Firebase Admin initialized from env vars (APP_ENV=${APP_ENV}).`);
    } else {
      const keyPath = path.join(process.cwd(), 'netlify', 'functions', 'serviceAccountKey.json');
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      console.log(`[api] Firebase Admin initialized from local service account (APP_ENV=${APP_ENV}).`);
    }

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
  } else {
    db = admin.firestore();
  }

  console.log('✅ Firebase Admin Initialized SUCCESSFULLY.');
} catch (error) {
  db = null;
  console.error('❌ CRITICAL: FIREBASE ADMIN SDK INITIALIZATION FAILED.', error);
}

try {
  let cloudinaryConfig = {};

  if (process.env.CLOUDINARY_API_KEY) {
    cloudinaryConfig = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dknmcj1qj',
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    };
  } else {
    const credsPath = path.join(process.cwd(), 'netlify', 'functions', 'cloudinaryCreds.json');
    if (fs.existsSync(credsPath)) {
      const { api_key, api_secret, cloud_name } = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      cloudinaryConfig = {
        cloud_name: cloud_name || 'dknmcj1qj',
        api_key,
        api_secret,
      };
    } else {
      console.warn('Cloudinary credentials not found for local development. Deletion will be skipped.');
    }
  }

  if (cloudinaryConfig.api_key) {
    cloudinary.config(cloudinaryConfig);
    console.log('✅ Cloudinary Initialized SUCCESSFULLY.');
  }
} catch (error) {
  console.error('❌ CRITICAL: CLOUDINARY INITIALIZATION FAILED.', error);
}

const app = express();
app.use(bodyParser.json());

const checkDb = (req, res, next) => {
  if (!db) {
    return res.status(503).json({ success: false, message: 'DATABASE NOT CONNECTED. Check server logs.' });
  }
  next();
};

const authenticateToken = async (req, res, next) => {
  if (admin.apps.length === 0) {
    return res.status(503).json({ success: false, message: 'Server config error: Firebase not initialized.' });
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
    return res.status(403).json({ success: false, message: `Forbidden: Invalid token. (${error.code})` });
  }
};

const extractPublicId = (url) => {
  const regex = /upload\/(?:v\d+\/)?([\w\/\-]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    const pathWithExtension = match[1];
    const lastDotIndex = pathWithExtension.lastIndexOf('.');
    if (lastDotIndex > -1) {
      return pathWithExtension.substring(0, lastDotIndex);
    }
    return pathWithExtension;
  }
  return null;
};

const BADGE_VER = '2';

async function sendPushNotification(title, body, link = '/', excludeUid, data = {}) {
  if (!db) {
    console.log('sendPushNotification: DB not available. Aborting.');
    return;
  }

  if (IS_TEST_MODE) {
    console.log('[push] TEST_MODE=true: skipping sendPushNotification side effects.');
    return;
  }

  if (!IS_PRODUCTION_ENV && !ALLOW_PUSH_IN_NON_PROD) {
    console.log('[push] Non-production push blocked. Set ALLOW_PUSH_IN_NON_PROD=true to enable.');
    return;
  }

  try {
    const tokensSnapshot = await db.collection('fcmTokens').get();
    if (tokensSnapshot.empty) {
      console.log('No FCM tokens found in the database.');
      return;
    }

    const allTokens = tokensSnapshot.docs.map((doc) => {
      const tokenData = doc.data() || {};
      return {
        token: doc.id,
        uid: tokenData.uid || null,
        appEnv: tokenData.appEnv || 'production',
      };
    });

    const envFiltered = allTokens.filter((t) => t.appEnv === APP_ENV);
    const recipientTokens = envFiltered
      .filter((t) => !IS_PRODUCTION_ENV || t.uid !== excludeUid)
      .map((t) => t.token);

    if (recipientTokens.length === 0) {
      console.log(`[push] No recipients after APP_ENV filter (${APP_ENV}).`);
      return;
    }

    const baseData = {
      type: data.type || 'generic',
      url: data.url || link || '/',
      appEnv: data.appEnv || APP_ENV,
      ...data,
    };

    const stringifiedData = Object.fromEntries(
      Object.entries(baseData).map(([k, v]) => [String(k), String(v)])
    );

    const icon = stringifiedData.icon || `/icons/manifest-icon-192.png?v=${BADGE_VER}`;
    const badge = stringifiedData.badge || `/badge-96.png?v=${BADGE_VER}`;
    const url = stringifiedData.url || link || '/';

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
        fcm_options: { link: String(url) },
      },
      tokens: recipientTokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`[push] Successfully sent ${response.successCount} messages (APP_ENV=${APP_ENV}).`);

    if (response.failureCount > 0) {
      console.warn(`[push] Failed to send ${response.failureCount} messages.`);
      const tokensToDelete = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`  - Token[${idx}]: ${recipientTokens[idx]}`, resp.error);
          const errorCode = resp.error?.errorInfo?.code;
          if (errorCode === 'messaging/registration-token-not-registered') {
            tokensToDelete.push(db.collection('fcmTokens').doc(recipientTokens[idx]).delete());
          }
        }
      });

      if (tokensToDelete.length > 0) {
        await Promise.all(tokensToDelete);
        console.log(`[push] Deleted ${tokensToDelete.length} invalid tokens.`);
      }
    }
  } catch (error) {
    console.error('Error during sendPushNotification function:', error);
  }
}

const apiRouter = express.Router();
apiRouter.use(authenticateToken);
apiRouter.use(checkDb);

apiRouter.use('/plans', createPlansRouter(db, sendPushNotification));
apiRouter.use('/memos', createMemosRouter(db, cloudinary, extractPublicId, sendPushNotification));
apiRouter.use('/quests', createQuestsRouter(db, sendPushNotification));
apiRouter.use('/time-capsules', createTimeCapsulesRouter(db, cloudinary, extractPublicId, sendPushNotification));

app.post('/api/register', authenticateToken, checkDb, async (req, res) => {
  const { token, appEnv } = req.body;
  const { uid } = req.user;

  if (!token) {
    return res.status(400).json({ success: false, message: 'FCM token is required.' });
  }

  const normalizedEnv = typeof appEnv === 'string' && appEnv ? appEnv : APP_ENV;

  try {
    await db.collection('fcmTokens').doc(token).set({
      uid,
      appEnv: normalizedEnv,
      createdAt: new Date(),
    });
    res.status(200).json({ success: true, message: 'Token registered successfully.' });
  } catch (error) {
    console.error('Error in /api/register:', error);
    res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
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
      appEnv: APP_ENV,
    });

    res.status(200).json({ success: true, message: '"I love you" notification sent successfully.' });
  } catch (error) {
    console.error('Error in /api/send-love:', error);
    res.status(500).json({ success: false, message: 'Internal server error while sending notification.' });
  }
});

app.use((req, res, next) => {
  console.log('INCOMING', req.method, req.path);
  next();
});

app.use('/api', apiRouter);

export const handler = serverless(app);
export { extractPublicId };
