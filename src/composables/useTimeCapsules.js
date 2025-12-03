// src/composables/useTimeCapsules.js
import { ref, computed, onUnmounted } from 'vue';
import { auth } from '../firebase';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

const capsules = ref([]);
const loading = ref(false);
const error = ref(null);

let initialized = false;
let listenerStarted = false;
let unsubscribe = null;
let subscriberCount = 0;

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('[useTimeCapsules] Not authenticated');
  }
  const idToken = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };
}

/**
 * Normalize unlockAt into a number (ms since epoch)
 * Supports:
 *  - Firestore Timestamp (has .toDate())
 *  - ISO string
 *  - Date
 */
function getUnlockTime(capsule) {
  if (!capsule || !capsule.unlockAt) return null;
  const raw = capsule.unlockAt;

  if (raw && typeof raw.toDate === 'function') {
    const d = raw.toDate();
    const t = d.getTime();
    return Number.isNaN(t) ? null : t;
  }

  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Start a realtime subscription on ALL timeCapsules, ordered by unlockAt.
 */
function startRealtimeSubscription() {
  if (listenerStarted) return;
  listenerStarted = true;

  const user = auth.currentUser;
  if (!user) {
    // No authenticated user → no data
    loading.value = false;
    error.value = null;
    capsules.value = [];
    return;
  }

  loading.value = true;
  error.value = null;

  const db = getFirestore();
  const colRef = collection(db, 'timeCapsules');

  const q = query(colRef, orderBy('unlockAt'));

  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      capsules.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() || {}),
      }));
      loading.value = false;
      error.value = null;
      initialized = true;
    },
    (err) => {
      console.warn('[useTimeCapsules] realtime subscription error:', err);
      error.value = err;
      loading.value = false;
    },
  );
}

/**
 * Kept for backwards compatibility – now just ensures the subscription is running.
 */
async function fetchTimeCapsules() {
  if (!listenerStarted) {
    startRealtimeSubscription();
  }
}

function ensureLoadedOnce() {
  if (!initialized && !loading.value) {
    fetchTimeCapsules();
  }
}

// --- Helpers for UI ---

export function isLocked(capsule) {
  const t = getUnlockTime(capsule);
  if (t == null) return false;
  return t > Date.now();
}

export function isOpened(capsule) {
  return !!capsule?.opened || !!capsule?.openedAt;
}

// All capsules, sorted by unlock time ascending.
const sortedCapsules = computed(() => {
  ensureLoadedOnce();
  return [...capsules.value].sort((a, b) => {
    const ta = getUnlockTime(a) ?? 0;
    const tb = getUnlockTime(b) ?? 0;
    return ta - tb;
  });
});

// Convenience subsets by time only
const upcomingCapsules = computed(() => {
  const now = Date.now();
  return sortedCapsules.value.filter((c) => {
    const t = getUnlockTime(c);
    if (t == null) return false;
    return t >= now;
  });
});

const unlockedCapsules = computed(() => {
  const now = Date.now();
  return sortedCapsules.value.filter((c) => {
    const t = getUnlockTime(c);
    if (t == null) return false;
    return t <= now;
  });
});

// --- Mutations via API (backend enforces permissions) ---

export async function createTimeCapsule({
  toUid,
  unlockAt,
  title,
  message,
  photos = [],
}) {
  const headers = await getAuthHeaders();

  const payload = {
    toUid,
    unlockAt,
    title: title || '',
    message: message || '',
    photos: Array.isArray(photos) ? photos : [],
  };

  const res = await fetch('/api/time-capsules', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.warn('[useTimeCapsules] createTimeCapsule failed:', txt);
    throw new Error(txt || `HTTP ${res.status}`);
  }

  const data = await res.json();
  // Realtime listener will pick up the new doc automatically
  return data;
}

export async function updateTimeCapsule(id, {
  title,
  message,
  unlockAt,
  photos,
}) {
  const headers = await getAuthHeaders();

  const payload = {};
  if (typeof title === 'string') payload.title = title;
  if (typeof message === 'string') payload.message = message;
  if (unlockAt) payload.unlockAt = unlockAt;
  if (Array.isArray(photos)) payload.photos = photos;

  const res = await fetch(`/api/time-capsules/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.warn('[useTimeCapsules] updateTimeCapsule failed:', txt);
    throw new Error(txt || `HTTP ${res.status}`);
  }

  // Listener sees the update
}

export async function openTimeCapsule(id) {
  const headers = await getAuthHeaders();

  const res = await fetch(`/api/time-capsules/${id}/open`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const txt = await res.text();
    console.warn('[useTimeCapsules] openTimeCapsule failed:', txt);
    throw new Error(txt || `HTTP ${res.status}`);
  }

  // Optimistic local update; Firestore listener will sync if backend sets openedAt differently
  const idx = capsules.value.findIndex((c) => c.id === id);
  if (idx !== -1) {
    capsules.value[idx] = {
      ...capsules.value[idx],
      opened: true,
      openedAt: new Date().toISOString(),
    };
  }

  return true;
}

export async function deleteTimeCapsule(id) {
  const headers = await getAuthHeaders();

  const res = await fetch(`/api/time-capsules/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const txt = await res.text();
    console.warn('[useTimeCapsules] deleteTimeCapsule failed:', txt);
    throw new Error(txt || `HTTP ${res.status}`);
  }

  // Firestore listener will remove it once the backend deletes the doc
}

// Main composable hook
export function useTimeCapsules() {
  ensureLoadedOnce();
  subscriberCount++;

  onUnmounted(() => {
    subscriberCount--;
    if (subscriberCount <= 0 && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      listenerStarted = false;
      initialized = false;
      capsules.value = [];
    }
  });

  return {
    capsules,
    sortedCapsules,
    upcomingCapsules,
    unlockedCapsules,
    loading,
    error,
    fetchTimeCapsules, // harmless, just ensures subscription
    isLocked,
    isOpened,
  };
}
