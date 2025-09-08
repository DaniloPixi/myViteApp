<template>
  <div class="plans-view">

    <!-- Update Sidebar to handle all filters -->
    <Sidebar 
      v-model:location="locationFilter"
      v-model:hashtags="hashtagFilter"
      v-model:date="dateFilter"
      v-model:time="timeFilter"
      :available-hashtags="availableHashtags"
    />

    <!-- Plan Display List -->
    <section class="plan-list-section">
      <h1>Your Upcoming Plans</h1>
      <div v-if="isLoading" class="loading-state">
        <p>Loading plans...</p>
      </div>
      <div v-else-if="fetchError" class="error-message">
        <p>{{ fetchError }}</p>
      </div>
      <div v-else-if="plans.length === 0" class="empty-state">
        <p>No plans yet. Let's create one!</p>
      </div>
      <div v-else-if="filteredPlans.length === 0" class="empty-state">
        <p>No plans match your current filters.</p>
      </div>
      <div v-else class="plan-cards-container">
        <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card">
          <button @click="promptDelete(plan.id)" class="delete-button">×</button>
          <h3>{{ plan.text }}</h3>
          <p class="plan-detail"><strong>Date:</strong> {{ formatDate(plan.date) }}</p>
          <p v-if="plan.time" class="plan-detail"><strong>Time:</strong> {{ formatTime(plan.time) }}</p>
          <p class="plan-detail"><strong>Location:</strong> {{ plan.location }}</p>
          <div v-if="plan.hashtags && plan.hashtags.length" class="hashtags-container">
            <span v-for="tag in plan.hashtags" :key="tag" class="hashtag">{{ tag }}</span>
          </div>
          <p class="creator-info">Created by: {{ plan.createdBy }}</p>
        </div>
      </div>
    </section>

    <!-- Collapsible Plan Creation Form -->
    <section class="add-plan-section">
      <button v-if="!isFormVisible" @click="isFormVisible = true" class="add-plan-button">
        {{ dynamicTitle }}
      </button>

      <div v-if="isFormVisible" class="plan-form-container">
        <h2>{{ dynamicTitle }}</h2>
        <form @submit.prevent="handleSubmit" class="plan-form">
          <div class="form-group">
            <label for="plan-text">What's the plan?</label>
            <input type="text" id="plan-text" v-model="planText" placeholder="whatever you want" required>
          </div>
          <div class="form-group">
            <label for="plan-date">Date</label>
            <input type="date" id="plan-date" v-model="planDate" :min="today" required>
          </div>
          
          <div class="form-group">
            <div class="time-duration-group">
              <input type="time" id="plan-time" v-model="specificTime">
              <div class="duration-buttons">
                <button @click.prevent="selectDuration('All day')" :class="{ selected: selectedDuration === 'All day' }">All day</button>
                <button @click.prevent="selectDuration('All night')" :class="{ selected: selectedDuration === 'All night' }">All night</button>
                <button @click.prevent="selectDuration('Indetermined')" :class="{ selected: selectedDuration === 'Indetermined' }">Indetermined</button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="plan-location">Location</label>
            <input type="text" id="plan-location" v-model="planLocation" placeholder="" required>
          </div>

          <div class="form-group">
            <label>Hashtags (up to 3)</label>
            <div class="hashtag-selection-container">
              <button v-for="tag in availableHashtags" :key="tag" @click.prevent="toggleHashtag(tag)" :class="{ selected: selectedHashtags.includes(tag) }">
                #{{ tag }}
              </button>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" :disabled="isSubmitting">{{ isSubmitting ? 'Saving...' : 'Save Plan' }}</button>
            <button type="button" @click="isFormVisible = false" class="cancel-button">Cancel</button>
          </div>
          <p v-if="submitError" class="error-message">{{ submitError }}</p>
        </form>
      </div>
    </section>

    <ConfirmDeleteModal
      v-if="isModalVisible"
      title="Confirm Deletion"
      message="Are you sure you want to delete this plan? This action cannot be undone."
      @confirm="handleDelete"
      @close="isModalVisible = false"
    />

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { db } from '../firebase'; // Import Firestore database instance
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import Sidebar from '../components/Sidebar.vue';

const props = defineProps({ user: { type: Object, required: true } });

