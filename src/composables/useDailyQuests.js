// src/composables/useDailyQuests.js
import { ref } from 'vue';
import { db } from '../firebase'; // adjust path if needed
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

const QUEST_POOL = [
  "Send each other a photo that captures today's mood.",
  "Write one thing you deeply appreciate about the other.",
  "Share a song that reminds you of us and say why.",
  "Tell the other a small memory that still makes you smile.",
  "Plan one tiny thing to do together this week.",
  "Send a random voice message saying something sweet.",
  "Share something you're worried about and listen without fixing.",
  "Pick one future date idea and write it down.",
  "Send a selfie right now, no matter how you look.",
  "Give the other a sincere compliment that's oddly specific.",
  "Describe our relationship using only metaphors.",
  "Choose one thing to take off each other's mental load this week.",
];

export const questVersion = ref(0);

// in-memory cache of quests from Firestore, per user
const questCache = ref({
  items: [],
  loaded: false,
  loading: false,
  userId: null,
});

function bumpQuestVersion() {
  questVersion.value++;
}

function dateKeyFromLocal(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  // local date
  return `${year}-${month}-${day}`;
}

function pickRandomQuestText() {
  const idx = Math.floor(Math.random() * QUEST_POOL.length);
  return QUEST_POOL[idx] || 'Do one small kind thing for the other today.';
}

async function fetchAllQuestsFromFirestore(userId) {
  if (!userId) {
    questCache.value.items = [];
    questCache.value.loaded = true;
    questCache.value.userId = null;
    return;
  }

  // reset cache if user changed
  if (questCache.value.userId !== userId) {
    questCache.value.items = [];
    questCache.value.loaded = false;
    questCache.value.loading = false;
  }

  questCache.value.loading = true;
  try {
    const q = query(
      collection(db, 'dailyQuests'),
      where('userId', '==', userId),
    );
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        ...data,
      });
    });
    questCache.value.items = list;
    questCache.value.loaded = true;
    questCache.value.userId = userId;
    bumpQuestVersion(); // trigger reactive updates (calendar, etc.)
  } catch (e) {
    console.warn('[useDailyQuests] Failed to fetch quests', e);
  } finally {
    questCache.value.loading = false;
  }
}

async function ensureQuestsLoaded(userId) {
  if (!userId) return;
  if (questCache.value.userId !== userId) {
    questCache.value.items = [];
    questCache.value.loaded = false;
    questCache.value.loading = false;
  }
  if (questCache.value.loaded || questCache.value.loading) return;
  await fetchAllQuestsFromFirestore(userId);
}

// PUBLIC: get or create quest for a given date FOR A SPECIFIC USER
// ⬇️ now takes userName too, provided by the caller
// PUBLIC: get or create quest for a given date FOR A SPECIFIC USER
export async function getOrCreateQuestForDate(
  date = new Date(),
  userId,
  userName,
) {
  if (!userId) {
    throw new Error('[useDailyQuests] userId is required for getOrCreateQuestForDate');
  }

  const key = dateKeyFromLocal(date);
  const docId = `${userId}_${key}`;
  const questDocRef = doc(db, 'dailyQuests', docId);

  // start loading per-user cache in background
  ensureQuestsLoaded(userId);

  let snap = await getDoc(questDocRef);

  if (snap.exists()) {
    const existing = { id: snap.id, ...snap.data() };
    return existing;
  }

  const newQuest = {
    userId,
    userName: userName || null,
    date: key,
    text: pickRandomQuestText(),
    completed: false,
    completedAt: null,
    createdAt: serverTimestamp(),
  };

  await setDoc(questDocRef, newQuest, { merge: true });

  // refresh per-user cache
  await fetchAllQuestsFromFirestore(userId);

  // 🔥 invalidate calendar-wide cache so next calendar read refetches
  calendarQuestCache.value.loaded = false;
  calendarQuestCache.value.items = [];
  calendarQuestCache.value.loading = false;

  // re-read so we return whatever Firestore actually has (timestamps, etc.)
  snap = await getDoc(questDocRef);
  return { id: docId, ...snap.data() };
}


// PUBLIC: mark quest completed for a given date FOR A SPECIFIC USER
// ⬇️ now takes userName too
// PUBLIC: mark quest completed for a given date FOR A SPECIFIC USER
export async function markQuestCompleted(
  date = new Date(),
  userId,
  userName,
) {
  if (!userId) {
    throw new Error('[useDailyQuests] userId is required for markQuestCompleted');
  }

  const key = dateKeyFromLocal(date);
  const docId = `${userId}_${key}`;
  const questDocRef = doc(db, 'dailyQuests', docId);

  let snap = await getDoc(questDocRef);

  const baseUpdate = {
    completed: true,
    completedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    // no quest yet for this user/date → create and mark completed
    const newQuest = {
      userId,
      userName: userName || null,
      date: key,
      text: pickRandomQuestText(),
      completed: true,
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    await setDoc(questDocRef, newQuest, { merge: true });
  } else {
    const data = snap.data() || {};
    await setDoc(
      questDocRef,
      {
        ...baseUpdate,
        userName: data.userName || userName || null,
        text: data.text || pickRandomQuestText(),
      },
      { merge: true },
    );
  }

  // refresh per-user cache
  await fetchAllQuestsFromFirestore(userId);

  // 🔥 invalidate calendar-wide cache so it will refetch on next access
  calendarQuestCache.value.loaded = false;
  calendarQuestCache.value.items = [];
  calendarQuestCache.value.loading = false;

  // re-read
  snap = await getDoc(questDocRef);
  return {
    id: snap.id,
    ...snap.data(),
  };
}


// PUBLIC: get all quests for a given user (from cache)
export function getAllQuests(userId) {
  if (!userId) return [];
  ensureQuestsLoaded(userId);
  if (questCache.value.userId !== userId) return [];
  return questCache.value.items;
}

// -------------- EXTRA: calendar-wide quests (all users) --------------
// -------------- EXTRA: calendar-wide quests (all users, realtime) --------------

const calendarQuestCache = ref({
  items: [],
  ready: false,
});

let calendarUnsub = null;

function attachCalendarListenerOnce() {
  if (calendarUnsub || calendarQuestCache.value.ready) return;

  const colRef = collection(db, 'dailyQuests');

  calendarUnsub = onSnapshot(
    colRef,
    (snap) => {
      const list = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data,
        });
      });

      calendarQuestCache.value.items = list;
      calendarQuestCache.value.ready = true;

      // let everything watching quests recompute (calendar)
      bumpQuestVersion();
    },
    (err) => {
      console.warn(
        '[useDailyQuests] onSnapshot failed for calendar quests',
        err,
      );
    },
  );
}

/**
 * For calendar only: returns ALL quests (all users, all dates).
 * A realtime listener keeps this in sync across both users.
 */
export function getQuestsForCalendar() {
  attachCalendarListenerOnce();
  return calendarQuestCache.value.items;
}

/**
 * Optional: keep this around if something calls it (no-op with realtime).
 */
export async function forceReloadCalendarQuests() {
  // With onSnapshot, Firestore pushes updates automatically.
  // You can leave this as a no-op or force reattach if you like:
  calendarQuestCache.value.ready = false;
  attachCalendarListenerOnce();
}


