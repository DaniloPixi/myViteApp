<template>
  <div v-if="isVisible" class="image-modal-overlay" @click.self="close" @keydown.esc="close" @keydown.left="prevMedia" @keydown.right="nextMedia" tabindex="0" ref="modal">
    <div class="modal-container">
      <div class="image-modal-content"
           @touchstart.passive="handleTouchStart"
           @touchmove.passive="handleTouchMove"
           @touchend="handleTouchEnd">

        <!-- Navigation Buttons -->
        <button v-if="hasMultipleMedia" @click.stop="prevMedia" class="nav-btn prev-btn" :disabled="isFirstMedia">&lsaquo;</button>
        <button v-if="hasMultipleMedia" @click.stop="nextMedia" class="nav-btn next-btn" :disabled="isLastMedia">&rsaquo;</button>

        <!-- Media Slider -->
        <div class="image-slider" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
          <div v-for="(item, index) in mediaItems" :key="index" class="slide">
            <div class="image-container">
               <video v-if="item.resource_type === 'video'" :src="getOptimizedUrl(item.url, { isVideo: true, width: 1200 })" controls autoplay loop playsinline></video>
               <img v-else :src="getOptimizedUrl(item.url, { width: 1200 })" alt="Enlarged media" />
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="bottom-controls">
        <!-- Dots Indicator -->
        <div v-if="hasMultipleMedia" class="dots-indicator">
          <span v-for="(_, index) in mediaItems" :key="index" class="dot" :class="[getDotClass(index), { active: currentIndex === index }]"></span>
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
  mediaItems: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 },
});

const emit = defineEmits(['close']);

const currentIndex = ref(0);
const modal = ref(null);
const touchStartX = ref(0);

// Computed properties
const hasMultipleMedia = computed(() => props.mediaItems.length > 1);
const isFirstMedia = computed(() => currentIndex.value === 0);
const isLastMedia = computed(() => currentIndex.value === props.mediaItems.length - 1);

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

const prevMedia = () => {
  if (!isFirstMedia.value) {
    currentIndex.value--;
  }
};

const nextMedia = () => {
  if (!isLastMedia.value) {
    currentIndex.value++;
  }
};

const getDotClass = (index) => {
  return index % 2 === 0 ? 'dot-magenta' : 'dot-turquoise';
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
    nextMedia();
  } else if (diffX < -50) { // Swiped right
    prevMedia();
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

.image-container img, .image-container video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  border-radius: 8px;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1); /* More transparent */
  color: magenta;
  border: none; 
  backdrop-filter: blur(10px); /* Frosted glass effect */
  -webkit-backdrop-filter: blur(10px); /* For Safari */
  border-radius: 50%;
  width: 50px;  /* Slightly larger */
  height: 50px; /* Slightly larger */
  font-size: 30px; /* Larger icon */
  cursor: pointer;
  z-index: 5;
  transition: background 0.3s ease, transform 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Hide nav buttons on touch devices to encourage swiping */
@media (pointer: coarse) {
  .nav-btn {
    display: none;
  }
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.05); /* Slight scale effect on hover */
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.05);
}

.nav-btn:focus,
.nav-btn:focus-visible {
  outline: none;
}

.prev-btn { left: 20px; }
.next-btn { right: 20px; }

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
  transition: transform 0.3s ease, background-color 0.3s ease;
}

.dot.active {
  background: white;
  transform: scale(1.5);
}

.dot.dot-magenta {
    background-color: magenta;
}

.dot.dot-turquoise {
    background-color: turquoise;
}


.close-btn-bottom {
  background: transparent;
  border: 1px solid magenta;
  color: magenta;
  padding: 8px 24px;
  border-radius: 20px;
  cursor: pointer;
  font-family: 'Great Vibes', cursive;
  font-size: 1.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: inset 0 0 8px rgba(255, 0, 255, 0.5), 0 0 8px rgba(255, 0, 255, 0.5);
}

.close-btn-bottom:hover {
  box-shadow: inset 0 0 12px rgba(255, 0, 255, 0.8), 0 0 12px rgba(255, 0, 255, 0.8);
}

.close-btn-bottom:focus,
.close-btn-bottom:focus-visible {
  outline: none;
}
</style>