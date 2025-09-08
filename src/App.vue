
<template>
  <!-- The logout button remains fixed to the top left of the page -->
  <button v-if="user" @click="logout" class="logout-button">Logout</button>

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
        <NotificationControls v-if="currentView === 'home'" 
          :notificationPermission="notificationPermission" 
          @enable-notifications="enableNotifications" 
        />
        <MemosAndMoments v-if="currentView === 'memos'" />
        <!-- Plans view now receives all filter states as props -->
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
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { auth, messaging, db } from './firebase';

// Import child components and views
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import NotificationControls from './components/NotificationControls.vue';
import MemosAndMoments from './views/MemosAndMoments.vue';
import Plans from './views/Plans.vue';
import Sidebar from './components/Sidebar.vue';

// --- Reactive State ---
const user = ref(null);
const isRegistering = ref(false);
const notificationPermission = ref(null);
const currentView = ref(localStorage.getItem('currentView') || 'home');

// --- Filter State (Now lives in the main App component) ---
const locationFilter = ref('');
const hashtagFilter = ref('');
const dateFilter = ref('');
const timeFilter = ref('');
const durationFilter = ref([]); // Changed to an array

// --- Watch for view changes and save to localStorage ---
watch(currentView, (newView) => {
  localStorage.setItem('currentView', newView);
});

if ('Notification' in window) {
  notificationPermission.value = Notification.permission;
}

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
  if (!('Notification' in window)) {
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
    const idToken = await user.value.getIdToken(true); // Force refresh the token
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
  const notificationTitle = payload.notification?.title || payload.data?.title;
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body,
    icon: '/pwa-192x192.png'
  };
  if (notificationTitle) {
      new Notification(notificationTitle, notificationOptions);
  } else {
      console.warn("Received foreground message without a title.", payload);
  }
});

// --- Lifecycle Hooks ---
onUnmounted(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth();
  }
});
</script>

<style>
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #1a1a1a; /* Match the body background */
  padding-top: 1rem;
}

.page-header {
  text-align: center;
  margin: 1rem 0 2rem; /* Adjusted margin for sticky layout */
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
  border-radius: 12px;
  background-color: #242424;
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

.logout-button {
  position: fixed;
  top: 1.5rem;
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
</style>
