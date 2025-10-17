<template>
  <div class="plans-view">

    <!-- Create Plan Button -->
    <section class="create-plan-button-section">
      <button @click="openCreateModal" class="add-plan-button">
        {{ createButtonTitle }}
      </button>
    </section>

    <!-- Plan Display List -->
    <section class="plan-list-section">
      <h1>Our Upcoming Plans</h1>
      <div v-if="isLoading" class="loading-state"><p>Loading plans...</p></div>
      <div v-else-if="fetchError" class="error-message"><p>{{ fetchError }}</p></div>
      <div v-else-if="!plans.length" class="empty-state"><p>No plans yet. Let's create one!</p></div>
      <div v-else-if="!filteredPlans.length" class="empty-state"><p>No plans match your current filters.</p></div>
      <div v-else class="plan-cards-container">
        <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card">
          <div class="card-header">
            <h3>{{ plan.text }}</h3>
          </div>
          <p class="plan-detail"><strong>Date:</strong> {{ formatDate(plan.date) }}</p>
          <p v-if="plan.time" class="plan-detail"><strong>Time:</strong> {{ formatTime(plan.time) }}</p>
          <p class="plan-detail"><strong>Location:</strong> {{ plan.location }}</p>
          <div v-if="plan.hashtags && plan.hashtags.length" class="hashtags-container">
            <span v-for="tag in plan.hashtags" :key="tag" class="hashtag">{{ tag }}</span>
          </div>
          <div class="card-footer">
            <p class="creator-info">By: {{ plan.createdBy }}</p>
            <div class="card-actions">
                <button @click="openEditModal(plan)" class="edit-button">edit</button>
                <button @click="promptDelete(plan.id)" class="delete-button">delete</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Modals -->
    <PlanFormModal
      v-if="isFormModalVisible"
      :plan="editingPlan"
      :is-submitting="isSubmitting"
      :submit-error="submitError"
      @close="closeFormModal"
      @save="handleSave"
    />

    <ConfirmDeleteModal
      v-if="isDeleteModalVisible"
      title="Confirm Deletion"
      message="Are you sure you want to delete this plan? This action cannot be undone."
      @confirm="handleDelete"
      @close="isDeleteModalVisible = false"
    />

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import PlanFormModal from '../components/PlanFormModal.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';

// --- PROPS ---
const props = defineProps({
  user: { type: Object, required: true },
  locationFilter: { type: String, default: '' },
  hashtagFilter: { type: String, default: '' },
  dateFilter: { type: String, default: '' },
  timeFilter: { type: String, default: '' },
  durationFilter: { type: Array, default: () => [] },
});

// --- STATE ---
const plans = ref([]);
const isLoading = ref(true);
const fetchError = ref('');
const isSubmitting = ref(false);
const submitError = ref('');

// Modal State
const isFormModalVisible = ref(false);
const editingPlan = ref(null);
const isDeleteModalVisible = ref(false);
const planToDeleteId = ref(null);

// Static Data
const createButtonTitle = ref('');
let unsubscribeFromPlans = null;

// --- COMPUTED PROPERTIES ---
const filteredPlans = computed(() => {
  return plans.value.filter(plan => {
    const locationMatch = !props.locationFilter || plan.location.toLowerCase().includes(props.locationFilter.toLowerCase());
    const hashtagMatch = !props.hashtagFilter || (plan.hashtags && plan.hashtags.some(tag => tag.toLowerCase().includes(props.hashtagFilter.toLowerCase())));
    const dateMatch = !props.dateFilter || plan.date === props.dateFilter;
    
    const durationMatch = props.durationFilter.length === 0 || (plan.time && props.durationFilter.some(d => plan.time.includes(d)));

    const timeMatch = (() => {
      if (!props.timeFilter) return true;
      if (!plan.time) return false;
      const timeRegex = /\d{2}:\d{2}/;
      const match = plan.time.match(timeRegex);
      if (!match) return false;
      const planHour = parseInt(match[0].split(':')[0], 10);
      const filterHour = parseInt(props.timeFilter, 10);
      return planHour === filterHour;
    })();

    return locationMatch && hashtagMatch && dateMatch && timeMatch && durationMatch;
  });
});

// --- API HELPER ---
const getAuthToken = async () => {
  if (!props.user) throw new Error("User not authenticated");
  return await props.user.getIdToken(true);
};

