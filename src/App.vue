<template>
  <P5StarfieldBackground>
    <CursorTrail />
    <div
  v-if="user"
  class="presence-floating-wrap"
  :title="`Partner is ${partnerPresenceStatus}`"
  aria-label="Partner presence"
>
  <span
    class="presence-floating-star"
    :class="`presence-${partnerPresenceStatus}`"
  >
    ✦
  </span>
</div>
    <!-- In-App Notification Banner -->
    <InAppNotification
      :title="inAppNotification.title"
      :body="inAppNotification.body"
      v-model:visible="inAppNotification.visible"
      @click="handleInAppNotificationClick"
    />

    <NotificationStack
      :show-launcher="shouldShowNotificationStackLauncher"
      :unread-count="unreadStackNotifications.length"
      :notifications="unreadStackNotifications"
      :visible="isNotificationStackVisible"
      :is-mobile="isMobileDevice"
      @toggle="toggleNotificationStack"
      @dismiss="dismissStackNotification"
      @open="openStackNotification"
    />

    <!-- Fixed Notification Controls -->
    <div v-if="user && currentView === 'home' && supportsNotifications" class="notification-control-fixed">
      <button
        v-if="notificationPermission !== 'granted'"
        @click="enableNotifications"
        class="notification-btn enable"
      >
        Enable Notifs
      </button>
    </div>

    <!-- The logout button is fixed to the bottom left, but only shown on the Home view -->
    <button v-if="user && currentView === 'home'" @click="logout" class="logout-button">
      <LogOut color="magenta" :size="32" />
    </button>

    <div class="sticky-header">
      <Sidebar
        v-if="currentView === 'plans' || currentView === 'memos' || currentView === 'capsules'"
        v-model:location="locationFilter"
        v-model:hashtags="hashtagFilter"
        v-model:date="dateFilter"
        v-model:time="timeFilter"
        v-model:duration="durationFilter"
        v-model:lockStatus="lockStatusFilter"
        :enabled-filters="enabledFilters"
      />
      <header class="page-header" v-if="currentView === 'home'">
        <h1 v-if="user" class="bounce-in welcome-line">
  <span>Welcome, {{ user.displayName || user.email }}</span>
</h1>
        <h1 v-else class="bounce-in">Auth Portal</h1>
      </header>
    </div>

    <!-- The main content card -->
    <div class="centered-content-container">
      <div class="card" :class="{ 'is-full-width': currentView !== 'home', 'home-view-card': currentView === 'home' }">
        <main>
          <!-- Logged-in Content -->
          <div v-if="user">
            <!-- View Navigation -->
            <nav class="view-nav">
              <a
                @click="currentView = 'home'"
                :class="{ active: currentView === 'home' }"
                :style="getNavStyle('home', 0)"
              >Home</a>
              <a
                @click="currentView = 'memos'"
                :class="{ active: currentView === 'memos' }"
                :style="getNavStyle('memos', 1)"
              >Moments</a>
              <a
                @click="currentView = 'plans'"
                :class="{ active: currentView === 'plans' }"
                :style="getNavStyle('plans', 2)"
              >Plans</a>
              <!-- 🔥 NEW: Time Capsules tab -->
              <a
                @click="currentView = 'capsules'"
                :class="{ active: currentView === 'capsules' }"
                :style="getNavStyle('capsules', 3)"
              >
              Capsules
              </a>
              <a
                @click="currentView = 'map'"
                :class="{ active: currentView === 'map' }"
                :style="getNavStyle('map', 4)"
              >
              Map
              </a>
            </nav>

            <!-- Conditional Views -->
            <transition name="slide-fade" mode="out-in">
              <div :key="currentView">
                <div v-if="currentView === 'home'">
                  <button @click="sendLoveNotification" class="love-button">Send Love</button>
                  <div class="calendar-container">
                    <DailyQuestWidget />
                    <CombinedCalendar :memos="memos" :plans="plans" />
                  </div>
                </div>

                <MemosAndMoments
                  v-if="currentView === 'memos'"
                  :location-filter="locationFilter"
                  :hashtag-filter="hashtagFilter"
                  :date-filter="dateFilter"
                  :focus-memo-id="focusMemoId"
                />

                <Plans
                  v-if="currentView === 'plans'"
                  :user="user"
                  :location-filter="locationFilter"
                  :hashtag-filter="hashtagFilter"
                  :date-filter="dateFilter"
                  :time-filter="timeFilter"
                  :duration-filter="durationFilter"
                  :focus-plan-id="focusPlanId"
                />

                <TimeCapsulesView
                  v-if="currentView === 'capsules'"
                  :date-filter="dateFilter"
                  :lock-status-filter="lockStatusFilter"
                  :focus-capsule-id="focusCapsuleId"
                />
                <MapSpotsView v-if="currentView === 'map'" />
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
    </div>

    <!-- Global Scroll-to-Top Button -->
    <ScrollToTopButton />
  </P5StarfieldBackground>
