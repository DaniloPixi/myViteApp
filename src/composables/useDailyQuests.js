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
export async function getOrCreateQuestForDate(date = new Date(), userId) {
  if (!userId) {
    throw new Error('[useDailyQuests] userId is required for getOrCreateQuestForDate');
  }

  const key = dateKeyFromLocal(date);
  const docId = `${userId}_${key}`;
  const questDocRef = doc(db, 'dailyQuests', docId);

  // start loading cache in background
  ensureQuestsLoaded(userId);

  const snap = await getDoc(questDocRef);

  if (snap.exists()) {
    const existing = { id: snap.id, ...snap.data() };
    return existing;
  }

  // create new quest for THIS user only
  const newQuest = {
    userId,
    date: key,
    text: pickRandomQuestText(),
    completed: false,
    completedAt: null,
    createdAt: serverTimestamp(),
  };

  await setDoc(questDocRef, newQuest, { merge: true });

  // refresh cache for this user
  await fetchAllQuestsFromFirestore(userId);

  return { id: docId, ...newQuest };
}

// PUBLIC: mark quest completed for a given date FOR A SPECIFIC USER
export async function markQuestCompleted(date = new Date(), userId) {
  if (!userId) {
    throw new Error('[useDailyQuests] userId is required for markQuestCompleted');
  }

  const key = dateKeyFromLocal(date);
  const docId = `${userId}_${key}`;
  const questDocRef = doc(db, 'dailyQuests', docId);

  let snap = await getDoc(questDocRef);

  if (!snap.exists()) {
    // no quest yet for this user/date → create and mark completed
    const newQuest = {
      userId,
      date: key,
      text: pickRandomQuestText(),
      completed: true,
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    await setDoc(questDocRef, newQuest, { merge: true });
  } else {
    await setDoc(
      questDocRef,
      {
        completed: true,
        completedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  // refresh cache
  await fetchAllQuestsFromFirestore(userId);

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
