<template>
  <div v-if="visible" class="in-app-notification" @click="dismiss">
    <div class="notification-content">
      <div class="notification-icon">
        <img src="/icon.svg" alt="icon" />
      </div>
      <div class="notification-text">
        <h5 class="notification-title">{{ title }}</h5>
        <p class="notification-body">{{ body }}</p>
      </div>
      <button class="close-btn" @click.stop="dismiss">&times;</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

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

let timeoutId = null;

const dismiss = () => {
  emit('update:visible', false);
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
};

watch(() => props.visible, (newValue) => {
  if (newValue) {
    // Auto-dismiss after 5 seconds
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      dismiss();
    }, 5000);
  }
});
</script>

<style scoped>
.in-app-notification {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 500px;
  background-color: rgba(40, 40, 40, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  z-index: 2000;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.notification-content {
  display: flex;
  align-items: center;
}

.notification-icon img {
  width: 40px;
  height: 40px;
  margin-right: 1rem;
}

.notification-text {
  flex-grow: 1;
}

.notification-title {
  margin: 0;
  font-weight: 600;
  font-size: 1.1em;
  color: #42b883; /* Vue green for consistency */
}

.notification-body {
  margin: 0.25rem 0 0;
  line-height: 1.4;
  font-size: 0.95em;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.8em;
  line-height: 1;
  padding: 0 0.5rem;
  cursor: pointer;
}
</style>
