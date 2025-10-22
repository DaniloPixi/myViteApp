<template>
  <div v-if="isVisible" class="image-modal-overlay" @click.self="close" @keydown.esc="close" @keydown.left="prevImage" @keydown.right="nextImage" tabindex="0" ref="modal">
    <div class="modal-container">
      <div class="image-modal-content"
           @touchstart.passive="handleTouchStart"
           @touchmove.passive="handleTouchMove"
           @touchend="handleTouchEnd">

        <!-- Navigation Buttons -->
        <button v-if="hasMultipleImages" @click.stop="prevImage" class="nav-btn prev-btn" :disabled="isFirstImage">&lsaquo;</button>
        <button v-if="hasMultipleImages" @click.stop="nextImage" class="nav-btn next-btn" :disabled="isLastImage">&rsaquo;</button>

        <!-- Image Slider -->
        <div class="image-slider" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
          <div v-for="(url, index) in imageUrls" :key="index" class="slide">
            <div class="image-container">
               <img :src="getOptimizedUrl(url, { width: 1200 })" alt="Enlarged photo" />
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="bottom-controls">
        <!-- Dots Indicator -->
        <div v-if="hasMultipleImages" class="dots-indicator">
          <span v-for="(_, index) in imageUrls" :key="index" class="dot" :class="{ active: currentIndex === index }"></span>
        </div>
        <!-- New Bottom Close Button -->
        <button @click="close" class="close-btn-bottom">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { usePhotoUtils } from '../composables/usePhotoUtils';

const { getOptimizedUrl } = usePhotoUtils();

const props = defineProps({
  isVisible: { type: Boolean, required: true },
  imageUrls: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 },
});

const emit = defineEmits(['close']);

const currentIndex = ref(0);
const modal = ref(null);
const touchStartX = ref(0);

// Computed properties
const hasMultipleImages = computed(() => props.imageUrls.length > 1);
const isFirstImage = computed(() => currentIndex.value === 0);
const isLastImage = computed(() => currentIndex.value === props.imageUrls.length - 1);

// Watchers
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    currentIndex.value = props.startIndex;
    nextTick(() => {
      modal.value?.focus(); // Set focus for keyboard events
    });
  }
});

// Methods
const close = () => emit('close');

const prevImage = () => {
  if (!isFirstImage.value) {
    currentIndex.value--;
  }
};

const nextImage = () => {
  if (!isLastImage.value) {
    currentIndex.value++;
  }
};

// --- Touch Swipe Logic ---
const handleTouchStart = (event) => {
  touchStartX.value = event.touches[0].clientX;
};

const handleTouchMove = (event) => {
  // We leave this function empty on purpose.
};

const handleTouchEnd = (event) => {
  if (touchStartX.value === 0) return;

  const touchEndX = event.changedTouches[0].clientX;
  const diffX = touchStartX.value - touchEndX;

  if (diffX > 50) { // Swiped left
    nextImage();
  } else if (diffX < -50) { // Swiped right
    prevImage();
  }

  touchStartX.value = 0; // Reset
};

</script>

<style scoped>
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  outline: none;
}

.modal-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-modal-content {
  position: relative;
  width: 90vw;
  height: 90vh;
  overflow: hidden;
  user-select: none;
}

.image-slider {
  display: flex;
  height: 100%;
  width: 100%;
  transition: transform 0.3s ease-in-out;
}

.slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  border-radius: 8px;
  pointer-events: none;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.3);
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  font-size: 24px;
  cursor: pointer;
  z-index: 5;
  transition: background 0.2s;
}

/* Hide nav buttons on touch devices to encourage swiping */
@media (pointer: coarse) {
  .nav-btn {
    display: none;
  }
}

.nav-btn:hover:not(:disabled) {
  background: rgba(0,0,0,0.6);
}

.nav-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.nav-btn:focus,
.nav-btn:focus-visible {
  outline: none;
  box-shadow: none;
}

.prev-btn { left: 15px; }
.next-btn { right: 15px; }

.bottom-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
}

.dots-indicator {
  display: flex;
  gap: 10px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
}

.dot.active {
  background: white;
}

.close-btn-bottom {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: white;
  padding: 8px 24px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.close-btn-bottom:hover {
  background: white;
  color: black;
}
</style>