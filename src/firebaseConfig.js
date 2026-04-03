import { APP_ENV } from './config/env';

const required = (name, fallback = '') => {
  const value = import.meta.env[name] ?? fallback;
  return value;
};

// Single source of truth for Firebase configuration.
export const firebaseConfig = {
  apiKey: required('VITE_FIREBASE_API_KEY', 'AIzaSyAGxR--Jx9ELN6IZ5hb1sCD67vreCJqm-k'),
  authDomain: required('VITE_FIREBASE_AUTH_DOMAIN', 'gruandus.firebaseapp.com'),
  databaseURL: required(
    'VITE_FIREBASE_DATABASE_URL',
    'https://gruandus-default-rtdb.europe-west1.firebasedatabase.app/'
  ),
  projectId: required('VITE_FIREBASE_PROJECT_ID', 'gruandus'),
  storageBucket: required('VITE_FIREBASE_STORAGE_BUCKET', 'gruandus.firebasestorage.app'),
  messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID', '104287336044'),
  appId: required('VITE_FIREBASE_APP_ID', '1:104287336044:web:c2065e0f2f6fb15ff64a49'),
};

if (import.meta.env.DEV) {
  console.info(`[env] APP_ENV=${APP_ENV} Firebase project=${firebaseConfig.projectId}`);
}