</template>

<script setup>
import { ref, watch, onUnmounted, onMounted, reactive, computed } from 'vue';
import { auth, messaging,db } from './firebase';
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
import NotificationStack from './components/NotificationStack.vue';
import MapSpotsView from './views/MapSpotsView.vue';
import CursorTrail from './components/CursorTrail.vue';
import P5StarfieldBackground from './components/P5StarfieldBackground.vue';
import DailyQuestWidget from './components/DailyQuestWidget.vue';
import TimeCapsulesView from './views/TimeCapsulesView.vue';
import { usePwaAutoUpdate } from './composables/usePwaAutoUpdate';
import { useViewFilters } from './composables/useViewFilters';
import { useCalendarData } from './composables/useCalendarData';
import { forceReloadCalendarQuests } from './composables/useDailyQuests';
import { usePresence } from './composables/usePresence';

usePwaAutoUpdate();
usePresence();

// --- Reactive State ---
const user = ref(null);
const isRegistering = ref(false);
const notificationPermission = ref(null);
const supportsNotifications = ref(false);
const navColors = ref([]);
const partnerPresenceStatus = ref('offline');
let unsubscribePartnerPresence = null;
// --- Centralized Data for Calendar ---
const { memos, plans, setupDataListeners, clearDataListeners } = useCalendarData();

const focusMemoId = ref(null);
const focusPlanId = ref(null);
const focusCapsuleId = ref(null);
const lastNotificationData = ref(null);
const notificationQueue = ref([]);
// In-app notification state
const inAppNotification = reactive({
  visible: false,
  title: '',
  body: ''
});
const notificationStack = ref([]);
const isNotificationStackVisible = ref(false);
const hasTabBeenUnfocused = ref(false);
const isMobileDevice = ref(false);

const unreadStackNotifications = computed(() =>
  notificationStack.value
    .filter((notification) => notification.status === 'unread')
    .sort((a, b) => b.createdAt - a.createdAt)
);

const shouldShowNotificationStackLauncher = computed(() => {
  const reachedThreshold = unreadStackNotifications.value.length >= 3;
  if (!reachedThreshold) return false;
  if (isMobileDevice.value) return true;
  return hasTabBeenUnfocused.value;
});

const {
  currentView,
  locationFilter,
  hashtagFilter,
  dateFilter,
  timeFilter,
  durationFilter,
  lockStatusFilter,
  enabledFilters,
} = useViewFilters();

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

