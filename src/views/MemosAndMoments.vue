
<template>
  <div class="memos-moments-view">
    <!-- Loading and Error States -->
    <div v-if="loading" class="loading-state">Loading Memos...</div>
    <div v-if="error" class="error-state">{{ error }}</div>

    <!-- Main Content -->
    <div v-if="!loading && !error">
      <div class="add-memo-section">
        <button @click="openAddForm" class="add-memo-btn">
            <svg class="add-memo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 121.24 122.88">
                <path d="M10.05,96.6C6.38,105.51,1.42,113.97,0,122.88l5.13-0.44c8.1-23.56,15.4-39.4,31.23-59.21 C48.24,48.39,61.13,36.58,77.66,27.2c8.8-5,20.07-10.47,30.21-11.85c2.77-0.38,5.58-0.49,8.46-0.24 c-31.4,7.19-56.26,23.84-76.12,48.8C32.1,74.09,25.05,85.4,18.57,97.32l11.94,2.18l-4.97-2.47l17.78-2.83 c-6.6-2.33-13.12-1.55-15.21-4.06c18.3-0.83,33.34-4.78,43.9-12.45c-3.93-0.55-8.46-1.04-10.82-2.17 c17.69-5.98,27.92-16.73,40.9-26.27c-16.87,3.54-32.48,2.96-37-0.25c29.77,2.21,49-6.02,55.59-26.77c0.57-2.24,0.73-4.5,0.37-6.78 C118.74,0.62,92.49-4.39,83.95,7.77c-1.71,2.43-4.12,4.66-6.11,7.48L85.97,0c-21.88,7.39-23.68,15.54-35,40.09 c0.9-7.47,2.97-14.24,5.66-20.63c-27.34,10.55-36.45,37.11-37.91,59.7c-0.79-7.88,0.67-17.78,3.49-28.9 c-7.98,8-13.41,17.39-11.47,30.79l-3.65-1.63l1.92,7.19l-5.46-2.59L10.05,96.6L10.05,96.6z"/>
            </svg>
        </button>
      </div>

      <!-- Memos List -->
      <div v-if="filteredMemos.length > 0" class="memos-list">
        <div v-for="memo in filteredMemos" :key="memo.id" class="memo-card" tabindex="0">
          <!-- Layer 1: Background Gallery -->
          <div class="gallery-container">
            <div class="photo-gallery"
                 :style="{ transform: `translateX(-${galleryState[memo.id]?.currentIndex * 100}%)` }"
                 @touchstart="handleTouchStart(memo.id, $event)"
                 @touchmove="handleTouchMove(memo.id, $event)"
                 @touchend="handleTouchEnd(memo.id, $event)">
              <div v-for="(media, index) in getMemoMedia(memo)"
                   :key="index"
                   class="photo-item"
                   @click="openImageModal(getMemoMedia(memo), index)">
                <img :src="getThumbnailUrl(media)" alt="Memo media" :class="{'adult-content-blur': media.isAdult }"/>
              </div>
            </div>
          </div>

          <!-- Layer 2: Text Content Overlay -->
          <div class="memo-content">
            <p class="memo-description">{{ memo.description }}</p>
            
            <div>
              <div class="memo-meta">
                <span class="meta-item">
                  <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  {{ memo.location || 'No location' }}
                </span>
                <span class="meta-item">
                  <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V8h14v12zM7 10h5v5H7z"/></svg>
                  {{ formatDate(memo.date) }}
                </span>
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

          <!-- Layer 3: Gallery Controls -->
          <template v-if="getMemoMedia(memo).length > 1">
            <button @click.stop="prevImage(memo.id)" class="gallery-nav prev-btn" :class="{ 'visible': galleryState[memo.id]?.currentIndex > 0 }">&lsaquo;</button>
            <button @click.stop="nextImage(memo.id)" class="gallery-nav next-btn" :class="{ 'visible': galleryState[memo.id]?.currentIndex < getMemoMedia(memo).length - 1 }">&rsaquo;</button>
            <div class="gallery-dots">
              <span v-for="(media, index) in getMemoMedia(memo)" :key="index" class="dot" :class="{ active: galleryState[memo.id]?.currentIndex === index }"></span>
            </div>
          </template>
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
    <ImageModal
      :is-visible="isImageModalVisible"
      :media-items="selectedMediaItems"
      :start-index="selectedImageIndex"
      @close="closeImageModal"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase';
