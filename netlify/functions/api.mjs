import express from 'express';
import serverless from 'serverless-http';
import admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';

let db;

// --- Dual-Environment Firebase Initialization ---
try {
  if (admin.apps.length === 0) {
    let serviceAccount;

    // PRODUCTION/DEPLOYMENT: Use environment variables set in Netlify UI.
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
      // LOCAL DEVELOPMENT: Use the local service account key file.
      console.log("Initializing Firebase Admin with local serviceAccountKey.json (Local Mode).");
      const keyPath = path.join(process.cwd(), 'netlify', 'functions', 'serviceAccountKey.json');
      const serviceAccountJson = fs.readFileSync(keyPath, 'utf8');
      serviceAccount = JSON.parse(serviceAccountJson);
    }

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    console.log("✅ ✅ ✅ Firebase Admin Initialized SUCCESSFULLY. ✅ ✅ ✅");

  } else {
    db = admin.firestore();
    console.log("Firebase Admin was already initialized.");
  }
} catch (error) {
  db = null;
  console.error("❌ ❌ ❌ CRITICAL: FIREBASE ADMIN SDK INITIALIZATION FAILED. ❌ ❌ ❌");
  console.error("Error details:", error.message);
  console.error("Full error object:", error);
}

const app = express();
app.use(bodyParser.json());

const checkDb = (req, res, next) => {
  if (!db) {
    return res.status(503).json({ success: false, message: "DATABASE NOT CONNECTED. Check server logs for Firebase initialization errors." });
  }
  next();
};

const authenticateToken = async (req, res, next) => {
  if (admin.apps.length === 0) {
    console.error("Firebase Admin SDK is not initialized. Cannot authenticate token.");
    return res.status(503).json({
        success: false,
        message: 'Server configuration error: Firebase not initialized. Check server logs for details.'
    });
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
    console.error('Token verification failed:', error.code);
    return res.status(403).json({ success: false, message: `Forbidden: Invalid or expired token. (${error.code})` });
  }
};

// --- Reusable Push Notification Function ---
async function sendPushNotification(title, body) {
  if (!db) {
    console.error("Cannot send push notification because database is not connected.");
    return;
  }
  try {
    const tokensSnapshot = await db.collection('pushTokens').get();
    const tokens = tokensSnapshot.docs.map(doc => doc.id);

    if (tokens.length > 0) {
      const message = {
        notification: { title, body },
        tokens: tokens,
      };

      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`Push notifications sent: ${response.successCount} success, ${response.failureCount} failure.`);

      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            const failedToken = tokens[idx];
            console.error('Failure sending notification to', failedToken, error.code);
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
              invalidTokens.push(db.collection('pushTokens').doc(failedToken).delete());
            }
          }
        });
        await Promise.all(invalidTokens);
        console.log(`Deleted ${invalidTokens.length} invalid tokens.`);
      }
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}


// --- API Endpoints ---

app.post('/api/register', authenticateToken, checkDb, async (req, res) => {
  const { token } = req.body;
  const { uid } = req.user;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Push notification token is required.' });
  }

  try {
    const tokenRef = db.collection('pushTokens').doc(token);
    await tokenRef.set({ uid: uid, createdAt: new Date().toISOString() });
    console.log(`Successfully stored push token for user: ${uid}`);
    res.status(200).json({ success: true, message: 'Token registered successfully.' });
  } catch (error) {
    console.error('Error in /api/register POST:', error);
    res.status(500).json({ success: false, message: 'Internal server error while registering token.' });
  }
});

app.get('/api/plans', authenticateToken, checkDb, async (req, res) => {
    try {
        const plansSnapshot = await db.collection('plans').orderBy('createdAt', 'desc').get();
        const plans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(plans);
    } catch (error) {
        console.error('Error in /api/plans GET:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

app.post('/api/plans', authenticateToken, checkDb, async (req, res) => {
  const { text, date, location, time, hashtags } = req.body;
  const { uid, name, email } = req.user;
  try {
    const newPlanRef = await db.collection('plans').add({
      text,
      date,
      location,
      time: time || '',
      hashtags: hashtags || [],
      creatorUid: uid,
      createdBy: name || email,
      createdAt: new Date().toISOString(),
    });

    // Use the reusable notification function
    await sendPushNotification(
      `New Plan: ${text.substring(0, 30)}...`,
      `By ${name || email} on ${date}`
    );

    res.status(201).json({ success: true, planId: newPlanRef.id });
  } catch (error) {
    console.error('Error in /api/plans POST:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

app.delete('/api/plans/:planId', authenticateToken, checkDb, async (req, res) => {
    const { planId } = req.params;
    try {
        const planRef = db.collection('plans').doc(planId);
        const doc = await planRef.get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Plan not found.' });
        }
        await planRef.delete();
        res.status(200).json({ success: true, message: 'Plan deleted successfully.' });
    } catch (error) {
        console.error('Error in /api/plans DELETE:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

app.put('/api/plans/:planId', authenticateToken, checkDb, async (req, res) => {
    const { planId } = req.params;
    const { text, date, location, time, hashtags } = req.body;
    try {
        const planRef = db.collection('plans').doc(planId);
        const doc = await planRef.get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Plan not found.' });
        }

        const originalPlan = doc.data();
        const updateData = {};
        if (text !== undefined) updateData.text = text;
        if (date !== undefined) updateData.date = date;
        if (location !== undefined) updateData.location = location;
        if (time !== undefined) updateData.time = time;
        if (hashtags !== undefined) updateData.hashtags = hashtags;
        
        await planRef.update(updateData);

        // Use the reusable notification function
        const planTitle = updateData.text || originalPlan.text;
        await sendPushNotification(
          `Plan Updated: ${planTitle.substring(0, 30)}...`,
          `${originalPlan.createdBy} just updated a plan.`
        );

        res.status(200).json({ success: true, message: 'Plan updated successfully.' });
    } catch (error) {
        console.error('Error in /api/plans PUT:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

export const handler = serverless(app);
