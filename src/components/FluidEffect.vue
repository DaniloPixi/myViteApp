<template>
    <div class="fluid-container">
      <canvas id="fluid" />
    </div>
  </template>
  
  <script setup>
  import { onMounted, onUnmounted } from 'vue';
import useFluidCursor from '../composables/fluid-cursor';
  
  let cleanupFluid = null;
  
  onMounted(() => {
    // Use a try-catch block for robust error handling.
    try {
      const fluidInstance = useFluidCursor();
      cleanupFluid = fluidInstance.dispose();
    } catch (error) {
      console.error('Error initializing fluid effect:', error);
    }
  });
  
  onUnmounted(() => {
    if (cleanupFluid) {
      cleanupFluid();
    }
  });
  </script>
  
  <style scoped>
  .fluid-container {
    width: 100%;
    height: 100%;
  }
  </style>