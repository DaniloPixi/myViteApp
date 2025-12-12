<template>
  <div class="calendar-container">
    <!-- The Calendar Component -->
    <Calendar
      is-dark
      :attributes="attributes"
      view="monthly"
      title-position="left"
      :is-expanded="true"
      class="custom-calendar"
    >
      <template #day-content="{ day, attributes }">
        <div class="custom-day-content" @click="openModal(attributes, $event)">
          <!-- day number -->
          <span class="day-label">{{ day.day }}</span>

          <!-- quest bars: ONLY if that user's quest is completed -->
          <div
            class="quest-bar quest-bar-left"
            v-if="attributes.some(a =>
              a.customData?.type === 'quest' &&
              a.customData.side === 'left' &&
              a.customData.completed
            )"
          ></div>

          <div
            class="quest-bar quest-bar-right"
            v-if="attributes.some(a =>
              a.customData?.type === 'quest' &&
              a.customData.side === 'right' &&
              a.customData.completed
            )"
          ></div>

          <!-- custom dots row for memos & plans -->
          <div class="custom-day-dots">
            <span
              v-for="(attr, idx) in attributes.filter(a =>
                a.customData?.type === 'memo' ||
                a.customData?.type === 'plan'
              )"
              :key="idx"
              class="custom-day-dot"
              :class="[
                attr.customData.type === 'memo' ? 'memo-dot' : 'plan-dot'
              ]"
            ></span>
          </div>
        </div>
      </template>
    </Calendar>

    <!-- Centered Modal with Animation -->
    <Transition name="modal">
      <div
        v-if="isModalVisible"
        class="modal-overlay"
        @click="closeModal"
      >
        <div
          class="modal-content"
          @click.stop
          :style="modalStyle"
        >
          <button @click="closeModal" class="close-button">&times;</button>

          <div v-for="attr in modalAttributes" :key="attr.key">
            <!-- MEMO -->
            <p
              v-if="attr.customData && attr.customData.type === 'memo'"
              class="memo-text"
            >
              <span class="event-title">Memo: </span>
              {{ attr.customData.text }}
            </p>

            <!-- PLAN -->
            <p
              v-else-if="attr.customData && attr.customData.type === 'plan'"
              class="plan-text"
            >
              <span class="event-title">Plan: </span>
              {{ attr.customData.text }}
            </p>

            <!-- QUEST -->
            <div
              v-else-if="attr.customData && attr.customData.type === 'quest'"
              class="quest-block"
            >
              <p class="quest-meta">
                Quest –
                {{ attr.customData.userName || 'Unknown' }}
                –
                <span class="quest-status">
  {{ questStatusFor(attr.customData) }}