import MemoForm from '../components/MemoForm.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import ImageModal from '../components/ImageModal.vue';
import { usePhotoUtils } from '../composables/usePhotoUtils';

const { getOptimizedUrl } = usePhotoUtils();

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
const isImageModalVisible = ref(false);
const selectedMediaItems = ref([]);
const selectedImageIndex = ref(0);
const galleryState = ref({});
let unsubscribeFromMemos = null;

const getMemoMedia = (memo) => {
  // This function is now responsible for getting all media
  if (memo.photos && Array.isArray(memo.photos)) {
    return memo.photos;
  }
  return [];
};

const getThumbnailUrl = (media) => {
  if (media.resource_type === 'video') {
    return media.url.replace(/\.mp4$/, '.jpg');
  }
  return getOptimizedUrl(media.url, { width: 600 });
};

const openImageModal = (media, index) => {
  selectedMediaItems.value = media;
  selectedImageIndex.value = index;
  isImageModalVisible.value = true;
};

const closeImageModal = () => {
  isImageModalVisible.value = false;
  selectedMediaItems.value = [];
  selectedImageIndex.value = 0;
};

const filteredMemos = computed(() => {
  return memos.value.filter(memo => {
    const locationMatch = !props.locationFilter || (memo.location && memo.location.toLowerCase().includes(props.locationFilter.toLowerCase()));
    const hashtagMatch = !props.hashtagFilter || (memo.hashtags && memo.hashtags.some(tag => tag.toLowerCase() === ('#' + props.hashtagFilter).toLowerCase()));
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

const prevImage = (memoId) => {
  if (galleryState.value[memoId].currentIndex > 0) {
    galleryState.value[memoId].currentIndex--;
  }
};

const nextImage = (memoId) => {
  const memo = memos.value.find(m => m.id === memoId);
  if (memo && galleryState.value[memoId].currentIndex < getMemoMedia(memo).length - 1) {
    galleryState.value[memoId].currentIndex++;
  }
};

const handleTouchStart = (memoId, event) => {
  galleryState.value[memoId].touchStartX = event.touches[0].clientX;
};

const handleTouchMove = (memoId, event) => {
  if (galleryState.value[memoId].touchStartX === 0) return;
};

const handleTouchEnd = (memoId, event) => {
  if (galleryState.value[memoId].touchStartX === 0) return;
  const touchEndX = event.changedTouches[0].clientX;
  const diffX = galleryState.value[memoId].touchStartX - touchEndX;

  if (Math.abs(diffX) > 50) { // Threshold for swipe
      if (diffX > 0) { // Swipe left
          nextImage(memoId);
      } else { // Swipe right
          prevImage(memoId);
      }
  }

  galleryState.value[memoId].touchStartX = 0;
};

onMounted(() => {
  subscribeToMemos();
  watch(() => auth.currentUser, (currentUser) => {
    if (currentUser) {
      subscribeToMemos();
    } else {
      if (unsubscribeFromMemos) unsubscribeFromMemos();
      memos.value = [];
    }
  });

  watch(memos, (newMemos) => {
    newMemos.forEach(memo => {
      if (!galleryState.value[memo.id]) {
        galleryState.value[memo.id] = { currentIndex: 0, touchStartX: 0 };
      }
    });
  }, { deep: true });
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
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.add-memo-btn {
  background-color: transparent;
  border: 0.0625rem transparent;
  color: magenta;
  padding: 0;
  border-radius: 50%;
  width: 4rem;
  height: 3.125rem;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 1s ease-in-out;
}

.add-memo-btn .add-memo-icon {
  width: 3.4rem;
  height: 4rem;
  fill: currentColor;
}

.add-memo-btn:hover {
  color: turquoise;
}

.memos-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.memo-card {
  position: relative;
  min-height: 25rem;
  border-radius: 1.25rem;
  overflow: hidden;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 8px 16px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.memo-card:hover {
  transform: translateY(-10px) scale(1.03);
}

.memo-card:nth-child(odd):hover {
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 
              0 12px 24px rgba(0, 0, 0, 0.4), 
              0 8px 12px rgba(0, 0, 0, 0.5), 
              0 0 30px 10px rgba(255, 0, 255, 0.5);
}

.memo-card:nth-child(even):hover {
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 
              0 12px 24px rgba(0, 0, 0, 0.4), 
              0 8px 12px rgba(0, 0, 0, 0.5), 
              0 0 30px 10px rgba(0, 255, 255, 0.5);
}

.gallery-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.photo-gallery,
.photo-item {
  height: 100%;
}

.photo-gallery {
    display: flex;
    transition: transform 0.3s ease-in-out;
}

.photo-item {
    flex: 0 0 100%;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  cursor: pointer;
  transition: filter 0.3s ease;
}

.photo-item .adult-content-blur {
  filter: blur(1rem);
}

.memo-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 30%, transparent 100%);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* Push details to top, footer to bottom */
  pointer-events: none;
  opacity: 0; /* Hidden by default */
  transition: opacity 0.3s ease-in-out;
}

.memo-card:hover .memo-content {
  opacity: 1; /* Show on hover */
}


.memo-content > * {
    pointer-events: auto;
}


.memo-description {
  font-size: 1.8em;
  line-height: 1.6;
  color: magenta;
  margin-bottom: 0.15rem;
  font-family: 'Great Vibes', cursive;
  opacity: 0;
  transform: translateY(-20px);
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
}

.memo-card:hover .memo-description {
  opacity: 1;
  transform: translateY(0);
}

.memo-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 0.9em;
  color: magenta;
  margin-bottom: 0.25rem;
  font-weight: 700;
}

.meta-item {
  display: inline-flex;
  align-items: center;
}

.meta-icon {
  width: 1em;
  height: 1em;
  fill: currentColor;
  margin-right: 0.35em;
}

.memo-hashtags {
  text-align: center;
  margin-bottom: 0.5rem;
}

.hashtag {
  display: inline-block;
  background-color: rgba(0, 0, 0, 0.2);
  color: magenta;
  padding: 0.3em 0.7em;
  border-radius: 1rem;
  font-size: 0.8em;
  font-weight: 700;
  border: 1px solid rgba(255, 25, 255, 0.2);
  margin: 0.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.hashtag:hover {
  background-color: rgba(255, 25, 255, 0.3);
  border-color: rgba(255, 25, 255, 0.6);
  color: #fff;
  transform: scale(1.05);
}

.memo-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.25rem;
  padding-right:0.25rem;
  padding-left:0.25rem;
  border-top: 0.0625rem solid magenta;
  font-size: 1em;
  color: #f595ff;
}

.card-actions {
  display: flex;
  gap: 2rem;
}

.edit-button, .delete-button {
  background: none;
  border: none;
  color: turquoise;
  cursor: pointer;
  font-size: 0.9em;
  text-transform: lowercase;
  padding: 0;
  transition: color 0.3s;
}

.edit-button:hover, .delete-button:hover {
  text-decoration: none;
  color: magenta;
}

.delete-button:hover {
  color: #ff6b6b;
}

.gallery-nav, .gallery-dots {
    position: absolute;
    z-index: 3; 
}

.gallery-nav {
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0);
  color: rgb(208, 8, 235);
  border: none;
  border-radius: 50%;
  width: 2.25rem;
  height: 2.25rem;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: transform 0.3s ease;
}

.gallery-nav:hover,
.gallery-nav:active {
    transform: translateY(-50%) scale(3);
}

.gallery-nav:focus {
    outline: none;
}

.gallery-nav.visible {
    opacity: 1;
}

.prev-btn {
  left: 0.625rem;
}
.next-btn {
  right: 0.625rem;
}

.gallery-dots {
  bottom: 0.625rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: rgba(248, 24, 200, 0.6);
  transition: background-color 0.3s;
}

.dot.active {
  background-color: rgb(21, 209, 223);
}

@media (max-width: 760px) {
  .memos-moments-view {
    padding: 0.5rem;
  }

  .memos-list {
    gap: 1rem;
  }

  .memo-card {
    min-height: 22rem;
  }

  .memo-content {
    padding: 0.2rem 0.1rem 0.1rem;
  }

  .memo-description {
    font-size: 1em;
  }

  .memo-footer {
    display:flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