// --- Core Notification Logic ---
async function registerDeviceForNotifications() {
  if (!supportsNotifications.value) {
    console.warn('Notifications are not supported in this browser.');
    return;
  }

  if (!user.value) {
    console.warn('No authenticated user; skipping token registration.');
    return;
  }

  const currentPermission = Notification.permission;
  notificationPermission.value = currentPermission;

  if (currentPermission !== 'granted') {
    console.log('Notification permission is not granted; nothing to register.');
    return;
  }

  try {
    const swRegistration = await navigator.serviceWorker.ready;

    console.log(
      '[FCM] Using service worker for messaging:',
      swRegistration?.active?.scriptURL || '(no active SW)'
    );

    // Make sure Firebase Messaging uses the same SW (src/sw.js)
    try {
      if (messaging && messaging.useServiceWorker) {
        messaging.useServiceWorker(swRegistration);
      }
    } catch (err) {
      console.warn('Failed to bind messaging to custom service worker:', err);
    }
    const partnerPresenceStatus = ref('offline'); // online | away | offline
    let unsubscribePartnerPresence = null;
    const currentToken = await messaging.getToken({
      vapidKey: 'BPACu3jz1Y3_bB4VPwO96LkPua-bJKVXBOioaf75Gc7xQQ-aqZ04a0qBSbxuX6ZW6KcPB1Lcv68zGP5qrM2q9dU',
      // critical: bind the token to *this* SW registration
      serviceWorkerRegistration: swRegistration,
    });

    if (currentToken) {
      await sendTokenToServer(currentToken);
    } else {
      console.warn('No FCM token returned; permission may have been revoked.');
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
  }
}


async function enableNotifications() {
  if (!supportsNotifications.value) {
    console.error('This browser does not support notifications for this app.');
    return;
  }

  const result = await Notification.requestPermission();
  notificationPermission.value = result;

  if (result === 'granted') {
    await registerDeviceForNotifications();
  } else if (result === 'denied') {
    console.warn('Notification permission denied by user.');
  } else {
    console.log('Notification permission dismissed.');
  }
}

function addToNotificationStack(title, body, data) {
  notificationStack.value.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    body,
    data,
    createdAt: Date.now(),
    status: 'unread',
  });
}

function dismissStackNotification(notificationId) {
  const target = notificationStack.value.find((notification) => notification.id === notificationId);
  if (!target) return;

  target.status = 'dismissed';

  if (unreadStackNotifications.value.length < 3) {
    isNotificationStackVisible.value = false;
  }
}

function openStackNotification(notificationId) {
  const target = notificationStack.value.find((notification) => notification.id === notificationId);
  if (!target) return;

  target.status = 'opened';

  const urlString = target.data?.url || target.data?.link;
  if (urlString) {
    applyDeepLinkFromUrlString(urlString);
  }

  if (unreadStackNotifications.value.length < 3) {
    isNotificationStackVisible.value = false;
  }
}

function toggleNotificationStack() {
  if (!shouldShowNotificationStackLauncher.value) return;
  isNotificationStackVisible.value = !isNotificationStackVisible.value;
}

function setTabUnfocused() {
  if (document.visibilityState === 'hidden') {
    hasTabBeenUnfocused.value = true;
  }
}

function setWindowUnfocused() {
  hasTabBeenUnfocused.value = true;
}

function enqueueNotification(title, body, data) {
  notificationQueue.value.push({ title, body, data });
  addToNotificationStack(title, body, data);
  maybeShowNextNotification();
}

