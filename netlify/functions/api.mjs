
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
        // The regex now captures the full path after /upload/, which is what Cloudinary uses as the public_id
        // We then need to remove the file extension.
        const pathWithExtension = match[1];
        const lastDotIndex = pathWithExtension.lastIndexOf('.');
        if (lastDotIndex > -1) {
            return pathWithExtension.substring(0, lastDotIndex);
        }
        return pathWithExtension; 
    }
    return null;
};

async function sendPushNotification(title, body, link) { /* ... existing push notification code ... */ }

// --- API Endpoints ---

app.post('/api/register', authenticateToken, checkDb, async (req, res) => { /* ... */ });
app.get('/api/plans', authenticateToken, checkDb, async (req, res) => { /* ... */ });
app.post('/api/plans', authenticateToken, checkDb, async (req, res) => { /* ... */ });
app.delete('/api/plans/:planId', authenticateToken, checkDb, async (req, res) => { /* ... */ });
app.put('/api/plans/:planId', authenticateToken, checkDb, async (req, res) => { /* ... */ });

// --- Memos CRUD ---
app.get('/api/memos', authenticateToken, checkDb, async (req, res) => {
    try {
        const memosSnapshot = await db.collection('memos').orderBy('createdAt', 'desc').get();
        const memos = memosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(memos);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error.' });
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
    res.status(500).json({ success: false, message: 'Internal server error.' });
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
