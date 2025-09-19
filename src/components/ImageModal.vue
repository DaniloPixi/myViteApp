<template>
  <div v-if="isVisible" class="image-modal-overlay" @click.self="close" @keydown.esc="close" @keydown.left="prevImage" @keydown.right="nextImage" tabindex="0" ref="modal">
    <div class="image-modal-content" 
         @touchstart="handleTouchStart"
         @touchmove="handleTouchMove"
         @touchend="handleTouchEnd">

      <!-- Close Button -->
      <button @click="close" class="close-btn">&times;</button>

      <!-- Navigation Buttons -->
      <button v-if="hasMultipleImages" @click.stop="prevImage" class="nav-btn prev-btn" :disabled="isFirstImage">&lsaquo;</button>
      <button v-if="hasMultipleImages" @click.stop="nextImage" class="nav-btn next-btn" :disabled="isLastImage">&rsaquo;</button>

      <!-- Image Display -->
      <div class="image-container">
        <img :src="currentImageUrl" alt="Enlarged photo" />
      </div>

      <!-- Dots Indicator -->
      <div v-if="hasMultipleImages" class="dots-indicator">
        <span v-for="(_, index) in imageUrls" :key="index" class="dot" :class="{ active: currentIndex === index }"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';

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
const currentImageUrl = computed(() => props.imageUrls[currentIndex.value] || '');
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
  // Prevent page scroll while swiping
  event.preventDefault();
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
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  outline: none;
}

.image-modal-content {
  position: relative;
  width: 90vw;
  height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none; /* Prevent text selection during swipe */
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
  pointer-events: none; /* Prevent image drag interfering with swipe */
}

.close-btn {
  position: absolute;
  top: -45px;
  right: -15px;
  background: none;
  border: none;
  color: white;
  font-size: 3rem;
  cursor: pointer;
  z-index: 10;
  line-height: 1;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.4);
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

/* Hide nav buttons on touch devices */
@media (pointer: coarse) {
  .nav-btn {
    display: none;
  }
}

.nav-btn:hover:not(:disabled) {
  background: rgba(0,0,0,0.7);
}

.nav-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.nav-btn:focus,
.nav-btn:focus-visible,
.close-btn:focus,
.close-btn:focus-visible {
  outline: none;
  box-shadow: none;
}

.prev-btn { left: -60px; }
.next-btn { right: -60px; }

.dots-indicator {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
}

.dot.active {
  background: white;
}
</style>
