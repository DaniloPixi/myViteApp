// src/composables/useTimeCapsules.js
import { ref, computed } from 'vue';
import { auth } from '../firebase'; // same place you import auth elsewhere

const capsules = ref([]);
const loading = ref(false);
const error = ref(null);

// internal flag so we only auto-load once
let initialized = false;

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

async function fetchTimeCapsules() {
  loading.value = true;
  error.value = null;

  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/time-capsules', {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `HTTP ${res.status}`);
    }

    const data = await res.json();

    // --- be more forgiving about response shape ---
    let list = [];

    if (Array.isArray(data)) {
      list = data;
    } else if (Array.isArray(data.items)) {
      list = data.items;
    } else if (Array.isArray(data.capsules)) {
      list = data.capsules;
    } else if (Array.isArray(data.data)) {
      list = data.data;
    }

    if (!Array.isArray(list)) {
      console.warn('[useTimeCapsules] Unexpected response shape from /api/time-capsules:', data);
      list = [];
    }

    capsules.value = list;
    initialized = true;
  } catch (e) {
    console.warn('[useTimeCapsules] fetchTimeCapsules failed:', e);
    error.value = e;
  } finally {
    loading.value = false;
  }
}

function ensureLoadedOnce() {
  if (!initialized && !loading.value) {
    fetchTimeCapsules();
  }
}

// Helpers for UI
function isLocked(capsule) {
  if (!capsule || !capsule.unlockAt) return false;
  const now = Date.now();
  const t = new Date(capsule.unlockAt).getTime();
  if (Number.isNaN(t)) return false;
  return t > now;
}

// if backend only sets openedAt, treat that as opened too
function isOpened(capsule) {
  return !!capsule?.opened || !!capsule?.openedAt;
}

const sortedCapsules = computed(() => {
  ensureLoadedOnce();
  return [...capsules.value].sort((a, b) => {
    const ta = a.unlockAt ? new Date(a.unlockAt).getTime() : 0;
    const tb = b.unlockAt ? new Date(b.unlockAt).getTime() : 0;
    return ta - tb;
  });
});

const upcomingCapsules = computed(() => {
  const now = Date.now();
  return sortedCapsules.value.filter((c) => {
    if (!c.unlockAt) return false;
    const t = new Date(c.unlockAt).getTime();
    if (Number.isNaN(t)) return false;
    return t >= now;
  });
});

const unlockedCapsules = computed(() => {
  const now = Date.now();
  return sortedCapsules.value.filter((c) => {
    if (!c.unlockAt) return false;
    const t = new Date(c.unlockAt).getTime();
    if (Number.isNaN(t)) return false;
    return t <= now;
  });
});

// CREATE a new capsule
export async function createTimeCapsule({ toUid, unlockAt, title, message }) {
  const headers = await getAuthHeaders();

  const payload = {
    toUid,
    unlockAt, // string, e.g. ISO or "YYYY-MM-DDTHH:mm" (backend normalizes)
    title: title || '',
    message: message || '',
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

  // refresh list so UI sees it
  await fetchTimeCapsules();

  return data; // { success, id } or similar
}

// UPDATE an existing capsule (only creator, before unlock)
export async function updateTimeCapsule(id, { title, message, unlockAt }) {
  const headers = await getAuthHeaders();

  const payload = {};
  if (typeof title === 'string') payload.title = title;
  if (typeof message === 'string') payload.message = message;
  if (unlockAt) payload.unlockAt = unlockAt;

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

  await fetchTimeCapsules();
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

  // optimistic local update
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

// Main composable hook
export function useTimeCapsules() {
  ensureLoadedOnce();

  return {
    capsules,
    sortedCapsules,
    upcomingCapsules,
    unlockedCapsules,
    loading,
    error,
    fetchTimeCapsules,
    isLocked,
    isOpened,
  };
}
