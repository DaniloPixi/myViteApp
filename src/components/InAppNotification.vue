<template>
  <div v-if="visible" class="in-app-notification" @click="dismiss">
    <div class="ian-panel">
      <div class="ian-content">
        <div class="ian-icon">
  <img src="/icons/manifest-icon-192-maskable.png" alt="icon" />
</div>


        <div class="ian-text">
          <h5 class="ian-title">{{ title }}</h5>
          <p class="ian-body">{{ body }}</p>
        </div>

        <button class="ian-close" @click.stop="dismiss">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['update:visible']);

// No auto-dismiss: stays until user clicks
const dismiss = () => {
  emit('update:visible', false);
};
</script>

<style scoped>
.in-app-notification {
  position: fixed;
  top: 1.2rem;
  left: 50%;
  transform: translateX(-50%);
  width: min(640px, 96vw); /* bigger, but still responsive */
  z-index: 2000;
  cursor: pointer;

  animation: ian-pop-in 0.35s cubic-bezier(0.19, 1, 0.22, 1);
}

/* Main panel – neon/glass look */
.ian-panel {
  position: relative;
  padding: 0.85rem 1.6rem;
  border-radius: 18px;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.08), transparent 65%),
    rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 0, 255, 0.75);
  box-shadow:
    0 0 20px rgba(255, 0, 255, 0.7),
    0 0 26px rgba(0, 255, 255, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  animation: ian-border-glow 2.5s ease-in-out infinite alternate;
}

/* subtle fading edges if content wraps */
.ian-panel::before,
.ian-panel::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 10px;
  pointer-events: none;
  z-index: 1;
}

.ian-panel::before {
  top: 0;
  border-radius: 18px 18px 0 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.95), transparent);
}

.ian-panel::after {
  bottom: 0;
  border-radius: 0 0 18px 18px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95), transparent);
}

.ian-content {
  position: relative;
  z-index: 2;

  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Icon block */
.ian-icon {
  flex: 0 0 auto;
  width: 50px;
  height: 50px;
  border-radius: 14px;
  overflow: hidden;

  background:
    radial-gradient(circle at 0% 0%, rgba(0, 255, 255, 0.18), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(255, 0, 255, 0.18), transparent 60%),
    rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow:
    0 0 12px rgba(255, 0, 255, 0.5),
    0 0 16px rgba(0, 255, 255, 0.4);

  display: flex;
  align-items: center;
  justify-content: center;
}

.ian-icon img {
  width: 30px;
  height: 30px;
  display: block;
}

/* Text block */
.ian-text {
  flex: 1 1 auto;
  min-width: 0;
}

.ian-title {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0.03em;

  font-family: 'Great Vibes', cursive;
  color: #ffeaff;
  text-shadow:
    0 0 6px rgba(255, 0, 255, 0.35),
    0 0 12px rgba(0, 255, 255, 0.3);
}

/* Gradient + transparency on the body text */
.ian-body {
  margin: 0.3rem 0 0;
  font-size: 0.98rem;
  line-height: 1.55;
  font-weight: 400;
  letter-spacing: 0.02em;
  white-space: pre-line;

  /* gradient text */
  background: linear-gradient(
    120deg,
    rgba(255, 0, 255, 0.95),
    rgba(0, 255, 255, 0.95)
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0.96;
}

/* Close button – ghost neon pill */
.ian-close {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 0.1rem 0.7rem 0.2rem;
  font-size: 1.5rem;
  line-height: 1;

  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.7);
  color: #f5f5ff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ian-close:hover {
  border-color: rgba(0, 255, 255, 0.95);
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.7);
  transform: translateY(-0.5px);
}

/* Animations */

@keyframes ian-border-glow {
  0% {
    border-color: rgba(255, 0, 255, 0.85);
    box-shadow:
      0 0 18px rgba(255, 0, 255, 0.85),
      0 0 22px rgba(0, 255, 255, 0.4);
  }
  50% {
    border-color: rgba(0, 255, 255, 0.95);
    box-shadow:
      0 0 22px rgba(0, 255, 255, 0.9),
      0 0 30px rgba(255, 0, 255, 0.5);
  }
  100% {
    border-color: rgba(255, 0, 255, 0.9);
    box-shadow:
      0 0 18px rgba(255, 0, 255, 0.8),
      0 0 26px rgba(0, 255, 255, 0.5);
  }
}

@keyframes ian-pop-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-14px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

/* Small screens */
@media (max-width: 480px) {
  .in-app-notification {
    top: 0.6rem;
    width: 96vw;
  }

  .ian-panel {
    padding: 0.6rem 0.9rem;
    border-radius: 16px;
  }

  .ian-content {
    gap: 0.6rem;
  }

  .ian-title {
    font-size: 1.05rem;
  }

  .ian-body {
    font-size: 0.85rem;
  }

  .ian-icon {
    width: 40px;
    height: 40px;
  }

  .ian-icon img {
    width: 24px;
    height: 24px;
  }

  .ian-close {
    font-size: 1.3rem;
    padding: 0.05rem 0.55rem 0.15rem;
  }
}
</style>
