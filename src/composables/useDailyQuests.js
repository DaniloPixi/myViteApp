// src/composables/useDailyQuest.js
import { ref } from 'vue';
import { db } from '../firebase'; // adjust if your firebase file lives elsewhere
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
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

// in-memory cache of quests from Firestore
const questCache = ref({
  items: [],
  loaded: false,
  loading: false,
});

function bumpQuestVersion() {
  questVersion.value++;
}

function dateKeyFromLocal(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  // This uses *local* date (not UTC truncation)
  return `${year}-${month}-${day}`;
}

function pickRandomQuestText() {
  const idx = Math.floor(Math.random() * QUEST_POOL.length);
  return (
    QUEST_POOL[idx] ||
    "Do one small kind thing for the other today."
  );
}

async function fetchAllQuestsFromFirestore() {
  questCache.value.loading = true;
  try {
    const snap = await getDocs(collection(db, 'dailyQuests'));
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
    bumpQuestVersion(); // trigger reactive updates (calendar, etc.)
  } catch (e) {
    console.warn('[useDailyQuest] Failed to fetch quests', e);
  } finally {
    questCache.value.loading = false;
  }
}

async function ensureQuestsLoaded() {
  if (questCache.value.loaded || questCache.value.loading) return;
  await fetchAllQuestsFromFirestore();
}

// PUBLIC: get or create quest for a given date
export async function getOrCreateQuestForDate(date = new Date()) {
  const key = dateKeyFromLocal(date);
  const questDocRef = doc(db, 'dailyQuests', key);

  // ensure cache is loading in background, but don't block on it
  ensureQuestsLoaded();

  const snap = await getDoc(questDocRef);

  if (snap.exists()) {
    const existing = { id: snap.id, ...snap.data() };
    return existing;
  }

  // create new quest (no completions yet)
  const newQuest = {
    date: key,
    text: pickRandomQuestText(),
    completed: false,          // "has anyone completed?"
    completedAt: null,
    completions: {},           // per-user completion map: { [uid]: true }
    createdAt: serverTimestamp(),
  };

  await setDoc(questDocRef, newQuest, { merge: true });

  // refresh cache
  await fetchAllQuestsFromFirestore();

  return { id: key, ...newQuest };
}

/**
 * PUBLIC: mark quest completed for a given date, for a specific user.
 *
 * This:
 *  - ensures the quest exists
 *  - sets completions[currentUserId] = true (if currentUserId provided)
 *  - keeps `completed` = true as "someone has done it"
 */
export async function markQuestCompleted(date = new Date(), currentUserId = null) {
  const key = dateKeyFromLocal(date);
  const questDocRef = doc(db, 'dailyQuests', key);

  let snap = await getDoc(questDocRef);

  if (!snap.exists()) {
    // If there's no quest yet, create one with a random text and mark this user as completed
    const completions = currentUserId ? { [currentUserId]: true } : {};

    const newQuest = {
      date: key,
      text: pickRandomQuestText(),
      completed: true,              // at least one person completed
      completedAt: serverTimestamp(),
      completions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(questDocRef, newQuest, { merge: true });
  } else {
    const data = snap.data();
    const completions = { ...(data.completions || {}) };

    if (currentUserId) {
      completions[currentUserId] = true;
    }

    await setDoc(
      questDocRef,
      {
        completed: true,
        completedAt: serverTimestamp(),
        completions,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  // refresh cache
  await fetchAllQuestsFromFirestore();

  // re-read the doc so we return consistent data
  snap = await getDoc(questDocRef);
  return {
    id: snap.id,
    ...snap.data(),
  };
}

// PUBLIC: get all quests (from cache; ensures background load)
export function getAllQuests() {
  ensureQuestsLoaded();
  return questCache.value.items;
}
