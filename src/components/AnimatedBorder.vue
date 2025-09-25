<template>
  <div
    class="animated-border"
    @mousemove="handlePointerMove"
    @touchmove="handlePointerMove"
    ref="borderContainer"
  >
    <div class="animated-border-glow" :style="{ opacity: opacity1 }"></div>
    <div class="animated-border-glow-secondary" :style="{ opacity: opacity2 }"></div>
    <div class="animated-border-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useCursorTrail } from '../composables/useCursorTrail';
import { useShimmeringOpacity } from '../composables/useShimmeringOpacity';

const borderContainer = ref(null);

const { handlePointerMove } = useCursorTrail(borderContainer);
const { opacity1, opacity2 } = useShimmeringOpacity();
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

:deep(.cursor-trail-particle) {
  position: absolute;
  width: var(--particle-width, 1.5px);
  height: var(--particle-height, 25px);
  background: var(--particle-color, white);
  border-radius: 2px;

  pointer-events: none;
  transform-origin: 50% 0%;

  animation: cursor-trail-fade var(--particle-lifetime, 0.5s) forwards;
  z-index: 2;
  filter: blur(4px);
}

/* Updated to start at full opacity */
@keyframes cursor-trail-fade {
  from {
    transform: translate(-50%, 0) rotate(var(--angle-deg, 90deg)) scaleY(1);
    opacity: 1; /* Start at full opacity */
  }
  to {
    transform: translate(-50%, 0) rotate(var(--angle-deg, 90deg)) scaleY(0);
    opacity: 0;
  }
}

.animated-border-glow,
.animated-border-glow-secondary {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  animation: star-trail 4s linear infinite;
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.animated-border-content {
  position: relative;
  z-index: 1;
  background-color: #1a1a1a;
  border-radius: 18px;
}
</style>
