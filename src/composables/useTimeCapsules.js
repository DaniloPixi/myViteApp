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

// internal flags so we only start the listener once
let initialized = false;
let listenerStarted = false;
let unsubscribe = null;
let subscriberCount = 0; // how many components are using this composable

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
 * Safely get unlockAt as ms since epoch, regardless of format:
 *  - Firestore Timestamp (has .toDate())
 *  - ISO string
 *  - Date
 */
function getUnlockTime(capsule) {
  if (!capsule || !capsule.unlockAt) return null;
  const raw = capsule.unlockAt;

  // Firestore Timestamp style
  if (raw && typeof raw.toDate === 'function') {
    const d = raw.toDate();
    const t = d.getTime();
    return Number.isNaN(t) ? null : t;
  }

  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Start realtime listener on Firestore, same idea as subscribeToMemos().
 * Uses the same collection name as your router: db.collection('timeCapsules')
 */
function startRealtimeSubscription() {
  if (listenerStarted) return;
  listenerStarted = true;
  loading.value = true;
  error.value = null;

  const db = getFirestore();
  const colRef = collection(db, 'timeCapsules'); // <- matches router

  // You sort by unlockAt on the backend; we also sort here for consistency.
  const q = query(colRef, orderBy('unlockAt'));

  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      capsules.value = snapshot.docs.map((doc) => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          ...data,
        };
      });

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
 * Kept for backwards compatibility. In your view you already call
 * `fetchTimeCapsules()` on mount and after save.
 *
 * Now it just ensures the realtime listener is running.
 */
async function fetchTimeCapsules() {
  if (!listenerStarted) {
    startRealtimeSubscription();
  }
}

/**
 * Old helper – now just “make sure the listener is started once”.
 */
function ensureLoadedOnce() {
  if (!initialized && !loading.value) {
    fetchTimeCapsules();
  }
}

// Helpers for UI
export function isLocked(capsule) {
  const t = getUnlockTime(capsule);
  if (t == null) return false;
  return t > Date.now();
}

// if backend only sets openedAt, treat that as opened too
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

// CREATE a new capsule (writes via API, Firestore listener picks up changes)
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
    unlockAt, // backend normalizes to ISO and writes to Firestore
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
  // No manual refetch here – realtime listener will update `capsules`
  return data; // { success, id } or similar
}

// UPDATE an existing capsule (only creator, before unlock)
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

  // Realtime listener will pick up the updated doc
}

// OPEN a capsule (recipient / self-capsule)
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

  // optimistic local update; Firestore listener will correct if needed
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

// DELETE a capsule (only creator)
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

  // Realtime listener will remove it from `capsules` once Firestore doc is deleted
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
    }
  });

  return {
    capsules,
    sortedCapsules,
    upcomingCapsules,
    unlockedCapsules,
    loading,
    error,
    fetchTimeCapsules, // still safe to call; just ensures subscription
    isLocked,
    isOpened,
  };
}
