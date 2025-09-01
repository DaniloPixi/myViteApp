// public/firebase-messaging-sw.js

// Import Workbox Libraries
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-precaching.prod.js');
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-routing.prod.js');

// Import Firebase SDKs
importScripts('https://www.gstatic.com/firebasejs/9.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.0/firebase-messaging-compat.js');

// Placeholder for the manifest
self.__WB_MANIFEST;

// Precache and route the files
const { precacheAndRoute } = workbox.precaching;
precacheAndRoute(self.__WB_MANIFEST || []);

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAGxR--Jx9ELN6IZ5hb1sCD67vreCJqm-k",
  authDomain: "gruandus.firebaseapp.com",
  projectId: "gruandus",
  storageBucket: "gruandus.firebasestorage.app",
  messagingSenderId: "104287336044",
  appId: "1:104287336044:web:c2065e0f2f6fb15ff64a49"
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-512x512.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});