<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>{{ formTitle }}</h3>
      <form @submit.prevent="submitForm" class="plan-form">
        <!-- Text, Date, Location fields remain the same -->
        <div class="form-group">
          <label for="plan-text">What's the plan?</label>
          <input type="text" id="plan-text" v-model="formData.text" required>
        </div>
        <div class="form-group">
          <label for="plan-date">Date</label>
          <input type="date" id="plan-date" v-model="formData.date" :min="today" required>
        </div>

        <!-- UPDATED Time and Duration Group -->
        <div class="form-group">
          <label>Time & Duration</label>
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
          <label for="plan-location">Location</label>
          <input type="text" id="plan-location" v-model="formData.location" required>
        </div>
        <div class="form-group">
          <label>Hashtags</label>
          <div class="hashtag-selection-container">
            <button v-for="tag in availableHashtags" :key="tag" @click.prevent="toggleHashtag(tag)" :class="{ selected: formData.hashtags.includes(tag) }">
              #{{ tag }}
            </button>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="confirm-button" :disabled="isSubmitting">{{ isSubmitting ? 'Saving...' : 'Save' }}</button>
          <button type="button" @click="$emit('close')" class="cancel-button">Cancel</button>
        </div>
        <p v-if="submitError" class="error-message">{{ submitError }}</p>
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  box-sizing: border-box;
  width: min(780px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);

  padding: 2rem 2.2rem 1.2rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.22);

  background:
    radial-gradient(circle at 10% 0%, rgba(255, 0, 255, 0.22), transparent 60%),
    radial-gradient(circle at 90% 100%, rgba(0, 255, 255, 0.22), transparent 55%),
    radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.06), transparent 65%),
    radial-gradient(circle at 50% 50%, rgba(6, 0, 20, 0.96) 0%, rgba(1, 0, 10, 0.98) 55%, rgba(0, 0, 0, 1) 100%);

  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.4),
    inset 0 0 10px rgba(255, 0, 255, 0.5),
    -60px 0 80px -40px rgba(255, 0, 255, 0.5),
    60px 0 80px -40px rgba(0, 255, 255, 0.5);

  overflow-x: hidden;
  overflow-y: hidden;

  animation: plan-modal-glow 4.5s ease-in-out infinite;
}

h3 {
  font-family: 'Great Vibes', cursive;
  color: #ff4fe9;
  text-align: center;
  margin-top: 0;
  margin-bottom: 1.35rem;
  font-size: clamp(2rem, 4.5vw, 3rem);
  text-shadow:
    0 0 10px #ff00ff,
    0 0 18px #00ffff;
}
h3::after {
  content: '';
  display: block;
  height: 1px;
  width: 92%;
  margin: 0.6rem auto 0;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(0, 255, 255, 0) 0%,
    rgba(0, 255, 255, 0.35) 15%,
    rgba(0, 255, 255, 0.7) 30%,
    rgba(255, 0, 255, 0.7) 70%,
    rgba(255, 0, 255, 0.35) 85%,
    rgba(255, 0, 255, 0) 100%
  );
  background-size: 200% 100%;
  box-shadow:
    0 0 8px rgba(0, 255, 255, 0.5),
    0 0 12px rgba(255, 0, 255, 0.5);
  animation: plan-strip-flow 5s linear infinite;
}
.plan-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  width: 100%;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: turquoise;
}

input {
  box-sizing: border-box;
  width: 100%;
  padding: 0.8em 1em;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: #000;
  color: turquoise;
  font-size: 1em;
  box-shadow: inset 0 0 5px rgba(64, 224, 208, 0.5), 0 0 5px rgba(64, 224, 208, 0.5);
  transition: box-shadow 0.3s ease;
}

input:focus {
    outline: none;
    box-shadow: inset 0 0 8px rgba(64, 224, 208, 0.8), 0 0 8px rgba(64, 224, 208, 0.8);
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

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.modal-actions button {
  padding: 0.7em 1.4em;
  border-radius: 30px;
  border: 1px solid;
  font-size: 1.5em;
  cursor: pointer;
  font-family: 'Great Vibes', cursive;
  background-color: black;
  transition: box-shadow 0.3s ease, color 0.3s ease;
}

.confirm-button {
  color: magenta;
  border-color: magenta;
  box-shadow: inset 0 0 8px rgba(255, 0, 255, 0.5), 0 0 8px rgba(255, 0, 255, 0.5);
}

.confirm-button:hover {
  box-shadow: inset 0 0 12px rgba(255, 0, 255, 0.8), 0 0 12px rgba(255, 0, 255, 0.8);
}

.cancel-button {
  color: turquoise;
  border-color: turquoise;
  box-shadow: inset 0 0 8px rgba(64, 224, 208, 0.5), 0 0 8px rgba(64, 224, 208, 0.5);
}

.cancel-button:hover {
    box-shadow: inset 0 0 12px rgba(64, 224, 208, 0.8), 0 0 12px rgba(64, 224, 208, 0.8);
}

.error-message {
  color: #ff6b6b;
  text-align: center;
  margin-top: 1rem;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hashtag-selection-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hashtag-selection-container button {
  background-color: #000;
  color: turquoise;
  border: 1px solid turquoise;
  border-radius: 15px;
  padding: 0.5em 1em;
  cursor: pointer;
  transition: background-color 0.3s, box-shadow 0.3s;
}

.hashtag-selection-container button.selected {
  background-color: turquoise;
  color: #000;
  box-shadow: 0 0 10px turquoise;
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