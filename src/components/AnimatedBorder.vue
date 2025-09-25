<template>
  <div class="animated-border">
    <div class="animated-border-glow" :style="{ opacity: opacity1 }"></div>
    <div class="animated-border-glow-secondary" :style="{ opacity: opacity2 }"></div>
    <div class="animated-border-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const opacity1 = ref(0.8);
const opacity2 = ref(0.8);
let intervalId = null;

// This function creates a "walker" that randomly moves a value up and down within a range.
const createNoiseGenerator = (initialValue, min, max, step) => {
  let value = initialValue;
  return () => {
    // Move the value by a random amount in a random direction
    const direction = Math.random() > 0.5 ? 1 : -1;
    value += direction * Math.random() * step;

    // Clamp the value to the min/max range
    if (value > max) value = max;
    if (value < min) value = min;
    
    return value;
  };
};

const generateOpacity1 = createNoiseGenerator(0.8, 0.3, 1.0, 0.15);
const generateOpacity2 = createNoiseGenerator(0.8, 0.3, 1.0, 0.15);

onMounted(() => {
  intervalId = setInterval(() => {
    opacity1.value = generateOpacity1();
    opacity2.value = generateOpacity2();
  }, 100); // The opacity will update every 100ms
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<style scoped>
.animated-border {
  position: relative;
  max-width: 550px;
  margin: 0 auto;
  padding: 2px;
  border-radius: 20px;
  overflow: hidden;
}

.animated-border-glow,
.animated-border-glow-secondary {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  animation: star-trail 4s linear infinite;
  /* This transition will smooth out the opacity changes */
  transition: opacity 0.7s ease-in-out;
}

.animated-border-glow {
  background-image: conic-gradient(
    transparent,
    rgba(214, 7, 197, 0.8), /* Magenta */
    transparent 30%
  );
}

.animated-border-glow-secondary {
  background-image: conic-gradient(
    transparent,
    rgba(7, 197, 214, 0.8), /* Cyan */
    transparent 30%
  );
  animation-direction: reverse;
}

@keyframes star-trail {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animated-border-content {
  position: relative;
  z-index: 1;
  background-color: transparent;
  border-radius: 18px;
}
</style>