function maybeShowNextNotification() {
  // if one is already visible or queue is empty, do nothing
  if (inAppNotification.visible || notificationQueue.value.length === 0) return;

  const next = notificationQueue.value.shift();
  inAppNotification.title = next.title;
  inAppNotification.body = next.body;
  inAppNotification.visible = true;
  lastNotificationData.value = next.data || null;
}
// --- Authentication State Management ---
const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
  user.value = currentUser;
  if (currentUser) {
    registerDeviceForNotifications();
    setupDataListeners(); // Fetch data for calendar
    setPartnerPresenceSubscription(currentUser.uid);
  } else {
    clearDataListeners(); // Clean up listeners on logout
    localStorage.removeItem('currentView');
    currentView.value = 'home';
    clearPartnerPresenceSubscription();
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
    inAppNotification.title = 'Message Sent!';
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
function showInAppNotificationFromPayload(payloadLike) {
  const data = payloadLike?.data || {};
  const notif = payloadLike?.notification || {};

  const type = data.type || 'generic';

  let title = data.title || notif.title;
  let body = data.body || notif.body;

  // Fallback titles if none provided
   // Fallback titles if none provided
   if (!title) {
    if (type === 'questCompleted') {
      title = 'Quest completed 🎉';
    } else if (type === 'love') {
      title = '💌 New love note';
    } else if (type === 'memoCreated') {
      const createdBy = data.createdBy || 'Someone';
      title = `📝 New moment from ${createdBy}`;
    } else if (type === 'memoUpdated') {
      title = '✏️ Moment updated';
    } else if (type === 'memoDeleted') {
      title = '🗑️ Moment deleted';
    } else if (type === 'planCreated') {
      title = '📅 New plan just dropped';
    } else if (type === 'planUpdated') {
      title = '✏️ Plan tweaked';
    } else if (type === 'planDeleted') {
      title = '❌ Plan cancelled';
    } else if (type === 'planAnniversary') {
      const periodLabel = data.periodLabel || 'On this day';
      title = `🕰️ ${periodLabel}`;
    } else if (type === 'memoAnniversary') {
      const periodLabel = data.periodLabel || 'On this day';
      title = `🕰️ ${periodLabel}`;
    } else if (type === 'capsuleCreated') {
      // 🔥 NEW
      title = '⏳ New time capsule';
    } else if (type === 'capsuleOpened') {
      // 🔥 NEW
      title = '✨ Time capsule opened';
    } 
    else if (type === 'planReminder') {
      title = data.reminderCode === '24h' ? '🗓️ Plan tomorrow' : '⏳ Plan soon';
    } else if (type === 'planTimeUp') {
      title = '⌛ Plan time is up';}
    else {
      title = 'Notification';
    }
  }


  // Fallback bodies if none provided
    // Fallback bodies if none provided
    if (!body) {
    if (type === 'questCompleted') {
      const userName = data.userName || 'Someone';
      const text = data.text || 'a quest';
      body = `${userName} completed: ${text}`;
    } else if (type === 'love') {
      body = 'They just sent you an “I love you”.';
    } else if (
      type === 'memoCreated' ||
      type === 'memoUpdated' ||
      type === 'memoDeleted'
    ) {
      const desc = data.description || '';
      body = desc || 'Open Moments to see what changed.';
    } else if (
      type === 'planCreated' ||
      type === 'planUpdated' ||
      type === 'planDeleted'
    ) {
      const text = data.text || '';
      const date = data.date || '';
      const time = data.time || '';
      const when = date && time ? `${date} at ${time}` : date || time || '';
      body =
        text && when
          ? `“${text}” · ${when}`
          : text || (when ? `Plan for ${when}` : 'Open Plans to see what changed.');
    } else if (type === 'planAnniversary') {
      const text = data.text || '';
      const periodLabel = data.periodLabel || 'sometime back';
      body = text
        ? `“${text}” was ${periodLabel.toLowerCase()}.`
        : `One of your plans was from ${periodLabel.toLowerCase()}.`;
    } else if (type === 'memoAnniversary') {
      const description = data.description || '';
      const periodLabel = data.periodLabel || 'sometime back';
      body = description
        ? `“${description}” was ${periodLabel.toLowerCase()}.`
        : `One of your moments was from ${periodLabel.toLowerCase()}.`;
    } else if (type === 'capsuleCreated') {
      // 🔥 NEW
      const fromName = data.fromName || 'Someone';
      const unlockAt = data.unlockAt;
      let unlockPretty = '';
      if (unlockAt) {
        const d = new Date(unlockAt);
        if (!Number.isNaN(d.getTime())) {
          unlockPretty = d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      }
      body = unlockPretty
        ? `${fromName} scheduled a capsule for ${unlockPretty}.`
        : `${fromName} scheduled a new capsule.`;
    } else if (type === 'capsuleOpened') {
      // 🔥 NEW
      const opener = data.openedByName || 'Someone';
      const capsuleTitle = data.capsuleTitle || '';
      body = capsuleTitle
        ? `${opener} opened "${capsuleTitle}".`
        : `${opener} opened one of your time capsules.`;
    }
    else if (type === 'planReminder') {
      const text = data.text || 'A plan';
      const dueAt = data.dueAt ? new Date(data.dueAt) : null;
      const dueLabel = dueAt && !Number.isNaN(dueAt.getTime())
        ? dueAt.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
      const timingLabel = data.reminderCode === '24h' ? 'tomorrow' : 'soon';
      body = dueLabel
        ? `“${text}” is ${timingLabel} (${dueLabel}).`
        : `“${text}” is ${timingLabel}.`;
    } else if (type === 'planTimeUp') {
      const text = data.text || 'Your plan';
      body = `“${text}” is due now.`;
    }
    else {
      body = '';
    }
  }


  // 🔥 Instead of showing immediately, enqueue it
  enqueueNotification(title, body, data);
}
watch(
  () => inAppNotification.visible,
  (visible) => {
    if (!visible) {
      // banner was closed (either by click or by X)
      lastNotificationData.value = null;
      maybeShowNextNotification();
    }
  }
);

watch(shouldShowNotificationStackLauncher, (visible) => {
  if (!visible) {
    isNotificationStackVisible.value = false;
  }
});


// --- Foreground Message Handling ---
const unsubscribeForegroundMessage = messaging.onMessage((payload) => {
  console.log('Foreground push message received:', payload);
  // FCM gives us { notification, data } just like the SW sees
  showInAppNotificationFromPayload(payload);
});

const handleServiceWorkerMessage = (event) => {
  const msg = event?.data;
  if (!msg || !msg.type) return;

  if (msg.type === 'SW_DEBUG_PUSH_FLAGS') {
    if (import.meta.env.DEV) {
      console.debug('SW push flags:', msg.flags);
    }
    return;
  }

  if (msg.type === 'questCompleted') {
    // Keep calendar quest UI in sync with SW-originated events
    forceReloadCalendarQuests();
    // Reuse the same helper so behavior matches FCM foreground
    showInAppNotificationFromPayload({ data: msg });
  }
};
function setPartnerPresenceSubscription(currentUid) {
  if (typeof unsubscribePartnerPresence === 'function') {
    unsubscribePartnerPresence();
    unsubscribePartnerPresence = null;
  }

  unsubscribePartnerPresence = db.collection('userPresence').onSnapshot(
    (snapshot) => {
      // app has 2 users; pick the other user's doc
      const otherDoc = snapshot.docs.find((doc) => doc.id !== currentUid);

      if (!otherDoc) {
        partnerPresenceStatus.value = 'offline';
        return;
      }

      const status = otherDoc.data()?.status;
      partnerPresenceStatus.value =
        status === 'online' || status === 'away' ? status : 'offline';
    },
    () => {
      partnerPresenceStatus.value = 'offline';
    }
  );
}

function clearPartnerPresenceSubscription() {
  if (typeof unsubscribePartnerPresence === 'function') {
    unsubscribePartnerPresence();
    unsubscribePartnerPresence = null;
  }
  partnerPresenceStatus.value = 'offline';
}
// --- Lifecycle Hooks ---
onMounted(() => {
  isMobileDevice.value =
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 768px)').matches;

  window.addEventListener('blur', setWindowUnfocused);
  document.addEventListener('visibilitychange', setTabUnfocused);

  // --- Notification support + SW message bridge ---
  supportsNotifications.value =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  if (supportsNotifications.value) {
    notificationPermission.value = Notification.permission;

    // If permission already granted (returning user) and user is logged in,
    // ensure the token is registered.
    if (notificationPermission.value === 'granted' && user.value) {
      registerDeviceForNotifications();
    }

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }

  // --- Deep-link handling via ?view=... & ...Id ---
  if (typeof window !== 'undefined') {
    applyDeepLinkFromUrlString(window.location.href);
  }

  // --- Navigation colors ---
  const colors = ['magenta', 'turquoise'];
  const startingColorIndex = Math.round(Math.random());

  navColors.value = ['home', 'memos', 'plans', 'capsules'].map((_, index) => {
    return colors[(startingColorIndex + index) % 2];
  });
});

function applyDeepLinkFromUrlString(urlString) {
  if (typeof window === 'undefined' || !urlString) return;

  try {
    const url = new URL(urlString, window.location.origin);
    const params = url.searchParams;

    const viewParam = params.get('view');
    const memoIdParam = params.get('memoId');
    const planIdParam = params.get('planId');
    const capsuleIdParam = params.get('capsuleId');

    const allowedViews = ['home', 'memos', 'plans', 'capsules'];

    if (viewParam && allowedViews.includes(viewParam)) {
      currentView.value = viewParam;
    }

    if (memoIdParam) {
      focusMemoId.value = memoIdParam;
    }
    if (planIdParam) {
      focusPlanId.value = planIdParam;
    }
    if (capsuleIdParam) {
      focusCapsuleId.value = capsuleIdParam;
    }

    // Clean URL after consuming params
    params.delete('view');
    params.delete('memoId');
    params.delete('planId');
    params.delete('capsuleId');

    const cleanQuery = params.toString();
    const cleanUrl = url.pathname + (cleanQuery ? `?${cleanQuery}` : '') + url.hash;

    window.history.replaceState({}, '', cleanUrl);
  } catch (e) {
    console.warn('Failed to apply deep link from URL:', e);
  }
}


function handleInAppNotificationClick() {
  const data = lastNotificationData.value;

  if (data) {
    const urlString = data.url || data.link || '/';
    applyDeepLinkFromUrlString(urlString);
  }

  // Closing the banner will trigger the watcher, which will show the next queued one
  inAppNotification.visible = false;
}



onUnmounted(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth();
    clearPartnerPresenceSubscription();
  }

  if (typeof unsubscribeForegroundMessage === 'function') {
    unsubscribeForegroundMessage();
  }

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('blur', setWindowUnfocused);
    document.removeEventListener('visibilitychange', setTabUnfocused);
  }

  clearDataListeners(); // Clean up listeners when component is destroyed
});
</script>