</span>
              </p>
              <p class="quest-text">
                {{ attr.customData.text }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>


<script setup>
import { ref, computed } from 'vue';
import { Calendar } from 'v-calendar';
import { questVersion,
  getQuestsForCalendar, } from '../composables/useDailyQuests';
const props = defineProps({
  memos: { type: Array, default: () => [] },
  plans: { type: Array, default: () => [] },
});

// --- Modal State & Animation ---
const isModalVisible = ref(false);
const modalAttributes = ref([]);
const animOrigin = ref('center'); // Default to center

const modalStyle = computed(() => ({
  transformOrigin: animOrigin.value,
}));

function openModal(attributes, event) {
  const eventAttrs = attributes.filter(attr => attr.customData);
  if (eventAttrs.length > 0) {
    modalAttributes.value = eventAttrs;
    animOrigin.value = `${event.clientX}px ${event.clientY}px`;
    isModalVisible.value = true;
  }
}

function closeModal() {
  isModalVisible.value = false;
}

// --- Data Processing ---
const processDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  if (typeof value === 'string' && !value.includes('T')) {
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + timezoneOffset);
  }
  return date;
};
const attributes = computed(() => {
  // Make this computed reactive to quest changes
  const _ = questVersion.value;

  // memos
  const memoEvents = props.memos
    .map((memo) => {
      const date = processDate(memo.date);
      if (!date) return null;
      return {
        key: `memo-${memo.id}`,
        dates: date,
        dot: { color: 'magenta', class: 'memo-dot' },
        customData: {
          type: 'memo',
          text: memo.description || 'Memo',
        },
      };
    })
    .filter(Boolean);

  // plans
  const planEvents = props.plans
    .map((plan) => {
      const date = processDate(plan.date);
      if (!date) return null;
      return {
        key: `plan-${plan.id}`,
        dates: date,
        dot: { color: 'turquoise', class: 'plan-dot' },
        customData: {
          type: 'plan',
          text: plan.text || 'Plan',
        },
      };
    })
    .filter(Boolean);

  // quests
  questVersion.value; // force recompute when quests change

  const allQuests = getQuestsForCalendar() || [];

  const questsByDate = allQuests
    .filter((q) => q.date) // date is "YYYY-MM-DD"
    .reduce((acc, q) => {
      const key = q.date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(q);
      return acc;
    }, {});

  const questAttrs = [];

  Object.entries(questsByDate).forEach(([dateStr, questList]) => {
    // at most 2 for your couple
    questList.slice(0, 2).forEach((q, idx) => {
      const side = idx === 0 ? 'left' : 'right';
      questAttrs.push({
  key: `quest-${dateStr}-${q.userId}`,
  dates: dateStr,
  customData: {
    type: 'quest',
    side,
    userId: q.userId,
    userName: q.userName,
    text: q.text || '',
    completed: !!q.completed,
    date: dateStr, // <-- needed for status logic
  },
      });
    });
  });

  return [...memoEvents, ...planEvents, ...questAttrs];
});
// Helper to format quest status based on date + completion
function questStatusFor(customData) {
  if (!customData) return '';

  if (customData.completed) return 'completed';

  const dateStr = customData.date; // we’ll make sure this exists in attributes
  if (!dateStr) return 'not completed';

  // today as YYYY-MM-DD in local time
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayKey = `${y}-${m}-${d}`;

  // dates are stored as YYYY-MM-DD → string comparison works
  if (dateStr < todayKey) {
    return 'failed';
  }

  return 'not completed';
}


</script>

<style>
/* --- Keyframes for Calendar Glow Animation --- */
@keyframes pulse-calendar-glow {
  0%, 100% {
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.40),
      inset 0 0 10px rgba(255, 0, 255, 0.45),
      -50px 0px 80px -30px rgba(255, 0, 255, 0.45),
       50px 0px 80px -30px rgba(0, 255, 255, 0.45);
  }

  12.5% {
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.40),
      inset 0 0 10px rgba(220, 40, 255, 0.48),
      -53px 0px 84px -32px rgba(220, 40, 255, 0.48),
       53px 0px 84px -32px rgba(40, 220, 255, 0.48);
  }

  25% {
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.40),
      inset 0 0 10px rgba(140, 120, 255, 0.50),
      -56px 0px 88px -34px rgba(140, 120, 255, 0.52),
       56px 0px 88px -34px rgba(120, 255, 255, 0.50);
  }

  37.5% {
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.40),
      inset 0 0 10px rgba(60, 210, 255, 0.52),
      -58px 0px 92px -36px rgba(60, 210, 255, 0.60),
       58px 0px 92px -36px rgba(255, 60, 235, 0.56);
  }

  50% {
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.40),
      inset 0 0 10px rgba(0, 255, 255, 0.52),
      -60px 0px 95px -38px rgba(0, 255, 255, 0.70),
       60px 0px 95px -38px rgba(255, 0, 255, 0.70);
  }

  62.5% {
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.40),
      inset 0 0 10px rgba(60, 210, 255, 0.52),
      -58px 0px 92px -36px rgba(0, 255, 255, 0.58),
       58px 0px 92px -36px rgba(255, 80, 230, 0.62);
  }

  75% {
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.40),
      inset 0 0 10px rgba(140, 120, 255, 0.50),
      -56px 0px 88px -34px rgba(255, 70, 235, 0.52),
       56px 0px 88px -34px rgba(70, 235, 255, 0.52);
  }

  87.5% {
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.40),
      inset 0 0 10px rgba(220, 40, 255, 0.48),
      -53px 0px 84px -32px rgba(255, 35, 245, 0.48),
       53px 0px 84px -32px rgba(35, 245, 255, 0.48);
  }
}



