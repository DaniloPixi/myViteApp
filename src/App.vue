
<template>
  <CursorTrail />
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
    <header class="page-header" v-if="currentView === 'home'">
        <h1 v-if="user" class="bounce-in">Welcome, {{ user.displayName || user.email }}</h1>
        <h1 v-else class="bounce-in">Auth Portal</h1>
    </header>
  </div>
  

  <!-- The main content card -->
  <AnimatedBorder :max-width="animatedBorderMaxWidth">
    <div class="card" :class="{ 'is-full-width': currentView !== 'home' }">
      <main>
        <!-- Logged-in Content -->
        <div v-if="user">
          <!-- View Navigation -->
          <nav class="view-nav">
            <a @click="currentView = 'home'" :class="{ active: currentView === 'home' }" :style="getNavStyle('home', 0)">Home</a>
            <a @click="currentView = 'memos'" :class="{ active: currentView === 'memos' }" :style="getNavStyle('memos', 1)">Memos and Moments</a>
            <a @click="currentView = 'plans'" :class="{ active: currentView === 'plans' }" :style="getNavStyle('plans', 2)">Plans</a>
          </nav>

          <!-- Conditional Views -->
          <transition name="slide-fade" mode="out-in">
            <div :key="currentView">
              <div v-if="currentView === 'home'">
                 <button @click="sendLoveNotification" class="love-button">Send Love</button>
                 <CombinedCalendar
                    :memos="memos"
                    :plans="plans"
                 />
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
          </transition>
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
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { LogOut } from 'lucide-vue-next';
// Import child components and views
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import MemosAndMoments from './views/MemosAndMoments.vue';
import Plans from './views/Plans.vue';
import CombinedCalendar from './components/CombinedCalendar.vue';
import Sidebar from './components/Sidebar.vue';
import ScrollToTopButton from './components/ScrollToTopButton.vue';
import InAppNotification from './components/InAppNotification.vue';
import AnimatedBorder from './components/AnimatedBorder.vue';
import CursorTrail from './components/CursorTrail.vue';

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
const navColors = ref([]);

// --- Centralized Data for Calendar ---
const memos = ref([]);
const plans = ref([]);
let unsubscribeMemos = null;
let unsubscribePlans = null;

// Compute dynamic max-width for the animated border
const animatedBorderMaxWidth = computed(() => {
  return '100%';
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

// --- Watch for view changes & reset filters ---
watch(currentView, (newView) => {
  localStorage.setItem('currentView', newView);
  // Reset filters whenever the view changes to ensure a clean state
  locationFilter.value = '';
  hashtagFilter.value = '';
  dateFilter.value = '';
  timeFilter.value = '';
  durationFilter.value = [];
});

// --- Component Switching ---
const handleSwitchForm = (formName) => {
  isRegistering.value = formName === 'register';
};

const getNavStyle = (view, index) => {
    const style = { '--active-color': navColors.value[index] };
    if (currentView.value === view) {
        style.color = navColors.value[index];
    }
    return style;
};

// --- Firestore Data Subscription for Calendar ---
const setupDataListeners = () => {
  if (!auth.currentUser) return;
  const db = getFirestore();

  // Memos listener
  const memosQuery = query(collection(db, 'memos'), orderBy('createdAt', 'desc'));
  unsubscribeMemos = onSnapshot(memosQuery, (snapshot) => {
    memos.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }, (err) => {
    console.error("Error fetching memos for calendar:", err);
  });

  // Plans listener
  const plansQuery = query(collection(db, 'plans'), orderBy('date', 'desc'));
  unsubscribePlans = onSnapshot(plansQuery, (snapshot) => {
    plans.value = snapshot.docs.map(doc => {
      const data = doc.data();
      const date = new Date(data.date);
      if (data.time) {
        const timeParts = data.time.match(/(\d{2}):(\d{2})/);
        if (timeParts) {
          date.setHours(timeParts[1], timeParts[2]);
        }
      }
      return {
        id: doc.id,
        ...data,
        creationDate: doc.createTime ? doc.createTime.toDate() : new Date(),
        fullDate: date,
      };
    });
  }, (err) => {
    console.error("Error fetching plans for calendar:", err);
  });
};

const clearDataListeners = () => {
  if (unsubscribeMemos) unsubscribeMemos();
  if (unsubscribePlans) unsubscribePlans();
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
    setupDataListeners(); // Fetch data for calendar
  } else {
    clearDataListeners(); // Clean up listeners on logout
    localStorage.removeItem('currentView');
    currentView.value = 'home';
  }
});

const logout = () => {
  auth.signOut();
};

async function sendLoveNotification() {
  if (!user.value) return;
  try {
    const idToken = await user.value.getIdToken(true);
    const response = await fetch('/api/send-love', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || `Server responded with ${response.status}`);
    }
    const result = await response.json();
    inAppNotification.title = "Message Sent!";
    inAppNotification.body = "You've sent an 'I love you' notification.";
    inAppNotification.visible = true;
  } catch (error) {
    console.error('Error sending "I love you" notification:', error);
  }
}

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
  const colors = ['magenta', 'turquoise'];
  const startingColorIndex = Math.round(Math.random());
  navColors.value = ['home', 'memos', 'plans'].map((_, index) => {
      return colors[(startingColorIndex + index) % 2];
  });
});

onUnmounted(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth();
  }
  clearDataListeners(); // Clean up listeners when component is destroyed
});
</script>

<style scoped>
@keyframes bounce-in {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.love-button {
  font-family: 'Great Vibes', cursive;
  font-size: 1.8rem;
  background-color: #0e0d0d00; /* A pink/magenta color */
  color: rgb(253, 8, 200);
  padding: 1rem 2rem;
  border-radius: 2rem;
  border: none;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: block;
  margin: 2rem auto;
}

.love-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 10px rgba(255, 64, 129, 0.5);
}

.bounce-in {
  animation: bounce-in 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 101;
  padding-top: 1rem;
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
  color: var(--active-color);
}

.view-nav a.active {
  color: var(--active-color);
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

.logout-button {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  background-color: transparent;
  padding: 0.5rem;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: background-color 1s;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-button:hover {
    background-color: rgba(245, 8, 245, 0.356);
}

.card.is-full-width {
  max-width: 90%;
  width: 90%;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

@media (max-width: 768px) {
  .view-nav a {
    font-size: 1.2rem; 
  }
}
</style>
