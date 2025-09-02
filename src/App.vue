<template>
  <div id="app-container">
    <h1>Welcome to My PWA! 🚀</h1>
    <p>This app is ready for push notifications.</p>
    <button v-if="showInstallBtn" @click="installPWA">Install App</button>
    <button @click="enableNotifications">Enable Notifications</button>
    <p v-if="notificationStatus" class="status-message">{{ notificationStatus }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { messaging, getToken, onMessage } from "./firebase";

const showInstallBtn = ref(false);
const notificationStatus = ref("");
let deferredPrompt = null;

// --- NEW: Function to send the token to your server ---
const sendTokenToServer = async (token) => {
  notificationStatus.value = "Registering your device...";
  try {
    // --- UPDATED URL to use the proxy ---
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      notificationStatus.value = "✅ Device registered for notifications!";
      console.log("Token sent to server successfully.");
    } else {
      throw new Error('Failed to register token with the server.');
    }
  } catch (error) {
    notificationStatus.value = "❌ Failed to register device.";
    console.error("Error sending token to server:", error);
  }
};

// --- UPDATED: Function to get token and send it ---
const enableNotifications = async () => {
  notificationStatus.value = "Requesting permission...";
  try {
    const token = await getToken(messaging, {
      vapidKey:
        "BPACu3jz1Y3_bB4VPwO96LkPua-bJKVXBOioaf75Gc7xQQ-aqZ04a0qBSbxuX6ZW6KcPB1Lcv68zGP5qrM2q9dU",
    });
    if (token) {
      console.log("FCM Registration Token:", token);
      await sendTokenToServer(token);
    } else {
      notificationStatus.value = "🔔 Permission denied. You can enable it in browser settings.";
      console.log("No registration token available. Request permission.");
    }
  } catch (err) {
    notificationStatus.value = "❌ An error occurred while getting the token.";
    console.error("An error occurred while retrieving token:", err);
  }
};

onMounted(() => {
  // Listener for messages when the app is in the foreground
  onMessage(messaging, (payload) => {
    console.log("Message received in the foreground:", payload);
    if (payload.notification) {
      alert(`New Message: ${payload.notification.title}`);
    }
  });
});

// PWA installation logic
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBtn.value = true;
});

const installPWA = () => {
  if (deferredPrompt) {
    showInstallBtn.value = false;
    deferredPrompt.prompt();
  }
};
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f0f2f5;
  color: #333;
}

#app-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  padding: 20px;
}

h1 {
  color: #42b883;
}

button {
  background-color: #42b883;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;
  margin-top: 1rem;
}

button:hover {
  background-color: #368f6a;
}

.status-message {
  margin-top: 1.5rem;
  font-size: 1rem;
  color: #555;
  font-weight: 500;
}
</style>
