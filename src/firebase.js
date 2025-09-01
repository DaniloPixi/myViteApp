// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
apiKey: "AIzaSyCyOF7Pt2SVD0Q6G-nr4TMBR1crFDeIjpA",
  authDomain: "gruscorner.firebaseapp.com",
  projectId: "gruscorner",
  storageBucket: "gruscorner.firebasestorage.app",
  messagingSenderId: "908324715363",
  appId: "1:908324715363:web:868151931ec56e29003156"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };