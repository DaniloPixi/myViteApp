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
            <input type="time" id="plan-time" v-model="specificTime">
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #000;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid magenta;
  box-shadow: 0 0 25px rgba(255, 0, 255, 0.4);
  max-width: 500px;
  width: 90%;
}

h3 {
  font-family: 'Great Vibes', cursive;
  color: magenta;
  text-align: center;
  margin-top: 0;
  margin-bottom: 2rem;
  font-size: 3em;
  text-shadow: 0 0 10px magenta;
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

.time-duration-group input[type="time"] {
  flex-basis: 150px;
  flex-grow: 0;
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
</style>