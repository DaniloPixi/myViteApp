<template>
  <div class="animated-border">
    <div class="animated-border-glow"></div>
    <div class="animated-border-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.animated-border {
  position: relative; /* Changed from absolute */
  max-width: 550px;   /* Added for centering */
  margin: 0 auto;     /* Added for centering */
  padding: 2px;
  border-radius: 20px;
  overflow: hidden;
}

.animated-border-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background-image: conic-gradient(
    transparent,
    rgba(214, 7, 197, 0.8),
    transparent 30%
  );
  animation: star-trail 4s linear infinite;
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
  border-radius: 18px;
}
</style>
