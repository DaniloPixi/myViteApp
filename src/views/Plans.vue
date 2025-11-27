<template>
  <div class="plans-view" @click="handleOutsideClick">

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
      <div v-else class="plan-cards-container" @mousemove="handleMousemove">
        <div 
          v-for="(plan, index) in filteredPlans"
          :key="plan.id"
          class="plan-card"
          :data-plan-id="plan.id" 
          :class="{ 
            'expanded': expandedPlanId === plan.id, 
            'hovered': hoveredPlanId === plan.id && expandedPlanId !== plan.id,
            'focused': isTouchDevice && focusedPlanId === plan.id && expandedPlanId !== plan.id
          }"
          :style="getPlanBubbleStyle(plan, index)"
          @click.stop="toggleExpand(plan.id)" 
          @mouseover="setHovered(plan.id)"
          @mouseleave="clearHovered">

          <!-- Expanded Content -->
          <div v-if="expandedPlanId === plan.id" class="expanded-content">
            <h3>{{ plan.text }}</h3>
            <p class="plan-detail"><strong>Date:</strong> {{ formatDate(plan.date) }}</p>
            <p v-if="plan.time" class="plan-detail"><strong>Time:</strong> {{ formatTime(plan.time) }}</p>
            <p class="plan-detail"><strong>Location:</strong> {{ plan.location }}</p>
            <div v-if="plan.hashtags && plan.hashtags.length" class="hashtags-container">
              <span v-for="tag in plan.hashtags" :key="tag" class="hashtag">{{ tag }}</span>
            </div>
            <ProgressBar :startDate="plan.creationDate" :endDate="plan.fullDate" />
            <div class="card-footer">
              <p class="creator-info">By: {{ plan.createdBy }}</p>
              <div class="card-actions">
                  <button @click.stop="openEditModal(plan)" class="edit-button">edit</button>
                  <button @click.stop="promptDelete(plan.id)" class="delete-button">delete</button>
              </div>
            </div>
          </div>

          <!-- Hovered or Focused Content (Title + Time) -->
          <div v-else-if="hoveredPlanId === plan.id || (isTouchDevice && focusedPlanId === plan.id)" class="hover-content">
            <h4 class="plan-title">{{ plan.text }}</h4>
            <p v-if="plan.time">{{ formatTime(plan.time) }}</p>
          </div>

          <!-- Default Content (Title Only) -->
          <div v-else class="default-content">
            <h4 class="plan-title">{{ plan.text }}</h4>
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
import ProgressBar from '../components/ProgressBar.vue';

const props = defineProps({
  user: { type: Object, required: true },
  locationFilter: { type: String, default: '' },
  hashtagFilter: { type: String, default: '' },
  dateFilter: { type: String, default: '' },
  timeFilter: { type: String, default: '' },
  durationFilter: { type: Array, default: () => [] },
});

const plans = ref([]);
const isLoading = ref(true);
const fetchError = ref('');
const isSubmitting = ref(false);
const submitError = ref('');

const isFormModalVisible = ref(false);
const editingPlan = ref(null);
const isDeleteModalVisible = ref(false);
const planToDeleteId = ref(null);

const createButtonTitle = ref('');
let unsubscribeFromPlans = null;

const expandedPlanId = ref(null);
const hoveredPlanId = ref(null);
const mousePosition = ref({ x: 0, y: 0 });
const isTouchDevice = ref(false);

const colorPalette = [
  { inner: 'rgba(255, 3, 220, 0.5)', outer: 'rgba(255, 3, 220, 0.3)', color: 'magenta' }, // Magenta
  { inner: 'rgba(3, 220, 255, 0.5)', outer: 'rgba(3, 220, 255, 0.3)', color: 'turquoise' }, // Turquoise
];

const getPlanBubbleStyle = (plan, index) => {
  const color = colorPalette[index % colorPalette.length];
  const style = {
    '--bubble-inner-shadow-color': color.inner,
    '--bubble-outer-shadow-color': color.outer,
    '--bubble-text-color': color.color,
  };

  if (expandedPlanId.value !== plan.id) {
    const scale = isTouchDevice.value ? getScaleForMobile(plan) : getScaleForDesktop(plan);
    style.transform = `scale(${scale})`;
  }

  return style;
};