<style scoped>
.centered-content-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.calendar-container {
  max-width: 450px;
  /* Or any other width you prefer */
  margin: 0 auto;
}

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
  background-color: #0e0d0d00;
  /* A pink/magenta color */
  color: rgb(253, 8, 200);
  padding: 1rem 2rem;
  border-radius: 2rem;
  border: none !important;
  font-weight: bold;
  outline: none !important;
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
  margin: auto;
  padding-bottom: 0px;
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
  margin-top: 2rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;

  /* keep the shadow geometry exactly */
  box-shadow: 0 36px 12px 28px rgba(255, 0, 255, 0.5);

  /* border-bottom can't be a gradient, so we draw it with ::after */
  border-bottom: none;

  position: relative;
  isolation: isolate;

  animation: navShadowShift 10s ease-in-out infinite alternate;
}

/* base gradient line (cyan -> magenta) */
.view-nav::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3%;
  pointer-events: none;
  z-index: 1;

  background: linear-gradient(
    90deg,
    rgba(0, 255, 255, 0.95),
    rgba(255, 0, 255, 0.95)
  );

  /* a tiny glow so it reads as “light” */
  filter: drop-shadow(0 0 10px rgba(255, 0, 255, 0.35));
}

/* moving “center” highlight that morphs cyan <-> magenta */
.view-nav::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  pointer-events: none;
  z-index: 2;

  /* a narrow bright blob; we slide it along the line */
  background: radial-gradient(
    circle at 50% 50%,
    rgba(0, 255, 255, 0.95) 0%,
    rgba(0, 255, 255, 0.35) 35%,
    transparent 70%
  );
  background-repeat: no-repeat;
  background-size: 26% 100%;
  background-position: 0% 0%;

  opacity: 0.95;
  filter: blur(0.4px) hue-rotate(0deg) saturate(1.4);
  mix-blend-mode: screen;

  animation:
  navCenterSlide 7.5s ease-in-out infinite alternate,
  navCenterHue 11s ease-in-out infinite alternate;
}
.welcome-line {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

/* transparent glass chip */
.presence-chip {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 8, 12, 0.26);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* star */
.presence-star {
  font-size: 0.78rem;
  line-height: 1;
}

/* status colors - subtle, not cartoon */
.presence-online .presence-star {
  color: #76ffe1;
  text-shadow: 0 0 8px rgba(64, 255, 224, 0.65);
}

.presence-away .presence-star {
  color: #ffd57a;
  text-shadow: 0 0 8px rgba(255, 200, 80, 0.55);
}

.presence-offline .presence-star {
  color: rgba(220, 230, 255, 0.45);
  text-shadow: none;
}
/* keep links above everything */

@keyframes navCenterSlide {
  0%   { background-position: 0% 0%;   background-size: 18% 100%; opacity: 0.55; }
  10%  { background-position: 8% 0%;   background-size: 22% 100%; opacity: 0.70; }
  22%  { background-position: 22% 0%;  background-size: 28% 100%; opacity: 0.85; }
  35%  { background-position: 40% 0%;  background-size: 24% 100%; opacity: 0.72; }
  50%  { background-position: 58% 0%;  background-size: 30% 100%; opacity: 0.92; }
  66%  { background-position: 74% 0%;  background-size: 23% 100%; opacity: 0.74; }
  82%  { background-position: 90% 0%;  background-size: 27% 100%; opacity: 0.88; }
  100% { background-position: 100% 0%; background-size: 18% 100%; opacity: 0.60; }
}

/* Cyan -> Magenta drift, with a little “wobble” in saturation/brightness */
@keyframes navCenterHue {
  0%   { filter: blur(0.4px) hue-rotate(0deg)   saturate(1.35) brightness(1.05); }
  12%  { filter: blur(0.5px) hue-rotate(14deg)  saturate(1.55) brightness(1.10); }
  26%  { filter: blur(0.4px) hue-rotate(32deg)  saturate(1.40) brightness(1.02); }
  40%  { filter: blur(0.6px) hue-rotate(55deg)  saturate(1.70) brightness(1.12); }
  55%  { filter: blur(0.4px) hue-rotate(78deg)  saturate(1.45) brightness(1.04); }
  72%  { filter: blur(0.6px) hue-rotate(98deg)  saturate(1.80) brightness(1.14); }
  88%  { filter: blur(0.4px) hue-rotate(112deg) saturate(1.55) brightness(1.06); }
  100% { filter: blur(0.5px) hue-rotate(120deg) saturate(1.65) brightness(1.10); }
}

@keyframes navShadowShift {
  0%   { box-shadow: 0 18px 26px -6px rgba(255,   0, 255, 0.28); } /* magenta */
  10%  { box-shadow: 0 19px 27px -6px rgba(255,   0, 235, 0.32); }
  20%  { box-shadow: 0 20px 28px -6px rgba(255,   0, 205, 0.36); }
  30%  { box-shadow: 0 20px 29px -6px rgba(230,   0, 255, 0.30); } /* violet wobble */
  40%  { box-shadow: 0 21px 30px -6px rgba(190,   0, 255, 0.38); }
  50%  { box-shadow: 0 22px 32px -6px rgba(120,  40, 255, 0.34); } /* bridge (blue-ish) */
  60%  { box-shadow: 0 23px 33px -6px rgba( 40, 140, 255, 0.40); }
  70%  { box-shadow: 0 24px 34px -6px rgba(  0, 200, 255, 0.36); }
  80%  { box-shadow: 0 24px 34px -6px rgba(  0, 235, 255, 0.42); }
  90%  { box-shadow: 0 23px 33px -6px rgba(  0, 255, 235, 0.38); }
  100% { box-shadow: 0 22px 32px -6px rgba(  0, 255, 255, 0.34); } /* cyan */
}

/* Floating partner presence star (left side, glassy) */
.presence-floating-wrap {
  position: fixed;
  left: 1rem;
  top: 5.2rem; /* aligns roughly with welcome/header zone */
  z-index: 1300;
  width: 2.15rem;
  height: 2.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  border-radius: 999px;
  background:
    radial-gradient(circle at 22% 20%, rgba(0, 255, 255, 0.12), transparent 62%),
    radial-gradient(circle at 78% 82%, rgba(255, 0, 255, 0.12), transparent 62%),
    rgba(10, 10, 16, 0.14);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* no cartoon/plastic ring */
.presence-floating-star {
  font-size: 1.28rem;
  line-height: 1;
  color: rgba(225, 235, 255, 0.45);
  transition: color 0.25s ease, text-shadow 0.25s ease, transform 0.25s ease;
  transform: translateY(-0.5px);
}

/* online = cyan/magenta low-opacity glow */
.presence-online {
  color: rgba(120, 255, 235, 0.9);
  text-shadow:
    0 0 7px rgba(0, 255, 255, 0.38),
    0 0 12px rgba(255, 0, 255, 0.22);
}

/* away = softer warm blend */
.presence-away {
  color: rgba(255, 220, 155, 0.82);
  text-shadow:
    0 0 6px rgba(255, 0, 255, 0.22),
    0 0 8px rgba(0, 255, 255, 0.16);
}

/* offline = dim glass */
.presence-offline {
  color: rgba(215, 225, 245, 0.35);
  text-shadow: none;
}

@media (max-width: 768px) {
  .presence-floating-wrap {
    left: 0.7rem;
    top: 4.6rem;
    width: 1.95rem;
    height: 1.95rem;
  }

  .presence-floating-star {
    font-size: 1.16rem;
  }
}
.view-nav a {
  position: relative;
  z-index: 3;
  margin: 0 0.65rem;
  padding: 0.35rem 0.95rem;
  border-radius: 999px;
  cursor: pointer;
  outline:none;
  border:none !important;
  color: #aaa;
  font-family: 'Great Vibes', cursive;
  font-size: 1.65rem;
  font-weight: 400;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  will-change: transform;

  /* Glass + neon gradients (same visual family as presence/scroll button) */
  background:
    radial-gradient(circle at 22% 20%, rgba(0, 255, 255, 0.17), transparent 62%),
    radial-gradient(circle at 78% 82%, rgba(255, 0, 255, 0.17), transparent 62%),
    rgba(10, 10, 16, 0.14);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  border: 1px solid rgba(255, 255, 255, 0.14);
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.08);
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);

  transition:
    color 0.25s ease,
    transform 0.22s ease,
    text-shadow 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease,
    background-color 0.25s ease;
}

.view-nav a:hover,
.view-nav a:active {
  color: var(--active-color);
  transform: translateY(-2px) scale(1.06);
  border-color: color-mix(in srgb, var(--active-color) 45%, white 10%);
  text-shadow:
    0 0 6px color-mix(in srgb, var(--active-color) 75%, white 10%),
    0 0 14px color-mix(in srgb, var(--active-color) 35%, magenta 20%);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.30),
    0 0 18px color-mix(in srgb, var(--active-color) 24%, transparent);
}


.view-nav a.active {
  color: var(--active-color);
  border-color: color-mix(in srgb, var(--active-color) 40%, white 12%);
  text-shadow:
    0 0 5px var(--active-color),
    0 0 15px var(--active-color);
  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.28),
    0 0 20px color-mix(in srgb, var(--active-color) 30%, transparent);
}

.notification-control-fixed {
  position: fixed;
  bottom: 5rem;
  /* Positioned above the logout button */
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
  width: 110px;
  /* To match logout button roughly */
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

.card.home-view-card {
  width: 75%;
  max-width: 1100px;
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
    margin: 0 0.35rem;
    padding: 0.25rem 0.7rem;
    font-size: 1.4rem;
  }
}
</style>
