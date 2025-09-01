// public/firebase-messaging-sw.js

// Import Workbox libraries for caching and routing
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-precaching.prod.js');
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-routing.prod.js');

// Import Firebase SDKs
importScripts('https://www.gstatic.com/firebasejs/9.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.0/firebase-messaging-compat.js');

// The placeholder that will be replaced by the PWA plugin with a list of files to cache.
self.__WB_MANIFEST;

// Precache and route the files listed in the manifest
const { precacheAndRoute } = workbox.precaching;
precacheAndRoute(self.__WB_MANIFEST || []);

// Initialize the Firebase app in the service worker
const firebaseConfig = {
apiKey: "AIzaSyCyOF7Pt2SVD0Q6G-nr4TMBR1crFDeIjpA",
  authDomain: "gruscorner.firebaseapp.com",
  projectId: "gruscorner",
  storageBucket: "gruscorner.firebasestorage.app",
  messagingSenderId: "908324715363",
  appId: "1:908324715363:web:868151931ec56e29003156"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle messages when the app is in the background
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-512x512.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});