const getScaleForDesktop = (plan) => {
  if (!plan.rect) return 1;
  const centerX = plan.rect.left + plan.rect.width / 2;
  const centerY = plan.rect.top + plan.rect.height / 2;
  const distance = Math.sqrt(Math.pow(centerX - mousePosition.value.x, 2) + Math.pow(centerY - mousePosition.value.y, 2));
  const maxDistance = 300; // Affects the "magnetic" range
  const scale = Math.max(1, 1.5 - (distance / maxDistance));
  return scale;
};

const getScaleForMobile = (plan) => {
  if (!plan.rect) return 1;
  const viewportCenterY = window.innerHeight / 2;
  const cardCenterY = plan.rect.top + plan.rect.height / 2;
  const distance = Math.abs(viewportCenterY - cardCenterY);
  const maxDistance = window.innerHeight / 2;
  const scale = Math.max(1, 1.3 - (distance / maxDistance));
  return scale;
};

const handleMousemove = (event) => {
  if (isTouchDevice.value) return;
  mousePosition.value = { x: event.clientX, y: event.clientY };
  updatePlanRects();
};

const updatePlanRects = () => {
  plans.value.forEach(plan => {
    const el = document.querySelector(`[data-plan-id="${plan.id}"]`);
    if (el) {
      plan.rect = el.getBoundingClientRect();
    }
  });
};

const toggleExpand = (planId) => {
  expandedPlanId.value = expandedPlanId.value === planId ? null : planId;
};

const setHovered = (planId) => {
  hoveredPlanId.value = planId;
};

const clearHovered = () => {
  hoveredPlanId.value = null;
};

const handleOutsideClick = () => {
  expandedPlanId.value = null;
  clearHovered();
};

const filteredPlans = computed(() => {
  return plans.value.filter(plan => {
    const locationMatch = !props.locationFilter || plan.location.toLowerCase().includes(props.locationFilter.toLowerCase());
    const hashtagMatch = !props.hashtagFilter || (plan.hashtags && plan.hashtags.some(tag => tag.toLowerCase() === ('#' + props.hashtagFilter).toLowerCase()));
    const dateMatch = !props.dateFilter || plan.date === props.dateFilter;
    
    const durationMatch = props.durationFilter.length === 0 || (plan.time && props.durationFilter.some(d => plan.time.includes(d)));

    const timeMatch = (() => {
      if (!props.timeFilter) return true; // No time filter applied
      if (!plan.time) return false; // Plan has no time, so it can't match

      const timeRegex = /\d{2}:\d{2}/;
      const planTimeMatch = plan.time.match(timeRegex);

      if (!planTimeMatch) return false; // Plan has a time string but not in HH:mm format

      const planTime = planTimeMatch[0];
      return planTime === props.timeFilter;
    })();

    return locationMatch && hashtagMatch && dateMatch && timeMatch && durationMatch;
  });
});

const focusedPlanId = computed(() => {
  if (!isTouchDevice.value) return null;

  let closestPlan = null;
  let minDistance = Infinity;
  const viewportCenterY = window.innerHeight / 2;

  filteredPlans.value.forEach(plan => {
    if (plan.rect) {
      const cardCenterY = plan.rect.top + plan.rect.height / 2;
      const distance = Math.abs(viewportCenterY - cardCenterY);

      if (distance < minDistance) {
        minDistance = distance;
        closestPlan = plan.id;
      }
    }
  });

  // Threshold to consider a card "focused"
  if (minDistance < 100) { // Adjust this threshold as needed
    return closestPlan;
  }

  return null;
});

const getAuthToken = async () => {
  if (!props.user) throw new Error("User not authenticated");
  return await props.user.getIdToken(true);
};