// --- Form State ---
const isFormVisible = ref(false);
const planText = ref('');
const planDate = ref('');
const planLocation = ref('');
const availableHashtags = ref(['date', 'party', 'food', '18+', 'travel', 'weekend', 'chill', 'friends', 'love', 'random']);
const selectedHashtags = ref([]);
const specificTime = ref('');
const selectedDuration = ref('');
const isSubmitting = ref(false);
const submitError = ref('');
const today = new Date().toISOString().split('T')[0];

const toggleHashtag = (tag) => {
  const index = selectedHashtags.value.indexOf(tag);
  if (index > -1) {
    selectedHashtags.value.splice(index, 1);
  } else if (selectedHashtags.value.length < 3) {
    selectedHashtags.value.push(tag);
  }
};

const selectDuration = (duration) => {
  selectedDuration.value = selectedDuration.value === duration ? '' : duration;
};

// --- Plan List State ---
const plans = ref([]);
const isLoading = ref(true);
const fetchError = ref('');
let unsubscribeFromPlans = null;

// --- Filter State ---
const locationFilter = ref('');
const hashtagFilter = ref('');
const dateFilter = ref('');
const timeFilter = ref('');

const filteredPlans = computed(() => {
  return plans.value.filter(plan => {
    const locationMatch = !locationFilter.value || plan.location.toLowerCase().includes(locationFilter.value.toLowerCase());
    const hashtagMatch = !hashtagFilter.value || (plan.hashtags && plan.hashtags.some(tag => tag.toLowerCase().includes(hashtagFilter.value.toLowerCase())));
    const dateMatch = !dateFilter.value || plan.date === dateFilter.value;
    // Note: Time filtering logic might need adjustments based on the new real-time data structure
    return locationMatch && hashtagMatch && dateMatch;
  });
});

// --- Modal State ---
const isModalVisible = ref(false);
const planToDeleteId = ref(null);
const dynamicTitle = ref('');

// --- Firestore Real-time Logic ---
onMounted(() => {
  const titles = ["What's on that beautiful mind ?", "What do you want to do with me ?"];
  dynamicTitle.value = titles[Math.floor(Math.random() * titles.length)];
  
  isLoading.value = true;
  const plansQuery = query(collection(db, 'plans'), orderBy('createdAt', 'desc'));

  unsubscribeFromPlans = onSnapshot(plansQuery, (snapshot) => {
    plans.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure hashtags is always an array
      hashtags: doc.data().hashtags || [],
    }));
    isLoading.value = false;
  }, (error) => {
    console.error("Error fetching plans:", error);
    fetchError.value = 'Could not load plans. Please try again later.';
    isLoading.value = false;
  });
});

onUnmounted(() => {
  if (unsubscribeFromPlans) {
    unsubscribeFromPlans();
  }
});

// --- Form Submission Logic ---
const handleSubmit = async () => {
  if (!planText.value || !planDate.value || !planLocation.value) {
    submitError.value = "Please fill out all required fields.";
    return;
  }
  isSubmitting.value = true;
  submitError.value = '';
  try {
    const timeParts = [];
    if (specificTime.value) timeParts.push(specificTime.value);
    if (selectedDuration.value) timeParts.push(selectedDuration.value);
    const timeValue = timeParts.join(', ');

    await addDoc(collection(db, 'plans'), {
      text: planText.value,
      date: planDate.value,
      time: timeValue,
      location: planLocation.value,
      hashtags: selectedHashtags.value.map(tag => `#${tag}`),
      creatorUid: props.user.uid,
      createdBy: props.user.displayName || props.user.email,
      createdAt: new Date().toISOString(),
    });

    // Reset form fields
    planText.value = '';
    planDate.value = '';
    specificTime.value = '';
    selectedDuration.value = '';
    planLocation.value = '';
    selectedHashtags.value = [];
    isFormVisible.value = false;

  } catch (error) {
    console.error("Error saving plan:", error);
    submitError.value = `Failed to save plan: ${error.message}`;
  } finally {
    isSubmitting.value = false;
  }
};

// --- Delete Plan Logic ---
const promptDelete = (planId) => {
  planToDeleteId.value = planId;
  isModalVisible.value = true;
};

