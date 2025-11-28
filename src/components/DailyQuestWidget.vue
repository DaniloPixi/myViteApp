<template>
  <!-- NOT COMPLETED FOR THIS USER: full card -->
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
  </div>

  <!-- COMPLETED FOR THIS USER: minimal pill -->
  <div v-else class="daily-quest-completed">
    <span class="dq-completed-pill">
      Quest completed ✨
    </span>
  </div>
</template>
<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import {
  getOrCreateQuestForDate,
  markQuestCompleted,
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

const parsedDate = computed(() => new Date(props.date));

const formattedDate = computed(() =>
  parsedDate.value.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }),
);

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
  justify-content: center;
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
</style>
