
<template>
  <!-- Fixed Notification Controls -->
  <div v-if="user && currentView === 'home' && supportsNotifications" class="notification-control-fixed">
    <button v-if="notificationPermission === 'granted'" class="notification-btn granted" disabled>
      ✓ Notifs On
    </button>
    <button v-else @click="enableNotifications" class="notification-btn enable">
      Enable Notifs
    </button>
  </div>

  <!-- The logout button is fixed to the bottom left, but only shown on the Home view -->
  <button v-if="user && currentView === 'home'" @click="logout" class="logout-button">Logout</button>

  <div class="sticky-header">
    <Sidebar 
      v-if="currentView === 'plans' || currentView === 'memos'"
      v-model:location="locationFilter"
      v-model:hashtags="hashtagFilter"
      v-model:date="dateFilter"
      v-model:time="timeFilter"
      v-model:duration="durationFilter" 
    />
    <header class="page-header">
        <h1 v-if="user">Welcome, {{ user.displayName || user.email }}</h1>
        <h1 v-else>Auth Portal</h1>
    </header>
  </div>
  
  <!-- The main content card -->
  <div class="card">
    <main>
      <!-- Logged-in Content -->
      <div v-if="user">
        <!-- View Navigation -->
        <nav class="view-nav">
          <a @click="currentView = 'home'" :class="{ active: currentView === 'home' }">Home</a>
          <a @click="currentView = 'memos'" :class="{ active: currentView === 'memos' }">Memos and Moments</a>
          <a @click="currentView = 'plans'" :class="{ active: currentView === 'plans' }">Plans</a>
        </nav>

        <!-- Conditional Views -->
        

        <MemosAndMoments v-if="currentView === 'memos'" />
        <Plans 
          v-if="currentView === 'plans'" 
          :user="user"
          :location-filter="locationFilter"
          :hashtag-filter="hashtagFilter"
          :date-filter="dateFilter"
          :time-filter="timeFilter"
          :duration-filter="durationFilter" 
        />
      </div>

      <!-- Authentication Views (Logged-out) -->
      <div v-else>
        <Login v-if="!isRegistering" @switch-form="handleSwitchForm" />
        <Register v-else @switch-form="handleSwitchForm" />
      </div>
    </main>
  </div>

  <!-- Global Scroll-to-Top Button -->
  <ScrollToTopButton />
</template>

<script setup>
import { ref, watch, onUnmounted, onMounted } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { auth, messaging, db } from './firebase';

// Import child components and views
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import MemosAndMoments from './views/MemosAndMoments.vue';
import Plans from './views/Plans.vue';
import Sidebar from './components/Sidebar.vue';
import ScrollToTopButton from './components/ScrollToTopButton.vue';

// --- PWA Auto-Update Logic ---
const { needRefresh, updateServiceWorker } = useRegisterSW();
watch(needRefresh, (isUpdateAvailable) => {
  if (isUpdateAvailable) {
    updateServiceWorker();
  }
});
// --- End of PWA Auto-Update Logic ---

// --- Reactive State ---
const user = ref(null);
const isRegistering = ref(false);
const notificationPermission = ref(null);
const supportsNotifications = ref(false);
const currentView = ref(localStorage.getItem('currentView') || 'home');

// --- Filter State ---
const locationFilter = ref('');
const hashtagFilter = ref('');
const dateFilter = ref('');
const timeFilter = ref('');
const durationFilter = ref([]);

// --- Watch for view changes ---
watch(currentView, (newView) => {
  localStorage.setItem('currentView', newView);
});

// --- Component Switching ---
const handleSwitchForm = (formName) => {
  isRegistering.value = formName === 'register';
};

