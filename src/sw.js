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

// --- PWA Pre-caching ---
precacheAndRoute(self.__WB_MANIFEST || []);

// --- Firebase Background Message Handler ---
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg',
    data: { 
        url: payload.data.url 
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus().then(client => client.navigate(urlToOpen));
      } else {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
