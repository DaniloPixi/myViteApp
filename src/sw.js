// src/sw.js

// --- PWA-Specific Imports ---
// These are placeholders that vite-plugin-pwa will replace with the actual precache manifest.
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

// --- Firebase Imports ---
// We use the same importScripts from the original Firebase service worker.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// --- Firebase Configuration ---
// This configuration must match your main app's configuration.
const firebaseConfig = {
  apiKey: "AIzaSyAGxR--Jx9ELN6IZ5hb1sCD67vreCJqm-k",
  authDomain: "gruandus.firebaseapp.com",
  projectId: "gruandus",
  storageBucket: "gruandus.appspot.com",
  messagingSenderId: "104287336044",
  appId: "1:104287336044:web:c2065e0f2f6fb15ff64a49"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// --- Service Worker Lifecycle ---
// This ensures the new service worker activates immediately.
self.skipWaiting();

// --- PWA Pre-caching ---
// This line tells the PWA plugin where to inject its list of files to cache.
// self.__WB_MANIFEST is a placeholder that will be replaced by the build process.
precacheAndRoute(self.__WB_MANIFEST || []);

// --- Firebase Background Message Handler ---
// This is the same logic as before, handling incoming notifications when the app is in the background.
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