// --- FIRESTORE REAL-TIME LISTENER ---
const subscribeToPlans = () => {
  if (unsubscribeFromPlans) unsubscribeFromPlans(); // Unsubscribe from any previous listener

  if (!props.user) return;

  try {
    const db = getFirestore();
    const plansQuery = query(collection(db, 'plans'), orderBy('date', 'desc'));

    unsubscribeFromPlans = onSnapshot(plansQuery, (snapshot) => {
      plans.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      isLoading.value = false;
    }, (error) => {
      console.error("Error fetching plans in real-time:", error);
      fetchError.value = "Failed to load plans. Please check your connection and try again.";
      isLoading.value = false;
    });
  } catch (error) {
    console.error("Error setting up plans subscription:", error);
    fetchError.value = "An unexpected error occurred. Please refresh the page.";
    isLoading.value = false;
  }
};


// --- API CALLS (for write operations) ---
const handleSave = async (planData) => {
  isSubmitting.value = true;
  submitError.value = '';

  try {
    const token = await getAuthToken();
    const method = editingPlan.value ? 'PUT' : 'POST';
    const url = editingPlan.value ? `/api/plans/${editingPlan.value.id}` : '/api/plans';

    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(planData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.message || 'Failed to save the plan');
    }

    closeFormModal();

  } catch (error) {
    submitError.value = `Error: ${error.message}`;
  } finally {
    isSubmitting.value = false;
  }
};

const handleDelete = async () => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`/api/plans/${planToDeleteId.value}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete plan');
  } catch (error) {
    console.error("Error deleting plan:", error);
  } finally {
    isDeleteModalVisible.value = false;
  }
};

// --- MODAL HANDLING ---
const openCreateModal = () => {
  editingPlan.value = null;
  submitError.value = '';
  isFormModalVisible.value = true;
};

const openEditModal = (plan) => {
  editingPlan.value = plan;
  submitError.value = '';
  isFormModalVisible.value = true;
};

const closeFormModal = () => {
  isFormModalVisible.value = false;
  editingPlan.value = null;
  submitError.value = '';
};

const promptDelete = (planId) => {
  planToDeleteId.value = planId;
  isDeleteModalVisible.value = true;
};

// --- FORMATTING ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const date = new Date(dateString);
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString(undefined, options);
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

// --- LIFECYCLE HOOKS ---
onMounted(() => {
  const titles = ["What's on your mind, beautiful?", "What shall we do, my love?", "Create a new adventure..."];
  createButtonTitle.value = titles[Math.floor(Math.random() * titles.length)];
  if (props.user) subscribeToPlans();
});

onUnmounted(() => {
  if (unsubscribeFromPlans) {
    unsubscribeFromPlans();
  }
});

watch(() => props.user, (newUser) => {
  if (newUser) {
    subscribeToPlans();
  } else {
    if (unsubscribeFromPlans) unsubscribeFromPlans();
    plans.value = [];
  }
});
</script>

<style scoped>
.plans-view { max-width: 1200px; margin: 0 auto; padding: 1rem; }
.plan-list-section { margin-bottom: 2.5rem; }

.plan-cards-container { 
  display: grid;
  grid-template-columns: minmax(0, 600px);
  justify-content: center;
  gap: 1.5rem; 
}

.plan-card {
  position: relative;
  padding: 1.5rem;
  border-radius: 20px;
  background: rgba(50, 50, 50, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 8px 16px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.plan-card:hover {
  transform: translateY(-10px) scale(1.03);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 12px 24px rgba(0, 0, 0, 0.4), 0 8px 12px rgba(0, 0, 0, 0.5);
}

.card-header {
  margin-bottom: 1rem;
}

.card-header h3 {
  margin: 0;
  color: #42b883;
  font-size: 1.4em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-card .plan-detail { margin: 0.5rem 0; color: #ccc; }
.plan-detail strong { color: #888; }

.create-plan-button-section { text-align: center; margin-bottom: 2.5rem; }
.add-plan-button { padding: 0.7em 1.4em; border-radius: 30px; border: none; background-color: #42b883; color: white; font-size: 1.1em; font-weight: 600; cursor: pointer; }

.hashtags-container { margin-top: 1rem; }
.hashtag { display: inline-block; background-color: #333; color: #42b883; padding: 0.3em 0.7em; border-radius: 15px; font-size: 0.85em; margin-right: 0.5rem; margin-bottom: 0.5rem; }

.error-message, .loading-state, .empty-state { text-align: center; margin-top: 1rem; color: #aaa; }
.error-message { color: #ff6b6b; }
</style>
