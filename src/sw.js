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
  apiKey: 'AIzaSyAGxR--Jx9ELN6IZ5hb1sCD67vreCJqm-k',
  authDomain: 'gruandus.firebaseapp.com',
  projectId: 'gruandus',
  storageBucket: 'gruandus.appspot.com',
  messagingSenderId: '104287336044',
  appId: '1:104287336044:web:c2065e0f2f6fb15ff64a49',
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
    plugins: [],
  })
);

// --- Helpers ---
function getFrom(obj, path, fallback) {
  // tiny safe getter: getFrom(payload, ['a','b','c'], default)
  try {
    return path.reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj) ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeUrl(maybeUrl) {
  if (!maybeUrl) return self.location.origin + '/';
  try {
    return new URL(maybeUrl, self.location.origin).href;
  } catch {
    return self.location.origin + '/';
  }
}

// IMPORTANT DEFAULTS:
// - icon: can be your pretty full icon (shows in notification drawer)
// - badge: MUST be a monochrome transparent PNG for Android status bar
const DEFAULT_ICON = '/icons/manifest-icon-192.png';
const DEFAULT_BADGE = '/badge-96.png'; // put this in /public so it serves from root

// --- Firebase Background Message Handler ---
messaging.onBackgroundMessage((payload) => {
  console.log('[sw] onBackgroundMessage', payload);

  // FCM can deliver title/body in different places depending on how you send
  const notification = payload?.notification || {};
  const data = payload?.data || {};

  const title = notification.title || data.title || 'Notification';
  const body = notification.body || data.body || '';

  // Prefer your app routing field, then fcm_options link, then root
  const clickUrl =
    data.url ||
    getFrom(payload, ['fcmOptions', 'link'], null) ||
    getFrom(payload, ['webpush', 'fcm_options', 'link'], null) ||
    '/';

  // These may arrive from data or notification depending on your server payload shape
  // (We support both so you can keep your current backend.)
  const icon =
    data.icon ||
    notification.icon ||
    DEFAULT_ICON;

  const badge =
    data.badge ||
    notification.badge ||
    DEFAULT_BADGE;

  const options = {
    body,
    // Keep *all* your data so your app can route (memos/plans/etc)
    data: {
      url: clickUrl,
      ...data,
    },
    icon,
    badge,
  };

  // Show OS-level notification
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
        clients.forEach((client) => client.postMessage(msg));
      });
  }
});

// --- Optional: Catch non-FCM Web Push (if any) ---
// If you ONLY ever use Firebase messaging, you can delete this.
// Keeping it prevents “silent drops” if some pushes hit the generic push event.
self.addEventListener('push', (event) => {
  // If Firebase handled it, event.data may still exist, but we don't want double notifications.
  // Firebase's messaging SW handler does NOT fire this handler directly in most setups,
  // but some stacks do. We guard by checking for a "firebase-messaging-msg-data" shape.
  let payload = null;
  try {
    payload = event.data ? event.data.json() : null;
  } catch {
    payload = null;
  }
  if (!payload) return;

  // Heuristic: if it looks like an FCM payload (has notification or data fields), let it pass
  // ONLY if you are not using messaging.onBackgroundMessage (but you are).
  // So we simply do nothing to avoid duplicates.
});

// --- Notification Click Handler ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlFromNotif = event.notification?.data?.url;
  const urlToOpen = normalizeUrl(urlFromNotif);

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        if (clientList.length > 0) {
          // Prefer a focused client if available
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) client = clientList[i];
          }
          return client.focus().then(() => client.navigate(urlToOpen));
        }
        return self.clients.openWindow(urlToOpen);
      })
  );
});
