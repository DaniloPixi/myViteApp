
<template>
  <div class="memos-moments-view">
    <!-- Loading and Error States -->
    <div v-if="loading" class="loading-state">Loading Memos...</div>
    <div v-if="error" class="error-state">{{ error }}</div>

    <!-- Main Content -->
    <div v-if="!loading && !error">
      <div class="add-memo-section">
        <button @click="openAddForm" class="add-memo-btn">+ Add New Memo</button>
      </div>

      <!-- Memos List -->
      <div v-if="filteredMemos.length > 0" class="memos-list">
        <div v-for="memo in filteredMemos" :key="memo.id" class="memo-card">
          <div v-if="memo.photoUrls && memo.photoUrls.length" class="photo-gallery">
            <div v-for="(url, index) in memo.photoUrls" :key="index" class="photo-item">
              <img :src="url" alt="Memo photo" />
            </div>
          </div>
          <div class="memo-content">
            <p class="memo-description">{{ memo.description }}</p>
            <div class="memo-meta">
              <span class="meta-item"><strong>📍</strong> {{ memo.location || 'No location' }}</span>
              <span class="meta-item"><strong>🗓️</strong> {{ formatDate(memo.date) }}</span>
            </div>
            <div v-if="memo.hashtags && memo.hashtags.length" class="memo-hashtags">
              <span v-for="tag in memo.hashtags" :key="tag" class="hashtag">{{ tag }}</span>
            </div>
            <div class="memo-footer">
              <span class="created-by">By: {{ memo.createdBy }}</span>
              <div class="card-actions">
                <button @click="openEditForm(memo)" class="edit-button">edit</button>
                <button @click="promptDelete(memo.id)" class="delete-button">delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Memos State -->
      <div v-else class="no-memos-state">
        <div v-if="memos.length === 0">
          <h2>No Memos Yet</h2>
          <p>Be the first to share a moment!</p>
        </div>
        <div v-else>
          <h2>No memos match your current filters.</h2>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <MemoForm
      v-if="showForm"
      :memo="selectedMemo"
      :cloudinary-cloud-name="'dknmcj1qj'"
      :cloudinary-upload-preset="'memos_and_moments'"
      @close="closeForm"
      @memo-saved="handleMemoSaved"
    />
    <ConfirmDeleteModal
      v-if="isDeleteModalVisible"
      title="Confirm Deletion"
      message="Are you sure you want to delete this memo? This action cannot be undone."
      @confirm="handleDelete"
      @close="isDeleteModalVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase';
import MemoForm from '../components/MemoForm.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';

const props = defineProps({
  locationFilter: { type: String, default: '' },
  hashtagFilter: { type: String, default: '' },
  dateFilter: { type: String, default: '' },
});

const memos = ref([]);
const loading = ref(true);
const error = ref(null);
const showForm = ref(false);
const selectedMemo = ref(null);
const isDeleteModalVisible = ref(false);
const deletingMemoId = ref(null);
let unsubscribeFromMemos = null;

const filteredMemos = computed(() => {
  return memos.value.filter(memo => {
    const locationMatch = !props.locationFilter || (memo.location && memo.location.toLowerCase().includes(props.locationFilter.toLowerCase()));
    const hashtagMatch = !props.hashtagFilter || (memo.hashtags && memo.hashtags.some(tag => tag.toLowerCase().includes(props.hashtagFilter.toLowerCase())));
    const dateMatch = !props.dateFilter || memo.date === props.dateFilter;
    return locationMatch && hashtagMatch && dateMatch;
  });
});

const subscribeToMemos = () => {
  if (unsubscribeFromMemos) unsubscribeFromMemos();
  try {
    const db = getFirestore();
    const memosQuery = query(collection(db, 'memos'), orderBy('createdAt', 'desc'));
    unsubscribeFromMemos = onSnapshot(memosQuery, (snapshot) => {
      memos.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loading.value = false;
    }, (err) => {
      console.error("Error fetching memos in real-time:", err);
      error.value = "Failed to load memos. Please check your connection.";
      loading.value = false;
    });
  } catch (err) {
    console.error("Error setting up memos subscription:", err);
    error.value = "An unexpected error occurred.";
    loading.value = false;
  }
};

const deleteMemo = async (memoId) => {
  try {
    if (!auth.currentUser) throw new Error('Authentication required.');
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`/api/memos/${memoId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${idToken}` },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete memo.');
    }
  } catch (err) {
    console.error("Error deleting memo:", err);
    error.value = err.message;
  }
};

const openAddForm = () => {
  selectedMemo.value = null;
  showForm.value = true;
};

const openEditForm = (memo) => {
  selectedMemo.value = memo;
  showForm.value = true;
};

const closeForm = () => {
  showForm.value = false;
  selectedMemo.value = null;
};

const handleMemoSaved = () => {
  closeForm();
};

const promptDelete = (memoId) => {
  deletingMemoId.value = memoId;
  isDeleteModalVisible.value = true;
};

const handleDelete = async () => {
  if (deletingMemoId.value) {
    await deleteMemo(deletingMemoId.value);
  }
  isDeleteModalVisible.value = false;
  deletingMemoId.value = null;
};

const formatDate = (dateString) => {
  if (!dateString) return 'No date';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

onMounted(() => {
  subscribeToMemos();
  watch(auth, (currentUser) => {
    if (currentUser) {
      subscribeToMemos();
    } else {
      if (unsubscribeFromMemos) unsubscribeFromMemos();
      memos.value = [];
    }
  });
});

onUnmounted(() => {
  if (unsubscribeFromMemos) {
    unsubscribeFromMemos();
  }
});

</script>

<style scoped>
.memos-moments-view {
  padding: 1rem;
}

.loading-state,
.error-state,
.no-memos-state {
  text-align: center;
  padding: 3rem;
  color: #aaa;
}

.error-state {
  color: #ff6b6b;
}

.add-memo-section {
  text-align: center;
  margin-bottom: 2rem;
}

.add-memo-btn {
  background-color: #42b883;
  color: white;
  border: none;
  padding: 0.8em 1.5em;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-memo-btn:hover {
  background-color: #36a473;
}

.memos-list {
  display: grid;
  gap: 1.5rem;
}

.memo-card {
  background: rgba(50, 50, 50, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.25);
  border-radius: 20px;
  overflow: hidden;
}

.photo-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 5px;
  padding: 5px;
  background: rgba(0,0,0,0.2);
}

.photo-item img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

.memo-content {
  padding: 1.2rem;
}

.memo-description {
  font-size: 1.1em;
  line-height: 1.6;
  color: #e0e0e0;
  margin-bottom: 1rem;
}

.memo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.9em;
  color: #aaa;
  margin-bottom: 1rem;
}

.memo-hashtags {
  margin-bottom: 1rem;
}

.hashtag {
  display: inline-block;
  background-color: #333;
  color: #42b883;
  padding: 0.3em 0.8em;
  border-radius: 15px;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.85em;
  font-weight: 500;
}

.memo-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #444;
  font-size: 0.8em;
  color: #888;
}

.card-actions {
  display: flex;
  gap: 1rem;
}

.edit-button, .delete-button {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 0.8em;
  text-transform: lowercase;
  padding: 0;
}

.edit-button:hover, .delete-button:hover {
  text-decoration: underline;
}

.delete-button:hover {
  color: #ff6b6b;
}
</style>
