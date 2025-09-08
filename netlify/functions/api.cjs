
const express = require('express');
const serverless = require('serverless-http');
const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const bodyParser = require('body-parser');

let db;

// --- Firebase Initialization ---
try {
  if (!admin.apps.length) {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log("✅ ✅ ✅ Firebase Admin Initialized SUCCESSFULLY. ✅ ✅ ✅");
  } else {
    db = admin.firestore();
    console.log("Firebase Admin was already initialized.");
  }
} catch(error) {
    db = null;
    console.error("❌ ❌ ❌ CRITICAL: FIREBASE ADMIN SDK INITIALIZATION FAILED. ❌ ❌ ❌");
    console.error(error);
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

// --- Authentication Middleware (kept for user identification) ---
const authenticateToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    // Allow unauthenticated access for simplicity in a shared model, but this is NOT recommended for production
    // If you want to lock it down, return this response:
    // return res.status(401).json({ success: false, message: 'Unauthorized: No token provided.' });
    req.user = { uid: 'anonymous', name: 'Anonymous' }; // Assign a generic user
    return next();
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decodedToken.uid, name: decodedToken.name, email: decodedToken.email };
    next();
  } catch (error) {
    // If token is invalid, treat as anonymous
    console.error('Token verification failed, treating as anonymous user.', error.code);
    req.user = { uid: 'anonymous', name: 'Anonymous' };
    next();
  }
};

// --- API Endpoints ---

app.post('/api/register', authenticateToken, checkDb, async (req, res) => {
    if (req.user.uid === 'anonymous') return res.status(403).json({ success: false, message: 'Anonymous users cannot register devices.'});
    const { token } = req.body;
    const { uid } = req.user;
    try {
        await db.collection('devices').doc(token).set({ uid: uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        res.status(200).json({ success: true, message: 'Device registered.' });
    } catch (error) {
        console.error('Error in /api/register:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// GET all plans for everyone
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

// POST a new plan (created by the logged in user)
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
      creatorUid: uid, // Still track who created it
      createdBy: name || email, // Still track who created it
      createdAt: new Date().toISOString(),
    });
    
    // Notification logic remains the same

    res.status(201).json({ success: true, planId: newPlanRef.id });
  } catch (error) {
    console.error('Error in /api/plans POST:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// DELETE any plan
app.delete('/api/plans/:planId', authenticateToken, checkDb, async (req, res) => {
    const { planId } = req.params;
    try {
        const planRef = db.collection('plans').doc(planId);
        const doc = await planRef.get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Plan not found.' });
        }
        await planRef.delete();
        res.status(200).json({ success: true, message: 'Plan deleted successfully by any user.' });
    } catch (error) {
        console.error('Error in /api/plans DELETE:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// EDIT any plan
app.put('/api/plans/:planId', authenticateToken, checkDb, async (req, res) => {
    const { planId } = req.params;
    const { text, date, location, time, hashtags } = req.body;

    try {
        const planRef = db.collection('plans').doc(planId);
        const doc = await planRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Plan not found.' });
        }

        // Create an object with only the fields that are being updated
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
