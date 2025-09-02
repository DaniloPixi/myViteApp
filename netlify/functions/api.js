const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const serverless = require('serverless-http');

// This will be our main Express app
const app = express();

// ---- START: Secure Firebase Admin Setup for Deployment ----
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set.');
  }
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  // Check if Firebase app is already initialized
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
  // We don't exit the process in a serverless function, just log the error
}
// ---- END: Secure Firebase Admin Setup ----

// ---- START: In-Memory Database for Tokens ----
// This array will hold our tokens. In a serverless environment, this state
// might not persist between function invocations if the function 'goes cold'.
// For a more robust solution, a database like Firebase's own Firestore would be the next step.
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

  const tokens = [...registeredTokens];

  if (tokens.length === 0) {
    return res.status(200).json({ message: 'No tokens are registered.' });
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

// We use the router with a base path
app.use('/api', router);
app.use(bodyParser.json());

// This is the magic that makes our Express app work with Netlify Functions
module.exports.handler = serverless(app);
