
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
      <div v-if="memos.length > 0" class="memos-list">
        <div v-for="memo in memos" :key="memo.id" class="memo-card">
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
              <span v-for="tag in memo.hashtags" :key="tag" class="hashtag">#{{ tag }}</span>
            </div>
            <div class="memo-footer">
              <span class="created-by">By: {{ memo.createdBy }}</span>
              <div class="actions">
                <button @click="openEditForm(memo)" class="edit-btn">Edit</button>
                <button @click="handleDeleteMemo(memo.id)" class="delete-btn">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Memos State -->
      <div v-else class="no-memos-state">
        <h2>No Memos Yet</h2>
        <p>Be the first to share a moment!</p>
      </div>
    </div>

    <!-- Memo Form Modal -->
    <MemoForm
      v-if="showForm"
      :memo="selectedMemo"
      :cloudinary-cloud-name="'dknmcj1qj'"
      :cloudinary-upload-preset="'memos_and_moments'"
      @close="closeForm"
      @memo-saved="handleMemoSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { auth } from '../firebase';
import MemoForm from '../components/MemoForm.vue';

const memos = ref([]);
const loading = ref(true);
const error = ref(null);
const showForm = ref(false);
const selectedMemo = ref(null);

// --- API Calls ---
const fetchMemos = async () => {
  loading.value = true;
  error.value = null;
  try {
    if (!auth.currentUser) throw new Error('You must be logged in to view memos.');
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/memos', {
      headers: { 'Authorization': `Bearer ${idToken}` },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch memos.');
    }
    memos.value = await response.json();
  } catch (err) {
    console.error("Error fetching memos:", err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const deleteMemo = async (memoId) => {
  if (!confirm("Are you sure you want to delete this memo? This action cannot be undone.")) {
    return;
  }
  
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
    return true;
  } catch (err) {
    console.error("Error deleting memo:", err);
    error.value = err.message; // Show error to the user
    return false;
  }
};


// --- Event Handlers ---
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
  fetchMemos(); // Refresh the list
};

const handleDeleteMemo = async (memoId) => {
  const success = await deleteMemo(memoId);
  if (success) {
    fetchMemos(); // Refresh the list
  }
};

// --- Utility Functions ---
const formatDate = (dateString) => {
  if (!dateString) return 'No date';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// --- Lifecycle Hooks ---
onMounted(() => {
  fetchMemos();
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
  background: rgba(36, 36, 36, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
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

.actions button {
  border: none;
  padding: 0.5em 1em;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.actions .edit-btn {
  background-color: #555;
  color: white;
  margin-right: 0.5rem;
}

.actions .edit-btn:hover { background-color: #666; }

.actions .delete-btn {
  background-color: #d9534f;
  color: white;
}

.actions .delete-btn:hover { background-color: #c9302c; }
</style>