const subscribeToPlans = () => {
  if (unsubscribeFromPlans) unsubscribeFromPlans();
  if (!props.user) return;

  try {
    const db = getFirestore();
    const plansQuery = query(collection(db, 'plans'), orderBy('date', 'desc'));

    unsubscribeFromPlans = onSnapshot(plansQuery, (snapshot) => {
      plans.value = snapshot.docs.map(doc => {
        const data = doc.data();
        const date = new Date(data.date);
        if (data.time) {
          const timeParts = data.time.match(/(\d{2}):(\d{2})/);
          if (timeParts) {
            date.setHours(timeParts[1], timeParts[2]);
          }
        }
        return {
          id: doc.id,
          ...data,
          creationDate: data.createdAt ? data.createdAt.toDate() : new Date(),
          fullDate: date,
          rect: null, // Initialize rect property
        };
      });
      isLoading.value = false;
      // Initial rect calculation after data is loaded
      setTimeout(updatePlanRects, 100);
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

onMounted(() => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const titles = ["What's on your mind, beautiful?", "What shall we do, my love?", "Create a new adventure..."];
  createButtonTitle.value = titles[Math.floor(Math.random() * titles.length)];
  if (props.user) {
    subscribeToPlans();
  }

  if (isTouchDevice.value) {
    window.addEventListener('scroll', updatePlanRects);
  }
});

onUnmounted(() => {
  if (unsubscribeFromPlans) {
    unsubscribeFromPlans();
  }
  if (isTouchDevice.value) {
    window.removeEventListener('scroll', updatePlanRects);
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
.plan-list-section { margin-bottom: 2.5rem; text-align: center;}

.plan-cards-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  padding: 2rem 0;
}

.plan-card {
  position: relative;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: pointer;
  color: #fff;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem;
  background-color: transparent;
  box-shadow: inset 0 0 10px var(--bubble-inner-shadow-color), 0 0 15px var(--bubble-outer-shadow-color);
  will-change: transform;
  backface-visibility: hidden;
}

.plan-card.hovered, .plan-card.focused {
  box-shadow: inset 0 0 25px var(--bubble-inner-shadow-color), 0 0 25px var(--bubble-outer-shadow-color);
}

.plan-card.expanded {
  width: 90%;
  max-width: 600px;
  height: auto;
  border-radius: 20px;
  flex-direction: column;
  align-items: stretch;
  padding: 2rem;
  cursor: default;
  box-shadow: inset 0 0 20px var(--bubble-inner-shadow-color), 0 0 30px var(--bubble-outer-shadow-color);
  transform: scale(1) !important; /* Override scaling when expanded */
}

.plan-title {
  font-family: 'Great Vibes', cursive;
  word-wrap: break-word;
  font-size: clamp(1.5rem, 1.2vw, 1.2rem);
  margin: 0;
  font-weight: 700;
  color: var(--bubble-text-color);
}

.hover-content p {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  color: #ccc;
}

.expanded-content {
  opacity: 1;
  transition: opacity 0.9s ease-in-out;
}

.expanded-content h3 {
  margin: 0 0 1rem;
  color: var(--bubble-text-color, turquoise);
  font-family: 'Great Vibes', cursive;
  font-size: 2.5em;
  font-weight: normal;
}

.plan-detail { margin: 0.5rem 0; color: #ddd; }
.plan-detail strong { color: #aaa; }

.create-plan-button-section { text-align: center; margin-bottom: 2.5rem; }

.add-plan-button {
  background: linear-gradient(45deg, #0f0f0f, #f3099270,#360101);
  color: rgb(95, 213, 243);
  padding: 0.8rem 2.5rem;
  border: none;
  border-radius: 50px;
  font-family: 'Great Vibes', cursive;
  font-weight: normal;
  font-size: 2em;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(240, 6, 134, 0.26);
}

.add-plan-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 7px 20px rgba(f8, 87, 166, 0.5);
}


.hashtags-container { margin-top: 1rem; }
.hashtag {
  display: inline-block;
  background-color: #000000;
  color: #f700c1;
  padding: 0.3em 0.7em;
  border-radius: 15px;
  font-size: 0.85em;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid #f700c1;
  box-shadow: 0 0 8px rgba(247, 0, 193, 0.7);
}

.error-message, .loading-state, .empty-state { text-align: center; margin-top: 1rem; color: #aaa; }
.error-message { color: #ff6b6b; }
</style>