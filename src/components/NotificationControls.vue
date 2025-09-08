<template>
  <div class="notification-controls">
    <strong>Notifications</strong>
    <button @click="handleEnableNotifications" :disabled="notificationPermission === 'granted'">
      {{ notificationPermission === 'granted' ? 'Enabled' : 'Enable' }}
    </button>
    <p v-if="notificationPermission === 'denied'" class="error">
      Permission was denied.
    </p>
    
    <button @click="sendTestNotificationToSelf" :disabled="notificationPermission !== 'granted'">
        Send Test
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  notificationPermission: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['enable-notifications']);

const handleEnableNotifications = () => {
  emit('enable-notifications');
};

const sendTestNotificationToSelf = () => {
  if (props.notificationPermission !== 'granted') {
    console.warn('Notification permission is not granted.');
    return;
  }
  
  const notificationTitle = 'Test Notification';
  const notificationOptions = {
    body: 'This is a test message to confirm notifications are working!',
    icon: '/pwa-192x192.png',
  };

  new Notification(notificationTitle, notificationOptions);
};
</script>

<style scoped>
.notification-controls {
  background-color: #2a2a2a;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #444;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  align-items: center;
}
.notification-controls strong {
  color: #42b883;
  font-size: 1.1em;
}
button {
  width: 100%;
  padding: 0.6em 1em;
  border-radius: 6px;
  border: 1px solid #555;
  background-color: #3a3a3a;
  color: #ccc;
  cursor: pointer;
  transition: background-color 0.2s;
}
button:hover:not(:disabled) {
  background-color: #4a4a4a;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.error {
  color: #ff6b6b;
  font-size: 0.9em;
  margin: 0;
}
</style>
