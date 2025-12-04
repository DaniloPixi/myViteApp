// src/sw.js

// --- PWA-Specific Imports ---
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

// --- Firebase Imports ---
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// --- Firebase Configuration ---
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
self.skipWaiting();

// --- PWA Pre-caching and Runtime Caching ---
precacheAndRoute(self.__WB_MANIFEST || []);

// Runtime caching for Firebase libraries
registerRoute(
  /^https:\/\/www\.gstatic\.com\/firebasejs\/.*/,
  new StaleWhileRevalidate({
    cacheName: 'firebase-js-cache',
    plugins: []
  })
);

// --- Firebase Background Message Handler ---
messaging.onBackgroundMessage((payload) => {
  // FCM sends both { notification, data }
  const data = payload?.data || {};
  const notif = payload?.notification || {};

  const title =
    data.title ||
    notif.title ||
    'Gruandus 💕';

  const body =
    data.body ||
    notif.body ||
    '';

  // URL to open when notification is clicked
  const url =
    data.url ||
    data.link ||
    '/';

  const type = data.type || 'generic';

  const options = {
    body,

    // Default icon / badge – adjust these paths to your real icons
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',

    // This object is available in notificationclick
    data: {
      url,
      type,
      ...data, // includes questId, userName, etc. if present
    },

    // A simple vibration pattern (Android / some browsers)
    vibrate: [100, 50, 100],

    // Grouping key for some platforms
    tag: type,

    // Optional actions (not all browsers show these)
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
    ],
  };

  self.registration.showNotification(title, options);

  // Special handling for questCompleted: ping all open clients
  if (type === 'questCompleted') {
    const messageForClients = {
      type: 'questCompleted',
      date: data.date,
      text: data.text,
      userName: data.userName,
      questId: data.questId,
    };

    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) => client.postMessage(messageForClients));
      });
  }
});

// --- Notification Click Handler ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';
  const action = event.action; // 'open' / custom actions / '' for default

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an open tab from the same origin
        let matchingClient = null;

        for (const client of clientList) {
          try {
            const clientUrl = new URL(client.url);

            if (clientUrl.origin === self.location.origin) {
              matchingClient = client;
              break;
            }
          } catch (e) {
            // Ignore badly formatted URLs
          }
        }

        if (matchingClient) {
          return matchingClient.focus().then(() => {
            if ('navigate' in matchingClient) {
              return matchingClient.navigate(urlToOpen);
            }
          });
        }

        // No matching tab → open a new one
        return self.clients.openWindow(urlToOpen);
      })
  );
});
