<template>
  <div id="app-container">
    <h1>Welcome to My PWA! 🚀</h1>
    <p>This app behaves like a native app when installed.</p>
    <button v-if="showInstallBtn" @click="installPWA">Install App</button>
  </div>
</template>

<script setup>
import { ref } from "vue";

const showInstallBtn = ref(false);
let deferredPrompt = null;

// Listen for the 'beforeinstallprompt' event
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBtn.value = true;
  console.log("PWA is installable!");
});

// Listen for the 'appinstalled' event to hide the button
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