/* --- Calendar Styles (Unchanged) --- */
.custom-calendar.vc-container { 
  --vc-bg: #000;  
  --vc-font-family: 'Arial', sans-serif; 
  --vc-title-color: magenta; 
  --vc-weekday-color: turquoise; 
  --vc-nav-color: rgb(202, 103, 10); 
  --vc-border-width: 0;
  border:none !important;
  border-radius: 20px; 
  /* Initial state shadow matches the 0% keyframe */
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.4),
              inset 0 0 10px rgba(255, 0, 255, 0.5),
              -50px 0px 60px -40px rgba(255, 0, 255, 0.5),
              50px 0px 60px -40px rgba(0, 255, 255, 0.5);
  width: 100%;
  outline: none !important;
  animation: pulse-calendar-glow 8s infinite ease-in-out;
}

.custom-calendar .vc-header .vc-title { font-family: 'Great Vibes', cursive;padding-top:0.4rem; font-size: 2em;background-color: rgba(0, 0, 0, 0);color:rgb(236, 5, 148); text-shadow: 0 0 10px magenta; }
.custom-calendar .vc-weekday { font-weight: 600; }
.custom-day-content { width: 100%; height: 100%; cursor: pointer; }
.day-label { color: #dbb406; font-family: 'Great Vibes', cursive; font-style: italic; font-size: 1.2em; }
.custom-calendar .vc-dots { display:none }
.custom-calendar .vc-dot.memo-dot { background: magenta !important; }
.custom-calendar .vc-dot.plan-dot { background: turquoise !important; }
--vc-nav-container { background-color: transparent; }

/* --- Nav Arrow Styles --- */
.custom-calendar .vc-arrow {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 50%  !important;
  width: 32px;
  height: 32px;
  color: magenta !important;
  transition: all 0.3s ease;
}

.custom-calendar .vc-arrow:hover {
  color: turquoise !important;
  background: transparent !important;
  box-shadow: 0 0 12px turquoise;
}

/* --- Modal Base Styles (No Transitions Here) --- */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); backdrop-filter: blur(2px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: #00000050; border: 1px solid magenta; border-radius: 12px; padding: 20px 25px; width: 90%; max-width: 500px; box-shadow: 0 0 25px rgba(255, 0, 255, 0.5); position: relative; font-family: 'Arial', sans-serif; }
.close-button { position: absolute; top: -0.8rem; right: -1rem; background: transparent; border: none; color: rgb(7, 208, 243); font-size: 24px; cursor: pointer; }
.modal-content p { margin: 8px 0; }
.modal-content .event-title { font-weight: bold; }
.modal-content .memo-text { color: magenta; }
.modal-content .plan-text { color: turquoise; }

/* --- SLOWER ANIMATION --- */

/* --- GALACTIC MODAL SPAWN (INTENSIFIED) --- */

/* overlay fade */
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-content .quest-text {
  color: gold;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.45s ease-in-out;
}

/* starry halo behind the modal */
.modal-content::before {
  content: "";
  position: absolute;
  inset: -45%;
  background:
    radial-gradient(circle at 15% 5%, rgba(0, 255, 255, 0.6), transparent 60%),
    radial-gradient(circle at 85% 95%, rgba(255, 0, 255, 0.6), transparent 60%),
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.45), transparent 55%);
  opacity: 0;
  filter: blur(22px);
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: -1;
}

