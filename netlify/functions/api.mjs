
import express from 'express';
import serverless from 'serverless-http';
import admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

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
            data: { title, body, link }, // Changed from 'notification' to 'data'
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

app.get('/api/plans', authenticateToken, checkDb, async (req, res) => {
  try {
    const plansSnapshot = await db.collection('plans').orderBy('date', 'desc').get();
    const plans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(plans);
  } catch (error) {
    console.error('Error in GET /api/plans:', error);
    res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
  }
});

app.post('/api/plans', authenticateToken, checkDb, async (req, res) => {
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
    await sendPushNotification('New Plan Added!', `"${text}" on ${date}`, '/#/plans', uid);
    res.status(201).json({ success: true, planId: newPlanRef.id });
  } catch (error) {
    console.error('Error in POST /api/plans:', error);
    res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
  }
});

app.delete('/api/plans/:planId', authenticateToken, checkDb, async (req, res) => {
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

    await sendPushNotification('Plan Deleted!', `"${text}" on ${date} was removed`, '/#/plans', uid);

    res.status(200).json({ success: true, message: 'Plan deleted successfully.' });
  } catch (error) {
    console.error('Error in DELETE /api/plans/:planId:', error);
    res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
  }
});

app.put('/api/plans/:planId', authenticateToken, checkDb, async (req, res) => {
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
    await sendPushNotification('Plan Updated!', `"${text}" on ${date}`, '/#/plans', uid);
    res.status(200).json({ success: true, message: 'Plan updated successfully.' });
  } catch (error) {
    console.error('Error in PUT /api/plans/:planId:', error);
    res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
  }
});

// --- Memos CRUD ---
app.get('/api/memos', authenticateToken, checkDb, async (req, res) => {
    try {
        const memosSnapshot = await db.collection('memos').orderBy('createdAt', 'desc').get();
        const memos = memosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(memos);
    } catch (error) {
        console.error('Error in GET /api/memos:', error);
        res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
});

app.post('/api/memos', authenticateToken, checkDb, async (req, res) => {
  const { description, date, location, hashtags, photoUrls } = req.body;
  const { uid, name, email } = req.user;
  try {
    const newMemoRef = await db.collection('memos').add({
      description, date, location, hashtags, photoUrls,
      creatorUid: uid, createdBy: name || email, createdAt: new Date().toISOString(),
    });
    res.status(201).json({ success: true, memoId: newMemoRef.id });
  } catch (error) {
    console.error('Error in POST /api/memos:', error);
    res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
  }
});

app.put('/api/memos/:memoId', authenticateToken, checkDb, async (req, res) => {
    const { memoId } = req.params;
    const { description, date, location, hashtags, photoUrls } = req.body;
    try {
        const memoRef = db.collection('memos').doc(memoId);
        const doc = await memoRef.get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Memo not found.' });
        }

        const originalPhotoUrls = doc.data().photoUrls || [];
        const newPhotoUrls = photoUrls || [];
        const photosToDelete = originalPhotoUrls.filter(url => !newPhotoUrls.includes(url));

        if (photosToDelete.length > 0 && cloudinary.config().api_key) {
            const publicIdsToDelete = photosToDelete.map(extractPublicId).filter(id => id);
            if (publicIdsToDelete.length > 0) {
                console.log(`Deleting ${publicIdsToDelete.length} photos from Cloudinary...`);
                await cloudinary.api.delete_resources(publicIdsToDelete);
            }
        }

        const updateData = { description, date, location, hashtags, photoUrls };
        await memoRef.update(updateData);
        res.status(200).json({ success: true, message: 'Memo updated successfully.' });
    } catch (error) {
        console.error('Error in /api/memos PUT:', error);
        res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
});

app.delete('/api/memos/:memoId', authenticateToken, checkDb, async (req, res) => {
    const { memoId } = req.params;
    try {
        const memoRef = db.collection('memos').doc(memoId);
        const doc = await memoRef.get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Memo not found.' });
        }

        const photosToDelete = doc.data().photoUrls || [];
        if (photosToDelete.length > 0 && cloudinary.config().api_key) {
            const publicIdsToDelete = photosToDelete.map(extractPublicId).filter(id => id);
            if (publicIdsToDelete.length > 0) {
                console.log(`Deleting ${publicIdsToDelete.length} photos from Cloudinary...`);
                await cloudinary.api.delete_resources(publicIdsToDelete);
            }
        }

        await memoRef.delete();
        res.status(200).json({ success: true, message: 'Memo and associated photos deleted.' });
    } catch (error) {
        console.error('Error in /api/memos DELETE:', error);
        res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
});

export const handler = serverless(app);
