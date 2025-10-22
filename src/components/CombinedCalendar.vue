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
          <span class="day-label">{{ day.day }}</span>
        </div>
      </template>
    </Calendar>

    <!-- Centered Modal with Animation -->
    <Transition name="modal">
        <div v-if="isModalVisible" class="modal-overlay" @click="closeModal">
            <div class="modal-content" @click.stop :style="modalStyle">
                <button @click="closeModal" class="close-button">&times;</button>
                <div v-for="attr in modalAttributes" :key="attr.key">
                    <p :class="attr.customData.type === 'memo' ? 'memo-text' : 'plan-text'">
                        <span class="event-title">{{ attr.customData.type === 'memo' ? 'Memo: ' : 'Plan: ' }}</span>
                        {{ attr.customData.text }}
                    </p>
                </div>
            </div>
        </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Calendar } from 'v-calendar';

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
  const memoEvents = props.memos.map(memo => {
    const date = processDate(memo.date);
    if (!date) return null;
    return { key: `memo-${memo.id}`, dates: date, dot: { color: 'magenta', class: 'memo-dot' }, customData: { type: 'memo', text: memo.description || 'Memo' } };
  }).filter(Boolean);

  const planEvents = props.plans.map(plan => {
    const date = processDate(plan.date);
    if (!date) return null;
    return { key: `plan-${plan.id}`, dates: date, dot: { color: 'turquoise', class: 'plan-dot' }, customData: { type: 'plan', text: plan.text || 'Plan' } };
  }).filter(Boolean);

  return [...memoEvents, ...planEvents];
});
</script>

<style>
/* --- Calendar Styles (Unchanged) --- */
.custom-calendar.vc-container { --vc-bg: #000; --vc-content-color: #FFF; --vc-border: 1px solid magenta; --vc-font-family: 'Arial', sans-serif; --vc-title-color: magenta; --vc-weekday-color: turquoise; --vc-nav-color: magenta; border-radius: 12px; box-shadow: 0 0 25px rgba(255, 0, 255, 0.4); width: 100%; }
.custom-calendar .vc-header .vc-title { font-family: 'Great Vibes', cursive; font-size: 2.2em; text-shadow: 0 0 10px magenta; }
.custom-calendar .vc-weekday { font-weight: 600; }
.custom-day-content { width: 100%; height: 100%; cursor: pointer; }
.day-label { color: #FFD700; font-family: 'Great Vibes', cursive; font-style: italic; font-size: 1.2em; }
.custom-calendar .vc-dots { gap: 4px; }
.custom-calendar .vc-dot.memo-dot { background: magenta !important; }
.custom-calendar .vc-dot.plan-dot { background: turquoise !important; }

/* --- Modal Base Styles (No Transitions Here) --- */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); backdrop-filter: blur(2px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: #1a1a1a; border: 1px solid magenta; border-radius: 12px; padding: 20px 25px; width: 90%; max-width: 500px; box-shadow: 0 0 25px rgba(255, 0, 255, 0.5); position: relative; font-family: 'Arial', sans-serif; }
.close-button { position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: white; font-size: 24px; cursor: pointer; }
.modal-content p { margin: 8px 0; }
.modal-content .event-title { font-weight: bold; }
.modal-content .memo-text { color: magenta; }
.modal-content .plan-text { color: turquoise; }

/* --- SLOWER ANIMATION --- */

/* Set transition properties ONLY on the active classes */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.6s ease-in-out; /* Slower fade */
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.55, 1.25); /* Slower transform */
}

/* Set the start state for enter and end state for leave */
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.1);
}
</style>