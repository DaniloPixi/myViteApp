import admin from 'firebase-admin';
import path from 'node:path';
import fs from 'node:fs';
import { v2 as cloudinary } from 'cloudinary';
const env = (key) => globalThis.Netlify?.env?.get(key) ?? process.env[key];
let db;

// --- Dual-Environment Firebase Initialization ---
try {
  if (admin.apps.length === 0) {
    let serviceAccount;
    if (env('FIREBASE_PROJECT_ID')) {
      console.log('Initializing Firebase Admin with environment variables (Production Mode).');
      serviceAccount = {
        type: 'service_account',
        project_id: env('FIREBASE_PROJECT_ID'),
        private_key_id: env('FIREBASE_PRIVATE_KEY_ID'),
        private_key: env('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
        client_email: env('FIREBASE_CLIENT_EMAIL'),
        client_id: env('FIREBASE_CLIENT_ID'),
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: env('FIREBASE_CLIENT_X509_CERT_URL'),
      };
    } else {
      console.log('Initializing Firebase Admin with local serviceAccountKey.json (Local Mode).');
      const keyPath = path.join(process.cwd(), 'netlify', 'functions', 'serviceAccountKey.json');
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    console.log('✅ Firebase Admin Initialized SUCCESSFULLY.');
  } else {
    db = admin.firestore();
  }
} catch (error) {
  db = null;
  console.error('❌ CRITICAL: FIREBASE ADMIN SDK INITIALIZATION FAILED.', error);
}

// --- Dual-Environment Cloudinary Initialization ---
try {
  let cloudinaryConfig = {};
  if (env('CLOUDINARY_API_KEY')) {
    console.log('Initializing Cloudinary with environment variables (Production Mode).');
    cloudinaryConfig = {
      cloud_name: env('CLOUDINARY_CLOUD_NAME') || 'dknmcj1qj',
      api_key: env('CLOUDINARY_API_KEY'),
      api_secret: env('CLOUDINARY_API_SECRET'),
    };
  } else {
    console.log('Initializing Cloudinary with local cloudinaryCreds.json (Local Mode).');
    const credsPath = path.join(process.cwd(), 'netlify', 'functions', 'cloudinaryCreds.json');
    if (fs.existsSync(credsPath)) {
      const { api_key, api_secret } = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      cloudinaryConfig = {
        cloud_name: env('CLOUDINARY_CLOUD_NAME') || 'dknmcj1qj',
        api_key,
        api_secret,
      };
    } else {
      console.warn(
        'Cloudinary credentials not found for local development. Deletion will be skipped.'
      );
    }
  }
  if (cloudinaryConfig.api_key) {
    cloudinary.config(cloudinaryConfig);
    console.log('✅ Cloudinary Initialized SUCCESSFULLY.');
  }
} catch (error) {
  console.error('❌ CRITICAL: CLOUDINARY INITIALIZATION FAILED.', error);
}

export { db, admin, cloudinary };