/* core warp-in / warp-out for the modal panel */
@keyframes modal-warp-in {
  0% {
    transform: scale(0.12) rotate3d(0.5, -0.35, 0, -38deg);
    filter: blur(22px);
    box-shadow:
      0 0 0 rgba(255, 0, 255, 0),
      0 0 0 rgba(0, 255, 255, 0);
  }
  55% {
    transform: scale(1.12) rotate3d(0.18, -0.12, 0, 10deg);
    filter: blur(6px);
    box-shadow:
      0 0 45px rgba(255, 0, 255, 0.9),
      0 0 80px rgba(0, 255, 255, 0.7);
  }
  100% {
    transform: scale(1) rotate3d(0, 0, 0, 0deg);
    filter: blur(0);
    box-shadow:
      0 0 26px rgba(255, 0, 255, 0.55),
      0 0 40px rgba(0, 255, 255, 0.35);
  }
}

@keyframes modal-warp-out {
  0% {
    transform: scale(1) rotate3d(0, 0, 0, 0deg);
    filter: blur(0);
    box-shadow:
      0 0 26px rgba(255, 0, 255, 0.55),
      0 0 40px rgba(0, 255, 255, 0.35);
  }
  100% {
    transform: scale(0.65) rotate3d(-0.3, 0.25, 0, -20deg);
    filter: blur(16px);
    box-shadow:
      0 0 4px rgba(255, 0, 255, 0),
      0 0 8px rgba(0, 255, 255, 0);
  }
}

/* halo fade/settle animation */
@keyframes fade-halo-in {
  0%   { opacity: 0; transform: scale(0.7); }
  50%  { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0.65; transform: scale(1); }
}

@keyframes fade-halo-out {
  0%   { opacity: 0.65; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.85); }
}

/* hook animations into Vue's transition classes */
.modal-enter-active .modal-content {
  animation: modal-warp-in 0.6s cubic-bezier(0.25, 0.85, 0.5, 1.4) forwards;
}

.modal-leave-active .modal-content {
  animation: modal-warp-out 0.4s ease-in forwards;
}

.modal-enter-active .modal-content::before {
  animation: fade-halo-in 0.7s ease-out forwards;
}

.modal-leave-active .modal-content::before {
  animation: fade-halo-out 0.35s ease-in forwards;
}
.custom-calendar .vc-dot.quest-dot {
  background: radial-gradient(circle, gold, #ffb400) !important;
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.9);
}
/* Make sure the custom day content can position stuff */
.custom-day-content {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

/* The day number you already had */
.day-label {
  color: #dbb406;
  font-family: 'Great Vibes', cursive;
  font-style: italic;
  font-size: 1.2em;
  position: relative;
  z-index: 1;
}

/* Row of dots below the number */
.custom-day-dots {
  display: flex;
  gap: 4px;
  margin-top: 2px;
  z-index: 1;
}

.custom-day-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* Reuse your colors */
.custom-day-dot.memo-dot {
  background: magenta;
  box-shadow: 0 0 4px rgba(255, 0, 255, 0.9);
}

.custom-day-dot.plan-dot {
  background: turquoise;
  box-shadow: 0 0 4px rgba(0, 255, 255, 0.9);
}

/* Quest vertical bars, anchored to the sides of the day cell */
.quest-bar {
  position: absolute;
  top: 3px;
  bottom: 3px;
  width: 3px;
  border-radius: 999px;
  opacity: 0.95;
  z-index: 0;
}

/* Left bar – magenta */
.quest-bar-left {
  left: 3px;
  background: linear-gradient(to bottom, magenta, rgba(255, 0, 255, 0.4));
  box-shadow: 0 0 6px rgba(255, 0, 255, 0.7);
}

/* Right bar – cyan */
.quest-bar-right {
  right: 3px;
  background: linear-gradient(to bottom, cyan, rgba(0, 255, 255, 0.4));
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.7);
}
/* Quest entries in the modal */
.modal-content .quest-block {
  margin-top: 10px;
  margin-bottom: 8px;
}

.modal-content .quest-meta {
  color: gold;
  font-weight: 600;
  font-size: 0.95rem;
}

.modal-content .quest-status {
  text-transform: lowercase;
}

.modal-content .quest-text {
  margin-top: 2px;
  color: gold;
  font-size: 0.9rem;
  font-style: italic;
  opacity: 0.9;
}

</style>