const handleDelete = async () => {
  if (!planToDeleteId.value) return;
  try {
    await deleteDoc(doc(db, 'plans', planToDeleteId.value));
  } catch (error) {
    console.error("Error deleting plan:", error);
    alert("Could not delete the plan. Please try again.");
  } finally {
    isModalVisible.value = false;
    planToDeleteId.value = null;
  }
};

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString(undefined, options);
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  const parts = timeString.split(', ');
  const timePart = parts.find(p => /^\d{2}:\d{2}$/.test(p));
  const durationPart = parts.find(p => ['All day', 'All night', 'Indetermined'].includes(p));
  let formattedTime = '';
  if (timePart) {
    const [hours, minutes] = timePart.split(':');
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    formattedTime = date.toLocaleTimeString(navigator.language, { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return [formattedTime, durationPart].filter(Boolean).join(', ') || timeString;
};

</script>

<style scoped>
/* Existing styles remain unchanged */
.plans-view {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

h1, h2 {
  color: #42b883;
  text-align: center;
  margin-bottom: 2rem;
}

.plan-list-section, .add-plan-section {
  margin-bottom: 2.5rem;
}

.add-plan-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.add-plan-button {
  padding: 0.7em 1.4em;
  border-radius: 30px;
  border: none;
  background-color: #42b883;
  color: white;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-plan-button:hover {
  background-color: #368f6a;
}

.plan-form-container {
  margin-top: 2rem;
  padding: 2rem;
  background: #1e1e1e;
  border-radius: 12px;
  border: 1px solid #444;
  width: 100%;
}

.plan-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  width: 90%;
  margin: 0 auto;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
}

input {
  box-sizing: border-box;
  width: 100%;
  padding: 0.8em 1em;
  border-radius: 8px;
  border: 1px solid #444;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 1em;
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
  border: 1px solid #444;
  background-color: #333;
  color: #fff;
  cursor: pointer;
  transition: background-color 0.3s, border-color 0.3s;
}

.duration-buttons button:hover {
  background-color: #555;
}

.duration-buttons button.selected {
  background-color: #42b883;
  border-color: #42b883;
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  width: 90%;
  margin-left: auto;
  margin-right: auto;
}

.form-actions button {
  flex-grow: 1;
  padding: 0.7em 1.1em;
  font-size: 1em;
  font-weight: 600;
  border-radius: 30px;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s, opacity 0.3s;
}

.form-actions .cancel-button {
  background-color: #555;
}

.form-actions .cancel-button:hover {
  background-color: #666;
}

.form-actions button[type="submit"] {
  background-color: #42b883;
  color: white;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message, .loading-state, .empty-state {
  text-align: center;
  margin-top: 1rem;
  color: #aaa;
}

.error-message { color: #ff6b6b; }

.plan-cards-container {
  display: grid;
  gap: 1.5rem;
}

.plan-card {
  position: relative;
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 1.5rem;
  padding-bottom: 2.5rem; 
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s, box-shadow 0.2s;
}

.delete-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #444;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, background-color 0.2s;
}

.delete-button:hover {
  background-color: #ff6b6b;
  opacity: 1;
}

.plan-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.plan-card h3 {
  margin: 0 0 1rem 0;
  color: #42b883;
  font-size: 1.4em;
}

.plan-card .plan-detail {
  margin: 0.5rem 0;
  color: #ccc;
}

.plan-detail strong {
  color: #888;
}

.creator-info {
  position: absolute;
  bottom: 10px;
  right: 1.5rem;
  font-size: 0.8em;
  color: #888;
}

.hashtags-container {
  margin-top: 1rem;
  padding-bottom: 10px; 
}

.hashtag {
  display: inline-block;
  background-color: #333;
  color: #42b883;
  padding: 0.3em 0.7em;
  border-radius: 15px;
  font-size: 0.85em;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

.hashtag-selection-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.hashtag-selection-container button {
  padding: 0.5em 1em;
  border-radius: 20px;
  border: 1px solid #444;
  background-color: #333;
  color: #fff;
  cursor: pointer;
  transition: background-color 0.3s, border-color 0.3s;
}

.hashtag-selection-container button:hover {
  background-color: #555;
}

.hashtag-selection-container button.selected {
  background-color: #42b883;
  border-color: #42b883;
  font-weight: 600;
}

</style>
