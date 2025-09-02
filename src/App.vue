<template>
  <div id="app-container">
    <h1>Welcome to My PWA! 🚀</h1>
    <p>This app behaves like a native app when installed.</p>
    <button v-if="showInstallBtn" @click="installPWA">Install App</button>
    <button @click="logToken">Log Token</button>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { messaging, getToken, onMessage } from "./firebase";

const showInstallBtn = ref(false);
let deferredPrompt = null;

const logToken = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey:
        "BPACu3jz1Y3_bB4VPwO96LkPua-bJKVXBOioaf75Gc7xQQ-aqZ04a0qBSbxuX6ZW6KcPB1Lcv68zGP5qrM2q9dU",
    });
    if (token) {
      console.log("FCM Registration Token:", token);
      alert(`FCM Token: ${token}`)
    } else {
      console.log("No registration token available. Request permission.");
    }
  } catch (err) {
    console.error("An error occurred while retrieving token:", err);
  }
}

onMounted(async () => {
  // Set up the listener for foreground messages
  onMessage(messaging, (payload) => {
    console.log("Message received in the foreground:", payload);
    // Check if the payload has a notification object
    if (payload.notification) {
      alert(`New Message: ${payload.notification.title}`);
    } else {
      // This is a data-only message, so handle it differently
      console.log("Received a data-only message:", payload.data);
    }
  });
});

// PWA installation logic from before
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBtn.value = true;
  console.log("PWA is installable!");
});

window.addEventListener("appinstalled", () => {
  showInstallBtn.value = false;
  console.log("PWA was installed!");
});

const installPWA = () => {
  if (deferredPrompt) {
    showInstallBtn.value = false;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt.");
      } else {
        console.log("User dismissed the install prompt.");
      }
      deferredPrompt = null;
    });
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
</style>
