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
  background:
    radial-gradient(circle at 22% 20%, rgba(0, 255, 255, 0.12), transparent 62%),
    radial-gradient(circle at 78% 82%, rgba(255, 0, 255, 0.12), transparent 62%),
    rgba(10, 10, 16, 0.14);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: rgba(120, 255, 235, 0.88);
  opacity: 0.92;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  text-shadow:
    0 0 7px rgba(0, 255, 255, 0.38),
    0 0 12px rgba(255, 0, 255, 0.22);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
  transition: transform 0.24s ease-out, box-shadow 0.24s ease-out, color 0.24s ease-out, opacity 0.24s ease-out;
}

.scroll-to-top-button:hover {
  transform: translateY(-3px) scale(1.06);
  color: rgba(214, 21, 172, 0.98);
  opacity: 1;
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.32);
}

.scroll-to-top-button:focus,
.scroll-to-top-button:focus-visible,
.scroll-to-top-button:active {
  outline: none;
  border: none;
}
</style>
