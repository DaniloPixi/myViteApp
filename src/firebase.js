// Use the v8 "compat" libraries to match the service worker
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/messaging';
import 'firebase/compat/firestore'; // Use Firestore

import { firebaseConfig } from './firebaseConfig';

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that one
}

// Initialize and export Firebase services
const auth = firebase.auth();
const messaging = firebase.messaging();
const db = firebase.firestore(); // Initialize Firestore

export { firebase, auth, messaging, db };
