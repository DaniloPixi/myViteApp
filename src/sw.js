import { precacheAndRoute } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Your web app's Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyAGxR--Jx9ELN6IZ5hb1sCD67vreCJqm-k",
  authDomain: "gruandus.firebaseapp.com",
  projectId: "gruandus",
  storageBucket: "gruandus.firebasestorage.app",
  messagingSenderId: "104287336044",
  appId: "1:104287336044:web:c2065e0f2f6fb15ff64a49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// This will be replaced by Vite PWA with the precache manifest.
precacheAndRoute(self.__WB_MANIFEST || []);

// Handle background messages
onBackgroundMessage(messaging, (payload) => {
  console.log('[sw.js] Received background message', payload);

  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/manifest-icon-192.maskable.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
