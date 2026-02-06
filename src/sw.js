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
function normalizeUrl(maybeUrl) {
  if (!maybeUrl) return new URL('/', self.location.origin).href;
  try {
    return new URL(maybeUrl, self.location.origin).href;
  } catch {
    return new URL('/', self.location.origin).href;
  }
}

function sameOriginPath(input, fallbackPath) {
  // Ensure icon/badge are same-origin paths, not remote URLs.
  // Also strips accidental "http(s)://..." to prevent fetch failures + bell fallback.
  if (!input) return fallbackPath;

  try {
    // If it's already a relative path like "/badge-96.png?v=1"
    if (typeof input === 'string' && input.startsWith('/')) return input;

    // If it's an absolute URL, keep only its path+search IF same origin
    const u = new URL(String(input), self.location.origin);
    if (u.origin === self.location.origin) return u.pathname + u.search;

    // Different origin => reject to fallback
    return fallbackPath;
  } catch {
    return fallbackPath;
  }
}

// Defaults (must exist in /public)
const DEFAULT_ICON = '/icons/manifest-icon-192.png';
const DEFAULT_BADGE = '/badge-96.png';

// --- Firebase Background Message Handler ---
// IMPORTANT: This expects your backend to send DATA-ONLY (no payload.notification).
messaging.onBackgroundMessage((payload) => {
  console.log('[sw] onBackgroundMessage', payload);

  const data = payload?.data || {};

  // Title/body now come from data (your API sends them there)
  const title = data.title || 'Notification';
  const body = data.body || '';

  // Routing: keep whatever you send (type, memoId, view params, etc.)
  const clickUrl = data.url || '/';

  // Force same-origin paths (prevents Chrome bell fallback when it can't fetch)
  const icon = sameOriginPath(data.icon, DEFAULT_ICON);
  const badge = sameOriginPath(data.badge, DEFAULT_BADGE);

  const options = {
    body,
    icon,
    badge,
    data: {
      url: clickUrl,
      ...data,
    },
  };

  // Show OS-level notification (single source of truth)
  self.registration.showNotification(title, options);

  // If it’s a questCompleted event, poke all windows (unchanged behavior)
  if (data.type === 'questCompleted') {
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
