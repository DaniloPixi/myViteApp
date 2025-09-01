<template>
  <div id="app-container">
    <h1>Welcome to My PWA! 🚀</h1>
    <p>This app behaves like a native app when installed.</p>
    <button v-if="showInstallBtn" @click="installPWA">Install App</button>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { messaging, getToken, onMessage } from "./firebase";

const showInstallBtn = ref(false);
let deferredPrompt = null;

onMounted(async () => {
  // Request permission and get the token when the app loads
  try {
    const token = await getToken(messaging, {
      vapidKey:
        "BFtbTRBYpdA5i7niGO3YPvykJGJ1zg6_JgC_2CqA3-ha5Gq6464HgJIc-9hk16x-jOytUll4mjbF2qISNFWdWy0",
    });
    if (token) {
      console.log("FCM Registration Token:", token);
      // You can now send this token to your server to store for sending notifications
    } else {
      console.log(
        "No registration token available. Request permission to generate one."
      );
    }
  } catch (err) {
    console.error("An error occurred while retrieving token:", err);
  }

  // Set up the listener for foreground messages
  onMessage(messaging, (payload) => {
    console.log("Message received in the foreground:", payload);
    // You can display a custom notification or update the UI here
    alert(`New Message: ${payload.notification.title}`);
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
}

button:hover {
  background-color: #368f6a;
}
</style>
