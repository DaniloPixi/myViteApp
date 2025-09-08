
const express = require('express');
const serverless = require('serverless-http');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const path = require('path');

let db;

// --- Firebase Initialization ---
let serviceAccount;

// In production (Netlify), use environment variables
if (process.env.FIREBASE_PRIVATE_KEY) {
  try {
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
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    };
    console.log("Firebase credentials loaded from environment variables.");
  } catch (error) {
    db = null;
    console.error("CRITICAL: FIREBASE_INIT_FAILED. Could not construct credentials from environment variables.");
    console.error(error);
  }
} else {
  // In local development, use the JSON file
  try {
    const keyFileName = 'serviceAccountKey.json';
    serviceAccount = require(path.join(__dirname, keyFileName));
    console.log("Firebase credentials loaded from serviceAccountKey.json.");
  } catch (error) {
    db = null;
    console.error("CRITICAL: FIREBASE_INIT_FAILED. Could not load 'serviceAccountKey.json' for local development.");
    console.error("Place your Firebase service account key in 'netlify/functions/serviceAccountKey.json'");
  }
}

try {
  if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log("Firebase Admin Initialized SUCCESSFULLY.");
  } else if (!serviceAccount) {
      throw new Error("Service account is not available.");
  }
} catch(error) {
    if (db !== null) db = null;
    console.error("CRITICAL: FIREBASE_APP_INIT_FAILED.");
    console.error(error);
}


const app = express();
app.use(bodyParser.json());

// --- Database Check Middleware ---
const checkDb = (req, res, next) => {
  if (!db) {
    return res.status(500).json({ 
      success: false, 
      message: "DATABASE NOT CONNECTED. See server logs for instructions."
    });
  }
  next();
};

// --- Authentication Middleware --
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
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid token.' });
  }
};

// --- API Endpoints ---

app.get('/api', (req, res) => {
    res.json({ "response": "Hello from the API!" });
});

app.post('/api/register', authenticateToken, checkDb, async (req, res) => {
    const { token } = req.body;
    const { uid } = req.user;
    try {
        await db.collection('devices').doc(token).set({ uid: uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        res.status(200).json({ success: true, message: 'Device registered.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

app.get('/api/plans', authenticateToken, checkDb, async (req, res) => {
    const { uid } = req.user;
    try {
        const plansSnapshot = await db.collection('plans').where('creatorUid', '==', uid).get();
        const plans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(plans);
    } catch (error) {
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // --- Send Notification --- 
    const devicesSnapshot = await db.collection('devices').get();
    const tokens = devicesSnapshot.docs.map(doc => doc.id);

    if (tokens.length > 0) {
        const payload = {
            data: {
                title: `New Plan from ${name || 'a user'}`,
                body: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                icon: '/pwa-192x192.png'
            }
        };
        const options = {
            priority: 'high',
            timeToLive: 60 * 60 * 24 // 24 hours
        };
        try {
          await admin.messaging().sendToDevice(tokens, payload, options);
          console.log('Successfully sent notification to', tokens.length, 'devices.');
        } catch(e) {
          console.error('Error sending notification:', e);
        }
    }
    // --- End Send Notification ---

    res.status(201).json({ success: true, planId: newPlanRef.id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

app.delete('/api/plans/:planId', authenticateToken, checkDb, async (req, res) => {
    const { planId } = req.params;
    const { uid } = req.user;
    try {
        const planRef = db.collection('plans').doc(planId);
        const doc = await planRef.get();
        if (!doc.exists || doc.data().creatorUid !== uid) {
            return res.status(403).json({ success: false, message: 'Forbidden or Not Found.' });
        }
        await planRef.delete();
        res.status(200).json({ success: true, message: 'Plan deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

module.exports.handler = serverless(app);
