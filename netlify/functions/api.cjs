const express = require('express');
const serverless = require('serverless-http');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

let db;

// --- Firebase Initialization ---
try {
  if (!admin.apps.length) {
    let serviceAccount;

    // Check if running in a deployed environment (like Netlify) with environment variables
    if (process.env.FIREBASE_PRIVATE_KEY) {
      console.log("Initializing Firebase Admin with environment variables.");
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Un-escape newlines
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      };
    } else {
      // Fallback for local development using the JSON file
      console.log("Initializing Firebase Admin with local serviceAccountKey.json.");
      serviceAccount = require('./serviceAccountKey.json');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
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
    if (error.code === 'MODULE_NOT_FOUND') {
        console.error(`\n--- HINT ---\nThis error often means you're running on a server (like Netlify) where the 'serviceAccountKey.json' file is not present. Ensure your Firebase service account keys are set as environment variables in your deployment environment. The function is expecting variables like 'FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', etc.\n--- HINT ---`);
    }
}

const app = express();
app.use(bodyParser.json());

const checkDb = (req, res, next) => {
  if (!db) {
    return res.status(500).json({ 
      success: false, 
      message: "DATABASE NOT CONNECTED. See server logs for instructions."
    });
  }
  next();
};

// --- Authentication Middleware ---
const authenticateToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    req.user = { uid: 'anonymous', name: 'Anonymous' };
    return next();
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decodedToken.uid, name: decodedToken.name, email: decodedToken.email };
    next();
  } catch (error) {
    console.error('Token verification failed, treating as anonymous user.', error.code);
    req.user = { uid: 'anonymous', name: 'Anonymous' };
    next();
  }
};

// --- API Endpoints ---

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