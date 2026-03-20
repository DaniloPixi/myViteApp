<template>
  <div class="modal-overlay ds-modal-overlay" @click.self="$emit('close')">
    <div class="modal-content ds-modal-surface">
      <h3 class="modal-title ds-modal-title">{{ formTitle }}</h3>
<div class="ds-divider-glow modal-title-divider"></div>
      <form @submit.prevent="submitForm" class="plan-form">
        <!-- Text, Date, Location fields remain the same -->
        <div class="form-group">
          <label class="ds-label" for="plan-text">What's the plan?</label>
          <input
  type="text"
  id="plan-text"
  v-model="formData.text"
  class="ds-input"
  required
>
        </div>
        <div class="form-group">
          <label class="ds-label" for="plan-date">Date</label>
          <input
  type="date"
  id="plan-date"
  v-model="formData.date"
  class="ds-input"
  :min="today"
  required
>
        </div>

        <!-- UPDATED Time and Duration Group -->
        <div class="form-group">
          <label class="ds-label" >Time & Duration</label>
          <div class="time-duration-group">
            <StyledTimeInput v-model="specificTime" />
            <div class="duration-buttons">
              <button @click.prevent="selectDuration('All day')" :class="{ selected: selectedDuration === 'All day' }">All day</button>
              <button @click.prevent="selectDuration('All night')" :class="{ selected: selectedDuration === 'All night' }">All night</button>
              <button @click.prevent="selectDuration('Indetermined')" :class="{ selected: selectedDuration === 'Indetermined' }">∞</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="ds-label" for="plan-location">Location</label>
          <input
  type="text"
  id="plan-location"
  v-model="formData.location"
  class="ds-input"
  required
>
        </div>
        <div class="form-group">
          <label class="ds-label">Hashtags</label>
          <div class="ds-inline-cluster-tight">
  <button
    v-for="tag in availableHashtags"
    :key="tag"
    class="ds-chip"
    :class="{ 'is-selected': formData.hashtags.includes(tag) }"
    @click.prevent="toggleHashtag(tag)"
  >
    #{{ tag }}
  </button>
</div>
        </div>
        <div class="modal-actions ds-modal-actions">
  <button
    type="submit"
    class="ds-modal-action-btn ds-modal-action-btn--confirm"
    :disabled="isSubmitting"
  >
    {{ isSubmitting ? 'Saving...' : 'Save' }}
  </button>

  <button
    type="button"
    @click="$emit('close')"
    class="ds-modal-action-btn ds-modal-action-btn--cancel"
  >
    Cancel
  </button>
</div>
<p v-if="submitError" class="error-message ds-error-text">{{ submitError }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import StyledTimeInput from './StyledTimeInput.vue';

const props = defineProps({ plan: Object, isSubmitting: Boolean, submitError: String });
const emit = defineEmits(['save', 'close']);

const today = new Date().toISOString().split('T')[0];
const availableHashtags = ref(['date', 'party', 'food', '18+', 'travel', 'weekend', 'chill', 'friends', 'love', 'random']);
const DURATION_OPTIONS = ['All day', 'All night', 'Indetermined'];

// Form state
const formData = ref({ text: '', date: '', location: '', hashtags: [] });
const specificTime = ref('');
const selectedDuration = ref('');

const formTitle = computed(() => props.plan ? 'Edit Plan' : 'Create a New Plan');

// Correctly parse incoming plan data for editing
const setFormState = (plan) => {
  if (plan) {
    formData.value = {
      text: plan.text || '',
      date: plan.date || '',
      location: plan.location || '',
      hashtags: plan.hashtags ? plan.hashtags.map(t => t.replace('#', '')) : [],
    };

    const timeString = plan.time || '';
    const timeRegex = /\d{2}:\d{2}/;
    const timeMatch = timeString.match(timeRegex);
    
    specificTime.value = timeMatch ? timeMatch[0] : '';
    selectedDuration.value = DURATION_OPTIONS.find(d => timeString.includes(d)) || '';

  } else {
    // Reset for creation
    formData.value = { text: '', date: '', location: '', hashtags: [] };
    specificTime.value = '';
    selectedDuration.value = '';
  }
};

watch(() => props.plan, setFormState, { immediate: true });

const toggleHashtag = (tag) => {
  const index = formData.value.hashtags.indexOf(tag);
  if (index > -1) formData.value.hashtags.splice(index, 1);
  else if (formData.value.hashtags.length < 3) formData.value.hashtags.push(tag);
};

const selectDuration = (duration) => {
  selectedDuration.value = selectedDuration.value === duration ? '' : duration;
};

// Combine time and duration before saving
const submitForm = () => {
  const timeParts = [];
  if (specificTime.value) timeParts.push(specificTime.value);
  if (selectedDuration.value) timeParts.push(selectedDuration.value);

  const dataToSave = {
    ...formData.value,
    hashtags: formData.value.hashtags.map(tag => `#${tag}`),
    time: timeParts.join(', '), // Combine into one string
  };
  emit('save', dataToSave);
};

</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

.modal-content {
  position: relative;
  overflow-x: hidden;
  overflow-y: hidden;
  animation: plan-modal-glow 4.5s ease-in-out infinite;
}
.modal-title {
  margin: 0;
  text-align: center;
}

.modal-title-divider {
  width: 92%;
  margin: 0.6rem auto 1.35rem;
}
@media (max-width: 480px) {
  .modal-title-divider {
    width: 100%;
  }
}
.plan-form {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.form-group {
  width: 100%;
}

.time-duration-group {
  display: flex;
  align-items: stretch;
  gap: 1rem;
}

.duration-buttons {
  display: flex;
  flex-grow: 1;
  justify-content: center;
  gap: 0.5rem;
}

.duration-buttons button {
  padding: 0.8em 1.1em;
  border-radius: 8px;
  border: 1px solid turquoise;
  background-color: #000;
  color: turquoise;
  cursor: pointer;
  flex-grow: 1;
  transition: background-color 0.3s, box-shadow 0.3s;
}

.duration-buttons button.selected {
  background-color: turquoise;
  color: #000;
  box-shadow: 0 0 10px turquoise;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes plan-modal-glow {
  0%, 100% {
    border-color: rgba(255, 0, 255, 0.32);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.4),
      inset 0 0 10px rgba(255, 0, 255, 0.5),
      -60px 0 80px -40px rgba(255, 0, 255, 0.5),
      60px 0 80px -40px rgba(0, 255, 255, 0.5);
  }
  50% {
    border-color: rgba(0, 255, 255, 0.45);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.4),
      inset 0 0 10px rgba(0, 255, 255, 0.5),
      -70px 0 100px -45px rgba(0, 255, 255, 0.7),
      70px 0 100px -45px rgba(255, 0, 255, 0.7);
  }
}

@keyframes plan-strip-flow {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@media (max-width: 700px) {
  .modal-content {
    width: min(420px, calc(100vw - 1.7rem));
    padding: 1.4rem 1.2rem 0.9rem;
    border-radius: 16px;
  }
}
</style>