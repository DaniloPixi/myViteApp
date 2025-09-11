
import express from 'express';
import serverless from 'serverless-http';
import admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

// Import route handlers
import createPlansRouter from './routes/plans.mjs';
import createMemosRouter from './routes/memos.mjs';

let db;

// --- Dual-Environment Firebase Initialization ---
try {
  if (admin.apps.length === 0) {
    let serviceAccount;
    if (process.env.FIREBASE_PROJECT_ID) {
      console.log("Initializing Firebase Admin with environment variables (Production Mode).");
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
      };
    } else {
      console.log("Initializing Firebase Admin with local serviceAccountKey.json (Local Mode).");
      const keyPath = path.join(process.cwd(), 'netlify', 'functions', 'serviceAccountKey.json');
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    console.log("✅ Firebase Admin Initialized SUCCESSFULLY.");
  } else {
    db = admin.firestore();
  }
} catch (error) {
  db = null;
  console.error("❌ CRITICAL: FIREBASE ADMIN SDK INITIALIZATION FAILED.", error);
}

// --- Dual-Environment Cloudinary Initialization ---
try {
  let cloudinaryConfig = {};
  if (process.env.CLOUDINARY_API_KEY) {
      console.log("Initializing Cloudinary with environment variables (Production Mode).");
      cloudinaryConfig = {
          cloud_name: 'dknmcj1qj',
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
      };
  } else {
      console.log("Initializing Cloudinary with local cloudinaryCreds.json (Local Mode).");
      const credsPath = path.join(process.cwd(), 'netlify', 'functions', 'cloudinaryCreds.json');
      if (fs.existsSync(credsPath)) {
          const { api_key, api_secret } = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
          cloudinaryConfig = { cloud_name: 'dknmcj1qj', api_key, api_secret };
      } else {
          console.warn("Cloudinary credentials not found for local development. Deletion will be skipped.");
      }
  }
  if (cloudinaryConfig.api_key) {
    cloudinary.config(cloudinaryConfig);
    console.log("✅ Cloudinary Initialized SUCCESSFULLY.");
  }
} catch (error) {
  console.error("❌ CRITICAL: CLOUDINARY INITIALIZATION FAILED.", error);
}

const app = express();
app.use(bodyParser.json());

// --- Middleware ---
const checkDb = (req, res, next) => {
  if (!db) {
    return res.status(503).json({ success: false, message: "DATABASE NOT CONNECTED. Check server logs." });
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

// --- Helper Functions ---
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

async function sendPushNotification(title, body, link, excludeUid) {
    if (!db) {
        console.log("sendPushNotification: DB not available. Aborting.");
        return;
    }
    console.log(`--- Starting push notification process ---`);
    console.log(`Triggered by UID: ${excludeUid}`);
    console.log(`Notification Title: ${title}`);

    try {
        const tokensSnapshot = await db.collection('fcmTokens').get();
        if (tokensSnapshot.empty) {
            console.log("No FCM tokens found in the database.");
            return;
        }

        const allTokens = tokensSnapshot.docs.map(doc => ({ token: doc.id, uid: doc.data().uid }));
        console.log(`Found ${allTokens.length} total tokens in DB.`);

        const isLocalEnv = !process.env.FIREBASE_PROJECT_ID;
        console.log(`Running in local environment: ${isLocalEnv}`);

        const recipientTokens = isLocalEnv
            ? allTokens.map(t => t.token)
            : allTokens
                .filter(t => t.uid !== excludeUid)
                .map(t => t.token);
        
        console.log(`Found ${recipientTokens.length} tokens to send to.`);

        if (recipientTokens.length === 0) {
            console.log("No recipient tokens after filtering. Aborting send.");
            console.log(`--- Push notification process finished ---`);
            return;
        }

        const message = {
            data: {
                title,
                body,
                url: link
            },
            webpush: {
                headers: {
                    'Urgency': 'high'
                },
                fcm_options: {
                    link
                },
            },
            android: {
                priority: 'high',
            },
            apns: {
                headers: {
                    'apns-push-type': 'alert',
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
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

// Non-authenticated or general routes can go here

// Authenticated routes
apiRouter.use(authenticateToken);
apiRouter.use(checkDb);

// Feature-specific routes
apiRouter.use('/plans', createPlansRouter(db, sendPushNotification));
apiRouter.use('/memos', createMemosRouter(db, cloudinary, extractPublicId, sendPushNotification));

app.use('/api', apiRouter);

// Standalone registration endpoint (can be kept here or moved)
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
    res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
  }
});

export const handler = serverless(app);
