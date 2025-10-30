<template>
  <transition name="fade">
    <button v-if="isVisible" @click="scrollToTop" class="scroll-to-top-button" aria-label="Scroll to top">
      ▲
    </button>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const isVisible = ref(false);
let animationFrameId = null;

const handleScroll = () => {
  isVisible.value = window.scrollY > 300;
};

const stopAnimation = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    // Clean up interruption listeners
    window.removeEventListener('wheel', stopAnimation, { passive: true });
    window.removeEventListener('touchstart', stopAnimation, { passive: true });
  }
};


const scrollToTop = () => {
  // Stop any existing animation before starting a new one
  stopAnimation();

  const startingY = window.scrollY || document.documentElement.scrollTop;
  const duration = 1000; // milliseconds
  let start = null;

  // Add event listeners to detect user interruption
  window.addEventListener('wheel', stopAnimation, { passive: true });
  window.addEventListener('touchstart', stopAnimation, { passive: true });

  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    const progressPercentage = Math.min(progress / duration, 1);

    const easeOutQuint = 1 - Math.pow(1 - progressPercentage, 5);
    window.scrollTo(0, startingY * (1 - easeOutQuint));

    if (progress < duration) {
      animationFrameId = window.requestAnimationFrame(step);
    } else {
      stopAnimation(); // Clean up listeners when animation completes
    }
  };

  animationFrameId = window.requestAnimationFrame(step);
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  stopAnimation(); // Ensure no listeners are left hanging
});
</script>

<style scoped>
.scroll-to-top-button {
  position: fixed;
  bottom: 25px;
  right: 25px;
  background-color: #b8429b50;
  color: magenta;
  border: 1px solid magenta;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  transition: background-color 0.3s, transform 0.2s ease-out;
}

.scroll-to-top-button:hover {
  background-color: #0d0e0d00;
  outline:none;
  transform: translateY(-3px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
