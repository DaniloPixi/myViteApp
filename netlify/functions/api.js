const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const serverless = require('serverless-http');

// This will be our main Express app
const app = express();

// ---- START: Secure Firebase Admin Setup for Deployment ----
try {
  // Check for required environment variables from Netlify
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing one or more required Firebase environment variables.');
  }

  // --- START: Robust Private Key Cleaning ---
  // The private key from Netlify might have extra quotes or formatting issues from import.
  // This block cleans the key before it is used.
  let cleanPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  // 1. Remove leading/trailing quotes if they exist.
  if (cleanPrivateKey.startsWith('"') && cleanPrivateKey.endsWith('"')) {
    console.log('Found and removing leading/trailing quotes from private key.');
    cleanPrivateKey = cleanPrivateKey.slice(1, -1);
  }

  // 2. The private key is stored as a single line with escaped newlines.
  //    Replace the literal '\n' with actual newline characters '
'.
  cleanPrivateKey = cleanPrivateKey.replace(/\\n/g, '\n');
  // --- END: Robust Private Key Cleaning ---

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: cleanPrivateKey,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  // Check if Firebase app is already initialized to prevent re-initialization
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } else {
    console.log('Firebase Admin SDK was already initialized.');
  }

} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error.message);
}
// ---- END: Secure Firebase Admin Setup ----


// ---- START: In-Memory Database for Tokens ----
let registeredTokens = [];
// ---- END: In-Memory Database ----

const router = express.Router();

// --- Endpoint to register a new token ---
router.post('/register', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  if (!registeredTokens.includes(token)) {
    registeredTokens.push(token);
    console.log('New token registered:', token);
    res.status(200).json({ message: 'Token registered successfully' });
  } else {
    console.log('Token already exists:', token);
    res.status(200).json({ message: 'Token was already registered' });
  }
});

// --- Endpoint to send a notification to all registered tokens ---
router.post('/send', async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }
  
  // Guard clause to ensure Firebase is initialized
  if (admin.apps.length === 0) {
    console.error('Firebase not initialized. Cannot send message.');
    return res.status(500).json({ success: false, error: 'Firebase not initialized on the server.' });
  }

  const tokens = [...registeredTokens];

  if (tokens.length === 0) {
    return res.status(200).json({ success: true, message: 'No registered tokens to send to.' });
  }

  const message = {
    notification: { title, body },
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent message to ${response.successCount} devices.`);
    
    if (response.failureCount > 0) {
      const tokensToDelete = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error.code;
          if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
            tokensToDelete.push(tokens[idx]);
          }
        }
      });

      if (tokensToDelete.length > 0) {
        console.log('Removing invalid tokens:', tokensToDelete);
        registeredTokens = registeredTokens.filter(token => !tokensToDelete.includes(token));
      }
    }
    
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// IMPORTANT: The body-parser middleware MUST be registered before the router.
app.use(bodyParser.json());

// We use the router with a base path
app.use('/api', router);

// This is the magic that makes our Express app work with Netlify Functions
module.exports.handler = serverless(app);