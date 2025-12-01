<template>
  <!-- NOT COMPLETED STATE: full card -->
  <div v-if="!quest || !quest.completed" class="daily-quest-card">
    <div class="dq-header">
      <span class="dq-label">Daily Quest</span>
      <span class="dq-date">{{ formattedDate }}</span>
    </div>

    <p class="dq-text">
      {{ quest?.text }}
    </p>

    <div class="dq-footer">
      <button
        class="dq-btn"
        :disabled="loading"
        @click="completeQuest"
      >
        <span v-if="loading">Working...</span>
        <span v-else>Mark as completed</span>
      </button>
    </div>

    <!-- Stats & progress -->
    <div class="dq-stats" v-if="statsReady">
      <span v-if="streak > 0" class="dq-streak">
        Streak: {{ streak }} day{{ streak === 1 ? '' : 's' }} 🔥
      </span>
      <span v-if="monthDayIndex > 0" class="dq-month">
        This month: {{ monthCompletedCount }} / {{ monthDayIndex }} quests
        <span v-if="allDoneSoFar" class="dq-month-flag">
          – perfect so far 💫
        </span>
      </span>
    </div>
  </div>

  <!-- COMPLETED STATE: minimal pill -->
  <div v-else class="daily-quest-completed">
    <span class="dq-completed-pill">
      Quest completed ✨
    </span>

    <!-- Stats & progress even when completed -->
    <div class="dq-stats" v-if="statsReady">
      <span v-if="streak > 0" class="dq-streak">
        Streak: {{ streak }} day{{ streak === 1 ? '' : 's' }} 🔥
      </span>
      <span v-if="monthDayIndex > 0" class="dq-month">
        This month: {{ monthCompletedCount }} / {{ monthDayIndex }} quests
        <span v-if="allDoneSoFar" class="dq-month-flag">
          – perfect so far 💫
        </span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import {
  getOrCreateQuestForDate,
  markQuestCompleted,
  getAllQuests,
} from '../composables/useDailyQuests';
import { auth } from '../firebase';

const props = defineProps({
  // Date for which we show the quest (usually today)
  date: {
    type: [String, Date],
    default: () => new Date(),
  },
  // Optional: pass user id from parent if you want;
  // otherwise we'll use auth.currentUser.uid
  currentUserId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['quest-completed', 'quest-updated']);

const quest = ref(null);
const loading = ref(false);

// stats
const statsReady = ref(false);
const streak = ref(0);
const monthCompletedCount = ref(0);
const monthDayIndex = ref(0);

const parsedDate = computed(() => new Date(props.date));

const formattedDate = computed(() =>
  parsedDate.value.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }),
);

