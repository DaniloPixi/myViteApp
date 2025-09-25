
<template>
  <!-- In-App Notification Banner -->
  <InAppNotification
    :title="inAppNotification.title"
    :body="inAppNotification.body"
    v-model:visible="inAppNotification.visible"
  />

  <!-- Fixed Notification Controls -->
  <div v-if="user && currentView === 'home' && supportsNotifications" class="notification-control-fixed">
    <button v-if="notificationPermission !== 'granted'" @click="enableNotifications" class="notification-btn enable">
      Enable Notifs
    </button>
  </div>

  <!-- The logout button is fixed to the bottom left, but only shown on the Home view -->
  <button v-if="user && currentView === 'home'" @click="logout" class="logout-button">
    <LogOut color="magenta" :size="32" />
  </button>

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
  <AnimatedBorder :max-width="animatedBorderMaxWidth">
    <div class="card">
      <main>
        <!-- Logged-in Content -->
        <div v-if="user">
        
  <div class="h-screen w-screen relative">
    <FluidEffect class="full-page-background" />
  </div>
          <!-- View Navigation -->
          <nav class="view-nav">
            <a @click="currentView = 'home'" :class="{ active: currentView === 'home' }">Home</a>
            <a @click="currentView = 'memos'" :class="{ active: currentView === 'memos' }">Memos and Moments</a>
            <a @click="currentView = 'plans'" :class="{ active: currentView === 'plans' }">Plans</a>
          </nav>

          <!-- Conditional Views -->
          <div v-if="currentView === 'home'">
             <!--Placeholder for a real home screen component -->
          </div>

          <MemosAndMoments v-if="currentView === 'memos'" 
            :location-filter="locationFilter"
            :hashtag-filter="hashtagFilter"
            :date-filter="dateFilter"
          />
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
  </AnimatedBorder>

  <!-- Global Scroll-to-Top Button -->
  <ScrollToTopButton />
</template>

<script setup>
import { ref, watch, onUnmounted, onMounted, reactive, computed } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { auth, messaging } from './firebase';
import { LogOut } from 'lucide-vue-next';
// Import child components and views
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import MemosAndMoments from './views/MemosAndMoments.vue';
import Plans from './views/Plans.vue';
import Sidebar from './components/Sidebar.vue';
import ScrollToTopButton from './components/ScrollToTopButton.vue';
import InAppNotification from './components/InAppNotification.vue'; // New component
import AnimatedBorder from './components/AnimatedBorder.vue';
import FluidEffect from './components/FluidEffect.vue';
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

// Compute dynamic max-width for the animated border
const animatedBorderMaxWidth = computed(() => {
  return currentView.value === 'home' ? '550px' : '100%';
});


// In-app notification state
const inAppNotification = reactive({
  visible: false,
  title: '',
  body: ''
});

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
    const swRegistration = await navigator.serviceWorker.ready;
    const currentToken = await messaging.getToken({
      vapidKey: 'BPACu3jz1Y3_bB4VPwO96LkPua-bJKVXBOioaf75Gc7xQQ-aqZ04a0qBSbxuX6ZW6KcPB1Lcv68zGP5qrM2q9dU',
      serviceWorkerRegistration: swRegistration
    });
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
  const { notification } = payload;
  
  if (notification && notification.title && notification.body) {
    inAppNotification.title = notification.title;
    inAppNotification.body = notification.body;
    inAppNotification.visible = true;
  } else {
      console.warn("Received foreground message with incomplete data.", payload);
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

<style scoped>
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
  background-color: transparent;
  padding: 0.5rem;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-button:hover {
    background-color: rgba(255, 0, 255, 0.1);
}

/* New Home View Styles */
.full-page-background {
  display: block !important;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1; /* Puts the element behind all other content */
  pointer-events: none; /* Allows mouse events to pass through */
}
</style>