// --- Core Notification Logic ---
async function registerDeviceForNotifications() {
  if (notificationPermission.value !== 'granted' || !user.value) return;
  try {
    const currentToken = await messaging.getToken({ vapidKey: 'BPACu3jz1Y3_bB4VPwO96LkPua-bJKVXBOioaf75Gc7xQQ-aqZ04a0qBSbxuX6ZW6KcPB1Lcv68zGP5qrM2q9dU' });
    if (currentToken) {
      await sendTokenToServer(currentToken);
    } else {
      console.log('No registration token available.');
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
  }
}

async function enableNotifications() {
  if (!supportsNotifications.value) {
    console.error('This browser does not support desktop notification');
    return;
  }
  const permission = await Notification.requestPermission();
  notificationPermission.value = permission;
  if (permission === 'granted') {
    await registerDeviceForNotifications();
  }
}

// --- Authentication State Management ---
const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
  user.value = currentUser;
  if (currentUser) {
    registerDeviceForNotifications();
  } else {
    localStorage.removeItem('currentView');
    currentView.value = 'home';
  }
});

const logout = () => {
  auth.signOut();
};

// --- Push Notification API Calls ---
async function sendTokenToServer(token) {
  if (!user.value) return;
  try {
    const idToken = await user.value.getIdToken(true);
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}` 
      },
      body: JSON.stringify({ token: token }),
    });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || `Server responded with ${response.status}`);
    }
    const result = await response.json();
    console.log('Token successfully registered with the server:', result.message);
  } catch (error) {
    console.error('Error sending token to server:', error);
  }
}

// --- Foreground Message Handling ---
messaging.onMessage((payload) => {
  console.log('Foreground message received.', payload);
  const { title, body } = payload.data;
  const notificationOptions = {
    body,
    icon: '/manifest-icon-192.maskable.png'
  };
  if (title) {
      new Notification(title, notificationOptions);
  } else {
      console.warn("Received foreground message without a title.", payload);
  }
});

// --- Lifecycle Hooks ---
onMounted(() => {
  // This code only runs on the client, where `window` is guaranteed to exist.
  supportsNotifications.value = 'Notification' in window;
  if (supportsNotifications.value) {
    notificationPermission.value = Notification.permission;
  }
});

onUnmounted(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth();
  }
});
</script>

<style>
html {
  scroll-behavior: smooth;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 101;
  padding-top: 1rem;
}

.page-header {
  text-align: center;
  margin: 1rem 0 2rem;
}

.page-header h1 {
  font-size: 2.2em;
  color: #42b883;
  margin: 0;
  font-weight: 600;
}

.card {
  max-width: 550px;
  margin: 0 auto;
  padding: 2.5em;
  border-radius: 20px;
  background: rgba(36, 36, 36, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.view-nav {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  border-bottom: 1px solid #444;
  padding-bottom: 1rem;
}

.view-nav a {
  margin: 0 1.5rem;
  cursor: pointer;
  color: #aaa;
  font-weight: 500;
  transition: color 0.3s;
}

.view-nav a:hover {
  color: #42b883;
}

.view-nav a.active {
  color: #42b883;
  border-bottom: 2px solid #42b883;
  padding-bottom: 4px;
}

.notification-control-fixed {
  position: fixed;
  bottom: 5rem; /* Positioned above the logout button */
  left: 1.5rem;
  z-index: 10;
}

.notification-btn {
  padding: 0.7em 1.2em;
  border-radius: 8px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  width: 110px; /* To match logout button roughly */
  text-align: center;
}

.notification-btn.enable {
  background-color: #42b883;
  color: white;
}

.notification-btn.enable:hover {
  background-color: #36a473;
}

.notification-btn.granted {
  background-color: #555;
  color: #ccc;
  cursor: default;
}

.logout-button {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  background-color: #555;
  padding: 0.7em 1.2em;
  border-radius: 8px;
  border: none;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  z-index: 10;
}

.logout-button:hover {
    background-color: #666;
}

.error {
  color: #ff6b6b;
  margin-top: 1rem;
}

/* New Home View Styles */

</style>
