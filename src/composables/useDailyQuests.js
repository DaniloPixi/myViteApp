// src/composables/useDailyQuest.js
import { ref } from 'vue';
import { db } from '../firebase'; // adjust path if your firebase file lives elsewhere
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

  // create new quest
  const newQuest = {
    date: key,
    text: pickRandomQuestText(),
    completed: false,
    completedAt: null,
    createdAt: serverTimestamp(),
  };

  await setDoc(questDocRef, newQuest, { merge: true });

  // refresh cache
  await fetchAllQuestsFromFirestore();

  return { id: key, ...newQuest };
}

// PUBLIC: mark quest completed for a given date
export async function markQuestCompleted(date = new Date()) {
  const key = dateKeyFromLocal(date);
  const questDocRef = doc(db, 'dailyQuests', key);

  // ensure existence: if doc doesn't exist, create with random text
  let snap = await getDoc(questDocRef);
  if (!snap.exists()) {
    const newQuest = {
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
      { merge: true }
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
