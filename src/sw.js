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
  console.log('[sw] onBackgroundMessage', payload);

  const notification = payload?.notification || {};
  const data = payload?.data || {};

  const title = notification.title || 'Notification';
  const body = notification.body || '';

  // Prefer data.url (we set this from the backend); fall back to FCM link or root
  const clickUrl =
    (data && data.url) ||
    (payload?.fcmOptions && payload.fcmOptions.link) ||
    '/';

  const options = {
    body,
    data: {
      // this is what notificationclick will read
      url: clickUrl,
      ...data,
    },
    icon: data.icon || '/icons/notification-icon.png',
    badge: data.badge || '/icons/notification-icon.png',
  };

  // Show OS-level notification (status bar)
  self.registration.showNotification(title, options);

  // If it’s a questCompleted event, poke all windows (unchanged behavior)
  if (data && data.type === 'questCompleted') {
    const msg = {
      type: 'questCompleted',
      date: data.date,
      text: data.text,
      userName: data.userName,
    };

    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage(msg);
        });
      });
  }
});



// --- Notification Click Handler ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlFromNotif = event.notification?.data?.url;
  const urlToOpen = urlFromNotif
    ? new URL(urlFromNotif, self.location.origin).href
    : self.location.origin + '/';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus().then((client) => client.navigate(urlToOpen));
        } else {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

