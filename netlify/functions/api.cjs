const express = require('express');
const serverless = require('serverless-http');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

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
      serviceAccount = require('./serviceAccountKey.json');
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
  console.error("Error details:", error);
}

const app = express();
app.use(bodyParser.json());

const checkDb = (req, res, next) => {
  if (!db) {
    return res.status(500).json({ success: false, message: "DATABASE NOT CONNECTED. Check server logs." });
  }
  next();
};

const authenticateToken = async (req, res, next) => {
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
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid token.' });
  }
};

// --- API Endpoints ---

// NEW ENDPOINT for registering a push notification token
app.post('/api/register', authenticateToken, checkDb, async (req, res) => {
  const { token } = req.body;
  const { uid } = req.user;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token is required.' });
  }

  try {
    // Store the token in a 'pushTokens' collection, linking it to the user's UID
    const tokenRef = db.collection('pushTokens').doc(token);
    await tokenRef.set({
      uid: uid,
      createdAt: new Date().toISOString()
    });
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
        const updateData = {};
        if (text !== undefined) updateData.text = text;
        if (date !== undefined) updateData.date = date;
        if (location !== undefined) updateData.location = location;
        if (time !== undefined) updateData.time = time;
        if (hashtags !== undefined) updateData.hashtags = hashtags;
        await planRef.update(updateData);
        res.status(200).json({ success: true, message: 'Plan updated successfully.' });
    } catch (error) {
        console.error('Error in /api/plans PUT:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

module.exports.handler = serverless(app);