// local helper: same date formatting as composable
function dateKeyLocal(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper: get uid + friendly name from Firebase auth (or props)
function getCurrentUserIdentity() {
  const user = auth.currentUser;
  const uid = user?.uid || props.currentUserId || null;
  const userName =
    user?.displayName ||
    user?.email ||
    null;

  return { uid, userName };
}

// compute streak + monthly progress for this user
function computeStats(uid) {
  statsReady.value = false;
  if (!uid) return;

  const all = getAllQuests(uid) || [];
  if (!all.length) {
    streak.value = 0;
    monthCompletedCount.value = 0;
    monthDayIndex.value = parsedDate.value.getDate();
    statsReady.value = true;
    return;
  }

  const current = parsedDate.value;
  const year = current.getFullYear();
  const month = current.getMonth(); // 0-based
  const todayDay = current.getDate();
  monthDayIndex.value = todayDay;

  // all completed quests in this month (up to today)
  const monthlyCompletedKeys = new Set();

  all.forEach((q) => {
    if (!q.date || !q.completed) return;
    const d = new Date(q.date);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      d.getDate() <= todayDay
    ) {
      monthlyCompletedKeys.add(dateKeyLocal(d));
    }
  });

  monthCompletedCount.value = monthlyCompletedKeys.size;

  // streak: walk backwards from today, day by day, as long as each date is in monthlyCompletedKeys
  let s = 0;
  const cursor = new Date(current);
  while (true) {
    const key = dateKeyLocal(cursor);
    if (monthlyCompletedKeys.has(key)) {
      s++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  streak.value = s;
  statsReady.value = true;
}

const allDoneSoFar = computed(() => {
  return (
    monthDayIndex.value > 0 &&
    monthCompletedCount.value === monthDayIndex.value
  );
});

async function loadQuest() {
  loading.value = true;
  try {
    const { uid, userName } = getCurrentUserIdentity();

    if (!uid) {
      console.warn('[DailyQuestWidget] No userId available in loadQuest');
      loading.value = false;
      return;
    }

    const q = await getOrCreateQuestForDate(
      parsedDate.value,
      uid,
      userName,
    );

    quest.value = q;
    emit('quest-updated', q);

    computeStats(uid);
  } catch (e) {
    console.warn('[DailyQuestWidget] Failed to load quest', e);
  } finally {
    loading.value = false;
  }
}

async function completeQuest() {
  if (quest.value?.completed || loading.value) return;

  loading.value = true;
  try {
    const { uid, userName } = getCurrentUserIdentity();

    if (!uid) {
      console.warn('[DailyQuestWidget] No userId available in completeQuest');
      loading.value = false;
      return;
    }

    // 1) Update Firestore
    const updated = await markQuestCompleted(
      parsedDate.value,
      uid,
      userName,
    );

    quest.value = updated;
    emit('quest-completed', updated);
    emit('quest-updated', updated);

    // Recompute stats after completion
    computeStats(uid);

    // 2) Notify backend → push notification to the other user
    const payload = {
      date: updated.date || parsedDate.value.toISOString().slice(0, 10),
      text: updated.text,
    };

    try {
      const user = auth.currentUser;
      if (!user) {
        console.warn(
          '[DailyQuestWidget] No authenticated user, cannot notify backend',
        );
      } else {
        const idToken = await user.getIdToken();

        const res = await fetch('/api/quests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.warn(
            '[DailyQuestWidget] /api/quests failed:',
            await res.text(),
          );
        }
      }
    } catch (notifyError) {
      console.warn(
        '[DailyQuestWidget] Failed to call /api/quests:',
        notifyError,
      );
    }
  } catch (e) {
    console.warn('[DailyQuestWidget] Failed to complete quest', e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadQuest();
});

watch(
  () => props.date,
  () => {
    loadQuest();
  },
);
</script>

<style scoped>
.daily-quest-card {
  position: relative;
  padding: 14px 18px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 0, 255, 0.5);
  background: radial-gradient(circle at 10% 0%, rgba(0, 255, 255, 0.1), transparent 55%),
              radial-gradient(circle at 90% 100%, rgba(255, 0, 255, 0.12), transparent 55%),
              rgba(0, 0, 0, 0.75);
  box-shadow:
    0 0 18px rgba(255, 0, 255, 0.35),
    0 0 26px rgba(0, 255, 255, 0.25);
  color: #fefefe;
  max-width: 480px;
}

.dq-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.dq-label {
  font-family: 'Great Vibes', cursive;
  font-size: 1.5rem;
  color: rgb(236, 5, 148);
  text-shadow: 0 0 8px magenta;
}

.dq-date {
  font-size: 0.85rem;
  opacity: 0.7;
}

.dq-text {
  font-size: 0.95rem;
  line-height: 1.4;
  margin: 6px 0 12px;
  color: #e8e8ff;
}

.dq-footer {
  display: flex;
  justify-content: flex-end;
}

.dq-btn {
  border-radius: 999px;
  border: 1px solid magenta;
  background: rgba(0, 0, 0, 0.7);
  color: magenta;
  padding: 6px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  box-shadow:
    inset 0 0 8px rgba(255, 0, 255, 0.6),
    0 0 8px rgba(255, 0, 255, 0.5);
  transition: all 0.18s ease;
}

.dq-btn:hover:not(:disabled) {
  box-shadow:
    inset 0 0 10px rgba(255, 0, 255, 0.9),
    0 0 12px rgba(0, 255, 255, 0.6);
  transform: translateY(-1px);
}

.dq-btn:disabled {
  opacity: 0.65;
  cursor: default;
  border-color: rgba(0, 255, 255, 0.6);
  color: rgba(0, 255, 255, 0.9);
  box-shadow:
    inset 0 0 6px rgba(0, 255, 255, 0.7),
    0 0 10px rgba(0, 255, 255, 0.5);
}

.daily-quest-completed {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 6px;
  margin-bottom: 0.75rem;
}

.dq-completed-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
  color: #00f7ff;
  border: 1px solid rgba(0, 255, 255, 0.7);
  background: radial-gradient(circle at 0% 0%, rgba(0, 255, 255, 0.18), transparent 55%),
              radial-gradient(circle at 100% 100%, rgba(255, 0, 255, 0.22), transparent 55%),
              rgba(0, 0, 0, 0.7);
  box-shadow:
    0 0 10px rgba(0, 255, 255, 0.5),
    0 0 14px rgba(255, 0, 255, 0.35);
}

/* New stats section */
.dq-stats {
  margin-top: 6px;
  font-size: 0.8rem;
  color: #b0e8ff;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dq-streak {
  color: #ffd27f;
}

.dq-month {
  color: #b0e8ff;
}

.dq-month-flag {
  color: #ffb400;
  font-weight: 600;
}
</style>
