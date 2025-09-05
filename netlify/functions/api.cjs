// netlify/functions/api.cjs
const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

console.log('SERVER: Cold start; loading api.cjs module.');

// --- Function to get Firebase credentials ---
function getFirebaseCredentials() {
    const isNetlify = process.env.NETLIFY && process.env.FIREBASE_PROJECT_ID;

    if (isNetlify) {
        console.log('SERVER: Netlify environment detected. Initializing Firebase from environment variables.');

        // PRE-VALIDATE required environment variables to avoid runtime errors.
        const requiredEnvVars = [
            'FIREBASE_PROJECT_ID',
            'FIREBASE_PRIVATE_KEY_ID',
            'FIREBASE_PRIVATE_KEY',
            'FIREBASE_CLIENT_EMAIL',
            'FIREBASE_CLIENT_ID',
            'FIREBASE_CLIENT_X509_CERT_URL'
        ];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                // This error will be visible in the Netlify function logs and cause a clear failure.
                throw new Error(`CRITICAL: Missing required Firebase environment variable: ${envVar}`);
            }
        }

        // Now it's safe to construct the service account object.
        const serviceAccount = {
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
        
        return serviceAccount;

    } else {
        console.log('SERVER: Assuming local development. Initializing Firebase from serviceAccountKey.json.');
        try {
            const keyPath = './serviceAccountKey.json';
            return require(keyPath);
        } catch (error) {
            console.error("CRITICAL: Failed to load serviceAccountKey.json in local environment.", error);
            throw new Error("In local dev, serviceAccountKey.json is required but was not found.");
        }
    }
}

// --- Firebase Admin SDK Initialization ---
try {
    if (admin.apps.length === 0) {
        const serviceAccount = getFirebaseCredentials();
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('SERVER: Firebase Admin SDK initialized successfully.');
    }
} catch (error) {
    console.error('SERVER CRITICAL: Final Firebase initialization failed:', error.message);
    throw new Error('Could not initialize Firebase Admin SDK. Check logs for details.');
}

const db = admin.firestore();
const app = express();
app.use(bodyParser.json());

// --- CORS Middleware ---
app.use((req, res, next) => {
  console.log(`SERVER: Incoming request: ${req.method} ${req.path}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    console.log('SERVER: Responding to OPTIONS request with 200 OK.');
    return res.sendStatus(200);
  }
  next();
});

// --- Authentication Middleware ---
const authenticateToken = async (req, res, next) => {
  console.log('SERVER-AUTH: Middleware started.');
  const authHeader = req.headers.authorization;
  const idToken = authHeader && authHeader.split(' ')[1];

  if (!idToken) {
    console.log('SERVER-AUTH: Failed. No token provided.');
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided.' });
  }

  try {
    console.log('SERVER-AUTH: Token found. Attempting to verify with Firebase...');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(`SERVER-AUTH: Success. Token verified for UID: ${decodedToken.uid}`);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('SERVER-AUTH: CRITICAL: Error verifying Firebase ID token:', error);
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid token.' });
  }
};

// --- EFFICIENT Register Endpoint ---
app.post('/api/register', authenticateToken, async (req, res) => {
  console.log('SERVER-REGISTER: Handler started.');
  const { token } = req.body;
  const uid = req.user.uid;

  if (!token) {
    console.log('SERVER-REGISTER: Failed. FCM token missing from body.');
    return res.status(400).json({ success: false, message: 'FCM token is required.' });
  }

  try {
    const tokenDocRef = db.collection('fcm_tokens').doc(uid);
    const doc = await tokenDocRef.get();

    if (doc.exists && doc.data().token === token) {
      console.log(`SERVER-REGISTER: Token for UID ${uid} is already up-to-date.`);
      return res.json({ success: true, message: 'Token is already registered and up-to-date.' });
    }

    console.log(`SERVER-REGISTER: New/changed token for UID ${uid}. Saving to Firestore...`);
    await tokenDocRef.set({
        token: token,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`SERVER-REGISTER: Success. Firestore write complete for UID: ${uid}`);
    res.json({ success: true, message: 'Token registered and stored successfully.' });

  } catch (error) {
    console.error(`SERVER-REGISTER: CRITICAL: Error during Firestore operation for UID: ${uid}`, error);
    res.status(500).json({ success: false, message: 'Internal server error while handling token.' });
  }
});

// --- NEW: Send Notification Endpoint ---
app.post('/api/send-to-user', async (req, res) => {
  console.log('SERVER-SEND: Handler started.');
  const { userId, title, body } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields: userId, title, or body.' });
  }

  try {
    const tokenDocRef = db.collection('fcm_tokens').doc(userId);
    const doc = await tokenDocRef.get();

    if (!doc.exists) {
      console.log(`SERVER-SEND: No token found for user ${userId}.`);
      return res.status(404).json({ error: 'Token not found for this user.' });
    }

    const fcmToken = doc.data().token;

    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: fcmToken,
    };

    console.log(`SERVER-SEND: Sending notification to user ${userId}...`);
    const response = await admin.messaging().send(message);
    console.log('SERVER-SEND: Successfully sent message:', response);

    res.json({ success: true, messageId: response });

  } catch (error) {
    console.error(`SERVER-SEND: Error sending notification to user ${userId}:`, error);
    if (error.code === 'messaging/registration-token-not-registered') {
      await db.collection('fcm_tokens').doc(userId).delete();
      return res.status(404).json({ error: 'Invalid token. It has been deleted.' });
    }
    res.status(500).json({ error: 'Internal server error while sending notification.' });
  }
});

// Final setup
module.exports.handler = require('serverless-http')(app);
