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
      v-model:visible="inAppNotification.visible"
      :title="inAppNotification.title"
      :body="inAppNotification.body"
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
    <div
      v-if="
        user &&
        currentView === 'home' &&
        supportsNotifications
      "
      class="notification-control-fixed"
    >
      <button
        v-if="notificationPermission !== 'granted'"
        class="notification-btn enable"
        @click="enableNotifications"
      >
        Enable Notifs
      </button>
    </div>

    <!-- Logout button -->
    <button
      v-if="user && currentView === 'home'"
      class="logout-button"
      @click="logout"
    >
      <LogOut
        color="magenta"
        :size="32"
      />
    </button>

    <div class="sticky-header">
      <Sidebar
        v-if="
          currentView === 'plans' ||
          currentView === 'memos' ||
          currentView === 'capsules'
        "
        v-model:title="titleFilter"
        v-model:location="locationFilter"
        v-model:hashtags="hashtagFilter"
        v-model:date="dateFilter"
        v-model:time="timeFilter"
        v-model:duration="durationFilter"
        v-model:lock-status="lockStatusFilter"
        :enabled-filters="enabledFilters"
      />

      <header
        v-if="currentView === 'home'"
        class="page-header"
      >
        <h1
          v-if="user"
          class="bounce-in welcome-line"
        >
          <span>
            Welcome, {{ user.displayName || user.email }}
          </span>
        </h1>

        <h1
          v-else
          class="bounce-in"
        >
          Auth Portal
        </h1>
      </header>
    </div>

    <!-- Main content card -->
    <div class="centered-content-container">
      <div
        class="card"
        :class="{
          'is-full-width': currentView !== 'home',
          'home-view-card': currentView === 'home',
        }"
      >
        <main>
          <!-- Logged-in content -->
          <div v-if="user">
            <!-- View navigation -->
            <nav class="view-nav">
              <a
                :class="{ active: currentView === 'home' }"
                :style="getNavStyle('home', 0)"
                @click="switchView('home')"
              >
                Home
              </a>

              <a
                :class="{ active: currentView === 'memos' }"
                :style="getNavStyle('memos', 1)"
                @click="switchView('memos')"
              >
                Moments
              </a>

              <a
                :class="{ active: currentView === 'plans' }"
                :style="getNavStyle('plans', 2)"
                @click="switchView('plans')"
              >
                Plans
              </a>

              <a
                :class="{ active: currentView === 'capsules' }"
                :style="getNavStyle('capsules', 3)"
                @click="switchView('capsules')"
              >
                Capsules
              </a>

              <button
                v-if="user"
                type="button"
                class="floating-map-nav"
                :class="{ active: currentView === 'map' }"
                aria-label="Open map view"
                @click="switchView('map')"
              >
                <svg
                  class="floating-map-nav-icon"
                  viewBox="0 0 24 24"
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="floatingMapPinGradient"
                      x1="20%"
                      y1="16%"
                      x2="82%"
                      y2="86%"
                    >
                      <stop
                        offset="0%"
                        stop-color="#8ffcff"
                        stop-opacity="0.62"
                      />

                      <stop
                        offset="100%"
                        stop-color="#ff8be4"
                        stop-opacity="0.55"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d="M12 1.5C7.3 1.5 3.5 5.3 3.5 10c0 6 8.5 13.5 8.5 13.5S20.5 16 20.5 10c0-4.7-3.8-8.5-8.5-8.5Z"
                    fill="rgba(143,252,255,0.1)"
                    stroke="url(#floatingMapPinGradient)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />

                  <circle
                    cx="12"
                    cy="10"
                    r="4.2"
                    fill="rgba(10, 20, 34, 0.12)"
                    stroke="url(#floatingMapPinGradient)"
                    stroke-width="1.9"
                  />
                </svg>
              </button>
            </nav>

            <!-- Floating sound button -->
            <button
              v-if="user"
              ref="soundButtonRef"
              type="button"
              class="floating-sound-nav"
              :class="{ active: isSoundPanelOpen }"
              aria-label="Open sound controls"
              @click="toggleSoundPanel"
            >
              <svg
                class="floating-sound-nav-icon"
                viewBox="0 0 24 24"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id="floatingSoundGradient"
                    x1="20%"
                    y1="16%"
                    x2="82%"
                    y2="86%"
                  >
                    <stop
                      offset="0%"
                      stop-color="#8ffcff"
                      stop-opacity="0.62"
                    />

                    <stop
                      offset="100%"
                      stop-color="#ff8be4"
                      stop-opacity="0.55"
                    />
                  </linearGradient>
                </defs>

                <!-- Speaker body -->
                <path
                  d="M4 10.2h3.1l4.3-3.4c.38-.3.92-.03.92.45v9.56c0 .48-.54.75-.92.45l-4.3-3.4H4c-.55 0-1-.45-1-1v-1.62c0-.55.45-1 1-1Z"
                  fill="rgba(143,252,255,0.1)"
                  stroke="url(#floatingSoundGradient)"
                  stroke-width="1.45"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />

                <!-- Sound waves -->
                <path
                  d="M15.2 9.2c1.15.75 1.85 2.06 1.85 3.45s-.7 2.7-1.85 3.45"
                  fill="none"
                  stroke="url(#floatingSoundGradient)"
                  stroke-width="1.55"
                  stroke-linecap="round"
                />

                <path
                  d="M17.55 7.45c1.72 1.22 2.75 3.18 2.75 5.2s-1.03 3.98-2.75 5.2"
                  fill="none"
                  stroke="url(#floatingSoundGradient)"
                  stroke-width="1.55"
                  stroke-linecap="round"
                />
              </svg>
            </button>

            <!-- Floating expandable sound panel -->
            <transition name="sound-panel-fade">
              <aside
                v-if="user && isSoundPanelOpen"
                ref="soundPanelRef"
                class="floating-sound-panel"
                aria-label="Sound controls"
                @mouseenter="onSoundPanelPointerEnter"
                @mouseleave="onSoundPanelPointerLeave"
                @focusin="onSoundPanelPointerEnter"
                @focusout="onSoundPanelPointerLeave"
              >
                <div class="sound-panel-head">
                  <h4>Sound</h4>

                  <label class="sound-toggle-inline">
                    <input
                      type="checkbox"
                      :checked="soundEnabled"
                      @change="onSoundToggle"
                    />

                    <span>
                      {{ soundEnabled ? 'On' : 'Off' }}
                    </span>
                  </label>
                </div>

                <div class="sound-panel-row">
                  <input
                    id="soundVolume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    :value="soundVolume"
                    :disabled="!soundEnabled"
                    @input="onSoundVolumeInput"
                    @pointerdown="onSoundSliderPointerDown"
                    @pointerup="onSoundSliderPointerUp"
                    @pointercancel="onSoundSliderPointerUp"
                  />

                  <small>
                    {{ Math.round(soundVolume * 100) }}%
                  </small>
                </div>
              </aside>
            </transition>

            <!-- Conditional views -->
            <transition
              name="slide-fade"
              mode="out-in"
            >
              <div :key="currentView">
                <div v-if="currentView === 'home'">
                  <button
                    ref="loveBtnRef"
                    class="love-button"
                    @click="sendLoveNotification"
                  >
                    Send Love
                  </button>

                  <div class="calendar-container">
                    <DailyQuestWidget />

                    <CombinedCalendar
                      :memos="memos"
                      :plans="plans"
                      @open-item="openItem"
                    />
                  </div>
                </div>

                <MemosAndMoments
                  v-if="currentView === 'memos'"
                  :title-filter="titleFilter"
                  :location-filter="locationFilter"
                  :hashtag-filter="hashtagFilter"
                  :date-filter="dateFilter"
                  :focus-memo-id="focusMemoId"
                  :focus-request="focusRequest"
                />

                <Plans
                  v-if="currentView === 'plans'"
                  :user="user"
                  :title-filter="titleFilter"
                  :location-filter="locationFilter"
                  :hashtag-filter="hashtagFilter"
                  :date-filter="dateFilter"
                  :time-filter="timeFilter"
                  :duration-filter="durationFilter"
                  :focus-plan-id="focusPlanId"
                  :focus-request="focusRequest"
                />

                <TimeCapsulesView
                  v-if="currentView === 'capsules'"
                  :date-filter="dateFilter"
                  :lock-status-filter="lockStatusFilter"
                  :focus-capsule-id="focusCapsuleId"
                />

                <MapSpotsView
                  v-if="currentView === 'map'"
                />
              </div>
            </transition>
          </div>

          <!-- Logged-out authentication views -->
          <div v-else>
            <Login
              v-if="!isRegistering"
              @switch-form="handleSwitchForm"
            />

            <Register
              v-else
              @switch-form="handleSwitchForm"
            />
          </div>
        </main>
      </div>
    </div>

    <!-- Global scroll-to-top button -->
    <ScrollToTopButton />
  </P5StarfieldBackground>
</template>

<script setup>
import {
  ref,
  watch,
  onUnmounted,
  onMounted,
  reactive,
  computed,
  nextTick,
} from 'vue';

import {
  auth,
  messaging,
  rtdb,
} from './firebase';

import { LogOut } from 'lucide-vue-next';

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
import { useDeepLinks } from './composables/useDeepLinks';
import { useCalendarData } from './composables/useCalendarData';
import { forceReloadCalendarQuests } from './composables/useDailyQuests';
import { usePresence } from './composables/usePresence';
import { useSoundManager } from './composables/useSoundManager';

usePwaAutoUpdate();
usePresence();

// -----------------------------------------------------------------------------
// Reactive state
// -----------------------------------------------------------------------------

const user = ref(null);
const isRegistering = ref(false);

const notificationPermission = ref(null);
const supportsNotifications = ref(false);

const navColors = ref([]);

const partnerPresenceStatus = ref('offline');

let unsubscribePartnerPresence = null;
let partnerPresenceRefreshTimer = null;

const {
  memos,
  plans,
  setupDataListeners,
  clearDataListeners,
} = useCalendarData();

const {
  enabled: soundEnabled,
  volume: soundVolume,
  initAudioFromGesture,
  play,
  setEnabled: setSoundEnabled,
  setVolume: setSoundVolume,
} = useSoundManager();

const focusMemoId = ref(null);
const focusPlanId = ref(null);
const focusCapsuleId = ref(null);

const lastNotificationData = ref(null);
const notificationQueue = ref([]);

const SOUND_PANEL_AUTO_CLOSE_MS = 4000;

const soundPanelAutoCloseTimer = ref(null);
const isAdjustingSoundSlider = ref(false);

const inAppNotification = reactive({
  visible: false,
  title: '',
  body: '',
});

const notificationStack = ref([]);
const isNotificationStackVisible = ref(false);

const hasTabBeenUnfocused = ref(false);
const isMobileDevice = ref(false);

const isSoundPanelOpen = ref(false);
const soundPanelRef = ref(null);
const soundButtonRef = ref(null);

const loveBtnRef = ref(null);

const unreadStackNotifications = computed(() =>
  notificationStack.value
    .filter(
      (notification) =>
        notification.status === 'unread'
    )
    .sort(
      (first, second) =>
        second.createdAt - first.createdAt
    )
);

const shouldShowNotificationStackLauncher = computed(() => {
  const unreadCount =
    unreadStackNotifications.value.length;

  if (isMobileDevice.value) {
    return unreadCount > 0;
  }

  return (
    unreadCount >= 3 &&
    hasTabBeenUnfocused.value
  );
});

// -----------------------------------------------------------------------------
// View filters and navigation
// -----------------------------------------------------------------------------

const {
  currentView,
  titleFilter,
  locationFilter,
  hashtagFilter,
  dateFilter,
  timeFilter,
  durationFilter,
  lockStatusFilter,
  enabledFilters,
  resetFilters,
} = useViewFilters();

const { focusRequest, applyDeepLinkFromUrlString, navigateToView } = useDeepLinks({
  currentView,
  focusMemoId,
  focusPlanId,
  focusCapsuleId,
  resetFilters,
});

function switchView(view) {
  if (currentView.value !== view) {
    play('tap');
  }

  navigateToView(view);
  closeSoundPanel();
}

const handleSwitchForm = (formName) => {
  isRegistering.value =
    formName === 'register';
};

const getNavStyle = (view, index) => {
  const style = {
    '--active-color': navColors.value[index],
  };

  if (currentView.value === view) {
    style.color = navColors.value[index];
  }

  return style;
};

// -----------------------------------------------------------------------------
// Notification registration
// -----------------------------------------------------------------------------

async function registerDeviceForNotifications() {
  if (!supportsNotifications.value) {
    console.warn(
      'Notifications are not supported in this browser.'
    );

    return;
  }

  if (!user.value) {
    console.warn(
      'No authenticated user; skipping token registration.'
    );

    return;
  }

  const currentPermission =
    Notification.permission;

  notificationPermission.value =
    currentPermission;

  if (currentPermission !== 'granted') {
    console.log(
      'Notification permission is not granted; nothing to register.'
    );

    return;
  }

  try {
    const swRegistration =
      await navigator.serviceWorker.ready;

    console.log(
      '[FCM] Using service worker for messaging:',
      swRegistration?.active?.scriptURL ||
        '(no active SW)'
    );

    try {
      if (
        messaging &&
        messaging.useServiceWorker
      ) {
        messaging.useServiceWorker(
          swRegistration
        );
      }
    } catch (error) {
      console.warn(
        'Failed to bind messaging to custom service worker:',
        error
      );
    }

    const currentToken =
      await messaging.getToken({
        vapidKey:
          import.meta.env
            .VITE_FIREBASE_VAPID_KEY,

        serviceWorkerRegistration:
          swRegistration,
      });

    if (currentToken) {
      await sendTokenToServer(
        currentToken
      );
    } else {
      console.warn(
        'No FCM token returned; permission may have been revoked.'
      );
    }
  } catch (error) {
    console.error(
      'An error occurred while retrieving token:',
      error
    );
  }
}

async function enableNotifications() {
  if (!supportsNotifications.value) {
    console.error(
      'This browser does not support notifications for this app.'
    );

    return;
  }

  const result =
    await Notification.requestPermission();

  notificationPermission.value = result;

  if (result === 'granted') {
    await registerDeviceForNotifications();
  } else if (result === 'denied') {
    console.warn(
      'Notification permission denied by user.'
    );
  } else {
    console.log(
      'Notification permission dismissed.'
    );
  }
}

// -----------------------------------------------------------------------------
// Sound panel
// -----------------------------------------------------------------------------

function toggleSoundPanel() {
  isSoundPanelOpen.value =
    !isSoundPanelOpen.value;

  play('tap');

  if (isSoundPanelOpen.value) {
    scheduleSoundPanelAutoClose();
  } else {
    clearSoundPanelAutoClose();
  }
}

function closeSoundPanel() {
  isSoundPanelOpen.value = false;
  clearSoundPanelAutoClose();
}

function handleGlobalPointerDown(event) {
  if (!isSoundPanelOpen.value) {
    return;
  }

  const panelElement =
    soundPanelRef.value;

  const buttonElement =
    soundButtonRef.value;

  const target = event.target;

  const clickedInsidePanel =
    panelElement &&
    panelElement.contains(target);

  const clickedButton =
    buttonElement &&
    buttonElement.contains(target);

  if (
    !clickedInsidePanel &&
    !clickedButton
  ) {
    closeSoundPanel();
  }
}

function onSoundToggle(event) {
  const next = event.target.checked;

  setSoundEnabled(next);

  if (next) {
    play('tap');
  }

  scheduleSoundPanelAutoClose();
}

function onSoundVolumeInput(event) {
  const next = Number(
    event.target.value
  );

  setSoundVolume(next);

  if (soundEnabled.value) {
    play('tap');
  }

  scheduleSoundPanelAutoClose();
}

function clearSoundPanelAutoClose() {
  if (soundPanelAutoCloseTimer.value) {
    clearTimeout(
      soundPanelAutoCloseTimer.value
    );

    soundPanelAutoCloseTimer.value =
      null;
  }
}

function scheduleSoundPanelAutoClose() {
  clearSoundPanelAutoClose();

  if (
    !isSoundPanelOpen.value ||
    isAdjustingSoundSlider.value
  ) {
    return;
  }

  soundPanelAutoCloseTimer.value =
    setTimeout(() => {
      isSoundPanelOpen.value = false;
    }, SOUND_PANEL_AUTO_CLOSE_MS);
}

function onSoundPanelPointerEnter() {
  clearSoundPanelAutoClose();
}

function onSoundPanelPointerLeave() {
  scheduleSoundPanelAutoClose();
}

function onSoundSliderPointerDown() {
  isAdjustingSoundSlider.value = true;
  clearSoundPanelAutoClose();
}

function onSoundSliderPointerUp() {
  isAdjustingSoundSlider.value = false;
  scheduleSoundPanelAutoClose();
}

// -----------------------------------------------------------------------------
// Love animation
// -----------------------------------------------------------------------------

function triggerHeartBursts() {
  const button = loveBtnRef.value;

  if (!button) {
    return;
  }

  const rect =
    button.getBoundingClientRect();

  const originX =
    rect.left + rect.width / 2;

  const originY =
    rect.top + rect.height / 2;

  const COUNT = 18;

  const LAYERS = [
    'cyan',
    'magenta',
    'gradient',
  ];

  for (
    let index = 0;
    index < COUNT;
    index += 1
  ) {
    const heart =
      document.createElement('span');

    heart.className =
      'love-heart-burst';

    const angle =
      (Math.PI * 2 * index) /
        COUNT +
      (Math.random() - 0.5) *
        0.75;

    const distance =
      58 + Math.random() * 160;

    const dx =
      Math.cos(angle) * distance;

    const dy =
      Math.sin(angle) * distance -
      (45 + Math.random() * 130);

    const rotate =
      -45 + Math.random() * 90;

    const delay =
      Math.random() * 320;

    const duration =
      1200 + Math.random() * 900;

    const scale =
      0.58 + Math.random() * 1.05;

    const size =
      9 + Math.random() * 18;

    const drift =
      (Math.random() - 0.5) * 38;

    heart.dataset.layer =
      LAYERS[
        Math.floor(
          Math.random() *
            LAYERS.length
        )
      ];

    heart.style.left =
      `${originX}px`;

    heart.style.top =
      `${originY}px`;

    heart.style.setProperty(
      '--hb-dx',
      `${dx.toFixed(2)}px`
    );

    heart.style.setProperty(
      '--hb-dy',
      `${dy.toFixed(2)}px`
    );

    heart.style.setProperty(
      '--hb-rot',
      `${rotate.toFixed(2)}deg`
    );

    heart.style.setProperty(
      '--hb-delay',
      `${delay.toFixed(0)}ms`
    );

    heart.style.setProperty(
      '--hb-dur',
      `${duration.toFixed(0)}ms`
    );

    heart.style.setProperty(
      '--hb-scale',
      `${scale.toFixed(2)}`
    );

    heart.style.setProperty(
      '--hb-size',
      `${size.toFixed(2)}px`
    );

    heart.style.setProperty(
      '--hb-drift',
      `${drift.toFixed(2)}px`
    );

    document.body.appendChild(
      heart
    );

    heart.addEventListener(
      'animationend',
      () => heart.remove(),
      {
        once: true,
      }
    );
  }
}

// -----------------------------------------------------------------------------
// Notification stack
// -----------------------------------------------------------------------------

function addToNotificationStack(
  title,
  body,
  data
) {
  notificationStack.value.push({
    id:
      `${Date.now()}-` +
      Math.random()
        .toString(36)
        .slice(2, 8),

    title,
    body,
    data,
    createdAt: Date.now(),
    status: 'unread',
  });
}

function dismissStackNotification(
  notificationId
) {
  const target =
    notificationStack.value.find(
      (notification) =>
        notification.id ===
        notificationId
    );

  if (!target) {
    return;
  }

  target.status = 'dismissed';
  play('tap');
}

function openStackNotification(
  notificationId
) {
  const target =
    notificationStack.value.find(
      (notification) =>
        notification.id ===
        notificationId
    );

  if (!target) {
    return;
  }

  target.status = 'opened';
  play('tap');

  const urlString =
    target.data?.url ||
    target.data?.link;

  if (urlString) {
    applyDeepLinkFromUrlString(
      urlString
    );
  }
}

function toggleNotificationStack() {
  if (
    !shouldShowNotificationStackLauncher.value
  ) {
    return;
  }

  isNotificationStackVisible.value =
    !isNotificationStackVisible.value;

  play('tap');
}

function setTabUnfocused() {
  if (
    document.visibilityState ===
    'hidden'
  ) {
    hasTabBeenUnfocused.value =
      true;
  }
}

function setWindowUnfocused() {
  hasTabBeenUnfocused.value = true;
}

function enqueueNotification(
  title,
  body,
  data
) {
  notificationQueue.value.push({
    title,
    body,
    data,
  });

  addToNotificationStack(
    title,
    body,
    data
  );

  maybeShowNextNotification();
}

function maybeShowNextNotification() {
  if (
    inAppNotification.visible ||
    notificationQueue.value.length ===
      0
  ) {
    return;
  }

  const next =
    notificationQueue.value.shift();

  inAppNotification.title =
    next.title;

  inAppNotification.body =
    next.body;

  inAppNotification.visible =
    true;

  lastNotificationData.value =
    next.data || null;

  play('notification');
}

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------

const unsubscribeAuth =
  auth.onAuthStateChanged(
    (currentUser) => {
      user.value = currentUser;

      if (currentUser) {
        registerDeviceForNotifications();
        setupDataListeners();

        setPartnerPresenceSubscription(
          currentUser.uid
        );
      } else {
        clearDataListeners();

        localStorage.removeItem(
          'currentView'
        );

        // Keep a linked destination while the user signs in.

        clearPartnerPresenceSubscription();
      }
    }
  );

const logout = () => {
  navigateToView('home');
  auth.signOut();
};

// -----------------------------------------------------------------------------
// API operations
// -----------------------------------------------------------------------------

async function sendLoveNotification() {
  if (!user.value) {
    return;
  }

  try {
    const idToken =
      await user.value.getIdToken(
        true
      );

    const response = await fetch(
      '/api/send-love',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${idToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorBody =
        await response.json();

      throw new Error(
        errorBody.message ||
          `Server responded with ${response.status}`
      );
    }

    inAppNotification.title =
      'Message Sent!';

    inAppNotification.body =
      "You've sent an 'I love you' notification.";

    inAppNotification.visible =
      true;

    play('success');
    triggerHeartBursts();
  } catch (error) {
    console.error(
      'Error sending "I love you" notification:',
      error
    );

    play('error');
  }
}

async function sendTokenToServer(
  token
) {
  if (!user.value) {
    return;
  }

  try {
    const idToken =
      await user.value.getIdToken(
        true
      );

    const response = await fetch(
      '/api/register',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${idToken}`,
        },

        body: JSON.stringify({
          token,
        }),
      }
    );

    if (!response.ok) {
      const errorBody =
        await response.json();

      throw new Error(
        errorBody.message ||
          `Server responded with ${response.status}`
      );
    }

    const result =
      await response.json();

    console.log(
      'Token successfully registered with the server:',
      result.message
    );
  } catch (error) {
    console.error(
      'Error sending token to server:',
      error
    );
  }
}

// -----------------------------------------------------------------------------
// Notification presentation
// -----------------------------------------------------------------------------

function showInAppNotificationFromPayload(
  payloadLike
) {
  const data =
    payloadLike?.data || {};

  const notification =
    payloadLike?.notification || {};

  const type =
    data.type || 'generic';

  let title =
    data.title ||
    notification.title;

  let body =
    data.body ||
    notification.body;

  if (!title) {
    if (type === 'questCompleted') {
      title =
        'Quest completed 🎉';
    } else if (type === 'love') {
      title =
        '💌 New love note';
    } else if (
      type === 'memoCreated'
    ) {
      const createdBy =
        data.createdBy ||
        'Someone';

      title =
        `📝 New moment from ${createdBy}`;
    } else if (
      type === 'memoUpdated'
    ) {
      title =
        '✏️ Moment updated';
    } else if (
      type === 'memoDeleted'
    ) {
      title =
        '🗑️ Moment deleted';
    } else if (
      type === 'planCreated'
    ) {
      title =
        '📅 New plan just dropped';
    } else if (
      type === 'planUpdated'
    ) {
      title =
        '✏️ Plan tweaked';
    } else if (
      type === 'planDeleted'
    ) {
      title =
        '❌ Plan cancelled';
    } else if (
      type === 'planAnniversary'
    ) {
      const periodLabel =
        data.periodLabel ||
        'On this day';

      title =
        `🕰️ ${periodLabel}`;
    } else if (
      type === 'memoAnniversary'
    ) {
      const periodLabel =
        data.periodLabel ||
        'On this day';

      title =
        `🕰️ ${periodLabel}`;
    } else if (
      type === 'capsuleCreated'
    ) {
      title =
        '⏳ New time capsule';
    } else if (
      type === 'capsuleOpened'
    ) {
      title =
        '✨ Time capsule opened';
    } else if (
      type === 'planReminder'
    ) {
      title =
        data.reminderCode === '24h'
          ? '🗓️ Plan tomorrow'
          : '⏳ Plan soon';
    } else if (
      type === 'planTimeUp'
    ) {
      title =
        '⌛ Plan time is up';
    } else {
      title = 'Notification';
    }
  }

  if (!body) {
    if (type === 'questCompleted') {
      const userName =
        data.userName ||
        'Someone';

      const text =
        data.text ||
        'a quest';

      body =
        `${userName} completed: ${text}`;
    } else if (
      type === 'love'
    ) {
      body =
        'They just sent you an “I love you”.';
    } else if (
      type === 'memoCreated' ||
      type === 'memoUpdated' ||
      type === 'memoDeleted'
    ) {
      const description =
        data.description || '';

      body =
        description ||
        'Open Moments to see what changed.';
    } else if (
      type === 'planCreated' ||
      type === 'planUpdated' ||
      type === 'planDeleted'
    ) {
      const text =
        data.text || '';

      const date =
        data.date || '';

      const time =
        data.time || '';

      const when =
        date && time
          ? `${date} at ${time}`
          : date ||
            time ||
            '';

      body =
        text && when
          ? `“${text}” · ${when}`
          : text ||
            (when
              ? `Plan for ${when}`
              : 'Open Plans to see what changed.');
    } else if (
      type === 'planAnniversary'
    ) {
      const text =
        data.text || '';

      const periodLabel =
        data.periodLabel ||
        'sometime back';

      body = text
        ? `“${text}” was ${periodLabel.toLowerCase()}.`
        : `One of your plans was from ${periodLabel.toLowerCase()}.`;
    } else if (
      type === 'memoAnniversary'
    ) {
      const description =
        data.description || '';

      const periodLabel =
        data.periodLabel ||
        'sometime back';

      body = description
        ? `“${description}” was ${periodLabel.toLowerCase()}.`
        : `One of your moments was from ${periodLabel.toLowerCase()}.`;
    } else if (
      type === 'capsuleCreated'
    ) {
      const fromName =
        data.fromName ||
        'Someone';

      const unlockAt =
        data.unlockAt;

      let unlockPretty = '';

      if (unlockAt) {
        const unlockDate =
          new Date(unlockAt);

        if (
          !Number.isNaN(
            unlockDate.getTime()
          )
        ) {
          unlockPretty =
            unlockDate.toLocaleString(
              undefined,
              {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }
            );
        }
      }

      body = unlockPretty
        ? `${fromName} scheduled a capsule for ${unlockPretty}.`
        : `${fromName} scheduled a new capsule.`;
    } else if (
      type === 'capsuleOpened'
    ) {
      const opener =
        data.openedByName ||
        'Someone';

      const capsuleTitle =
        data.capsuleTitle || '';

      body = capsuleTitle
        ? `${opener} opened "${capsuleTitle}".`
        : `${opener} opened one of your time capsules.`;
    } else if (
      type === 'planReminder'
    ) {
      const text =
        data.text || 'A plan';

      const dueAt =
        data.dueAt
          ? new Date(data.dueAt)
          : null;

      const dueLabel =
        dueAt &&
        !Number.isNaN(
          dueAt.getTime()
        )
          ? dueAt.toLocaleString(
              undefined,
              {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }
            )
          : '';

      const timingLabel =
        data.reminderCode === '24h'
          ? 'tomorrow'
          : 'soon';

      body = dueLabel
        ? `“${text}” is ${timingLabel} (${dueLabel}).`
        : `“${text}” is ${timingLabel}.`;
    } else if (
      type === 'planTimeUp'
    ) {
      const text =
        data.text ||
        'Your plan';

      body =
        `“${text}” is due now.`;
    } else {
      body = '';
    }
  }

  enqueueNotification(
    title,
    body,
    data
  );
}

watch(
  () => inAppNotification.visible,

  (visible) => {
    if (!visible) {
      lastNotificationData.value =
        null;

      maybeShowNextNotification();
    }
  }
);

watch(
  shouldShowNotificationStackLauncher,

  (visible) => {
    if (!visible) {
      isNotificationStackVisible.value =
        false;
    }
  }
);

// -----------------------------------------------------------------------------
// Foreground push messages
// -----------------------------------------------------------------------------

const unsubscribeForegroundMessage =
  messaging.onMessage((payload) => {
    console.log(
      'Foreground push message received:',
      payload
    );

    showInAppNotificationFromPayload(
      payload
    );
  });

const handleServiceWorkerMessage = (
  event
) => {
  const message = event?.data;

  if (
    !message ||
    !message.type
  ) {
    return;
  }

  if (
    message.type ===
    'SW_DEBUG_PUSH_FLAGS'
  ) {
    if (import.meta.env.DEV) {
      console.debug(
        'SW push flags:',
        message.flags
      );
    }

    return;
  }

  if (
    message.type ===
    'questCompleted'
  ) {
    forceReloadCalendarQuests();

    showInAppNotificationFromPayload({
      data: message,
    });
  }
};

// -----------------------------------------------------------------------------
// Partner presence
// -----------------------------------------------------------------------------

function setPartnerPresenceSubscription(
  currentUid
) {
  if (
    typeof unsubscribePartnerPresence ===
    'function'
  ) {
    unsubscribePartnerPresence();
    unsubscribePartnerPresence = null;
  }

  if (
    partnerPresenceRefreshTimer !==
    null
  ) {
    window.clearInterval(
      partnerPresenceRefreshTimer
    );

    partnerPresenceRefreshTimer =
      null;
  }

  const statusRef =
    rtdb.ref('/status');

  let partnerPresence = null;

  const refreshDisplayedStatus =
    () => {
      if (
        !partnerPresence?.lastChanged
      ) {
        partnerPresenceStatus.value =
          'offline';

        return;
      }

      const inactiveFor =
        Date.now() -
        Number(
          partnerPresence.lastChanged
        );

      if (inactiveFor < 10_000) {
        partnerPresenceStatus.value =
          'online';
      } else if (
        inactiveFor <
        5 * 60_000
      ) {
        partnerPresenceStatus.value =
          'away';
      } else {
        partnerPresenceStatus.value =
          'offline';
      }
    };

  const handleStatusSnapshot = (
    snapshot
  ) => {
    const statuses =
      snapshot.val() || {};

    /*
     * Old account rows can remain in
     * Realtime Database. Ignore the
     * current user's row and select the
     * most recently active other user.
     */
    partnerPresence =
      Object.entries(statuses)
        .filter(
          ([uid]) =>
            uid !== currentUid
        )
        .map(
          ([, presence]) =>
            presence
        )
        .sort(
          (first, second) =>
            Number(
              second?.lastChanged || 0
            ) -
            Number(
              first?.lastChanged || 0
            )
        )[0] || null;

    refreshDisplayedStatus();
  };

  const handleStatusError = (
    error
  ) => {
    console.warn(
      'Partner presence subscription failed:',
      error
    );

    partnerPresence = null;
    refreshDisplayedStatus();
  };

  statusRef.on(
    'value',
    handleStatusSnapshot,
    handleStatusError
  );

  /*
   * This timer runs in the app which is
   * viewing the partner's status. It does
   * not depend on the backgrounded
   * partner PWA continuing to run.
   */
  partnerPresenceRefreshTimer =
    window.setInterval(
      refreshDisplayedStatus,
      1000
    );

  unsubscribePartnerPresence =
    () => {
      statusRef.off(
        'value',
        handleStatusSnapshot
      );
    };
}

function clearPartnerPresenceSubscription() {
  if (
    typeof unsubscribePartnerPresence ===
    'function'
  ) {
    unsubscribePartnerPresence();
    unsubscribePartnerPresence = null;
  }

  if (
    partnerPresenceRefreshTimer !==
    null
  ) {
    window.clearInterval(
      partnerPresenceRefreshTimer
    );

    partnerPresenceRefreshTimer =
      null;
  }

  partnerPresenceStatus.value =
    'offline';
}

// -----------------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------------

onMounted(() => {
  window.addEventListener('popstate', handleLocationChange);
  isMobileDevice.value =
    window.matchMedia(
      '(pointer: coarse)'
    ).matches ||
    window.matchMedia(
      '(max-width: 768px)'
    ).matches;

  window.addEventListener(
    'blur',
    setWindowUnfocused
  );

  window.addEventListener(
    'pointerdown',
    handleGlobalPointerDown
  );

  document.addEventListener(
    'visibilitychange',
    setTabUnfocused
  );

  window.addEventListener(
    'map-spots-open-item',
    handleMapSpotOpenItem
  );

  window.addEventListener(
    'pointerdown',

    () => {
      initAudioFromGesture();
    },

    {
      once: true,
      passive: true,
    }
  );

  supportsNotifications.value =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  if (
    supportsNotifications.value
  ) {
    notificationPermission.value =
      Notification.permission;

    if (
      notificationPermission.value ===
        'granted' &&
      user.value
    ) {
      registerDeviceForNotifications();
    }

    navigator.serviceWorker.addEventListener(
      'message',
      handleServiceWorkerMessage
    );
  }

  if (
    typeof window !== 'undefined'
  ) {
    applyDeepLinkFromUrlString(
      window.location.href
    );
  }

  const colors = [
    'magenta',
    'turquoise',
  ];

  const startingColorIndex =
    Math.round(Math.random());

  navColors.value = [
    'home',
    'memos',
    'plans',
    'capsules',
  ].map(
    (_, index) =>
      colors[
        (
          startingColorIndex +
          index
        ) % 2
      ]
  );
});

function openItem({ type, id }) {
  if (!id) {
    return;
  }

  if (type === 'memo') {
    navigateToView('memos', id);
    return;
  }

  if (type === 'plan') {
    navigateToView('plans', id);
  }
}

function handleLocationChange() {
  applyDeepLinkFromUrlString(window.location.href);
}

function handleMapSpotOpenItem(event) {
  openItem(event?.detail || {});
}

function handleInAppNotificationClick() {
  play('tap');

  const data =
    lastNotificationData.value;

  if (data) {
    const urlString =
      data.url ||
      data.link ||
      '/';

    applyDeepLinkFromUrlString(
      urlString
    );
  }

  inAppNotification.visible = false;
}

onUnmounted(() => {
  window.removeEventListener('popstate', handleLocationChange);
  if (unsubscribeAuth) {
    unsubscribeAuth();
  }

  clearPartnerPresenceSubscription();

  if (
    typeof unsubscribeForegroundMessage ===
    'function'
  ) {
    unsubscribeForegroundMessage();
  }

  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator
  ) {
    navigator.serviceWorker.removeEventListener(
      'message',
      handleServiceWorkerMessage
    );
  }

  if (
    typeof window !== 'undefined'
  ) {
    window.removeEventListener(
      'blur',
      setWindowUnfocused
    );

    document.removeEventListener(
      'visibilitychange',
      setTabUnfocused
    );
  }

  window.removeEventListener(
    'map-spots-open-item',
    handleMapSpotOpenItem
  );

  window.removeEventListener(
    'pointerdown',
    handleGlobalPointerDown
  );

  clearDataListeners();
  clearSoundPanelAutoClose();
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
  margin: 0 auto;
}

:global(.love-heart-burst) {
  position: fixed;
  width: var(--hb-size, 14px);
  height: var(--hb-size, 14px);
  pointer-events: none;
  user-select: none;
  z-index: 99999;
  opacity: 0;
  transform:
    translate(-50%, -50%)
    rotate(45deg)
    scale(var(--hb-scale, 1));
  filter:
    blur(0.35px)
    saturate(1.08);
  animation:
    loveHeartBurst
    var(--hb-dur, 1550ms)
    cubic-bezier(0.16, 0.84, 0.24, 1)
    var(--hb-delay, 0ms)
    forwards;
}

:global(.love-heart-burst::before),
:global(.love-heart-burst::after) {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: inherit;
}

:global(.love-heart-burst::before) {
  left: -50%;
}

:global(.love-heart-burst::after) {
  top: -50%;
}

:global(
  .love-heart-burst[data-layer='cyan']
) {
  background: radial-gradient(
    circle at 35% 30%,
    rgba(214, 255, 255, 0.82),
    rgba(0, 255, 255, 0.42) 62%,
    rgba(0, 255, 255, 0.1)
  );

  box-shadow:
    0 0 18px
      rgba(0, 255, 255, 0.28),
    0 0 34px
      rgba(0, 255, 255, 0.16);
}

:global(
  .love-heart-burst[data-layer='magenta']
) {
  background: radial-gradient(
    circle at 35% 30%,
    rgba(255, 220, 247, 0.82),
    rgba(255, 0, 209, 0.44) 62%,
    rgba(255, 0, 209, 0.1)
  );

  box-shadow:
    0 0 18px
      rgba(255, 0, 209, 0.28),
    0 0 34px
      rgba(255, 0, 209, 0.16);
}

:global(
  .love-heart-burst[data-layer='gradient']
) {
  background: linear-gradient(
    140deg,
    rgba(0, 255, 255, 0.54),
    rgba(255, 0, 209, 0.54)
  );

  box-shadow:
    0 0 16px
      rgba(0, 255, 255, 0.22),
    0 0 16px
      rgba(255, 0, 209, 0.22),
    0 0 30px
      rgba(255, 255, 255, 0.08);
}

@keyframes loveHeartBurst {
  0% {
    opacity: 0;
    filter:
      blur(0.6px)
      saturate(1.05);
    transform:
      translate(-50%, -50%)
      rotate(45deg)
      scale(
        calc(
          var(--hb-scale, 1) *
          0.42
        )
      );
  }

  12% {
    opacity: 0.78;
    filter:
      blur(0.2px)
      saturate(1.12);
  }

  38% {
    opacity: 0.72;
    transform:
      translate(
        calc(
          -50% +
          var(--hb-dx) * 0.45 +
          var(--hb-drift) * 0.35
        ),
        calc(
          -50% +
          var(--hb-dy) * 0.45
        )
      )
      rotate(
        calc(
          45deg +
          var(--hb-rot) * 0.45
        )
      )
      scale(
        calc(
          var(--hb-scale, 1) *
          1.06
        )
      );
  }

  72% {
    opacity: 0.42;
    filter:
      blur(0.45px)
      saturate(1.04);
    transform:
      translate(
        calc(
          -50% +
          var(--hb-dx) * 0.78 +
          var(--hb-drift) * 0.75
        ),
        calc(
          -50% +
          var(--hb-dy) * 0.78
        )
      )
      rotate(
        calc(
          45deg +
          var(--hb-rot) * 0.8
        )
      )
      scale(
        calc(
          var(--hb-scale, 1) *
          0.92
        )
      );
  }

  100% {
    opacity: 0;
    filter:
      blur(0.9px)
      saturate(0.98);
    transform:
      translate(
        calc(
          -50% +
          var(--hb-dx) +
          var(--hb-drift)
        ),
        calc(
          -50% +
          var(--hb-dy)
        )
      )
      rotate(
        calc(
          45deg +
          var(--hb-rot)
        )
      )
      scale(
        calc(
          var(--hb-scale, 1) *
          0.68
        )
      );
  }
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
  display: block;
  margin: 2rem auto;
  padding: 1rem 2rem;
  border: none !important;
  border-radius: 2rem;
  outline: none !important;
  color: rgb(253, 8, 200);
  background-color: #0e0d0d00;
  font-family:
    'Great Vibes',
    cursive;
  font-size: 1.8rem;
  font-weight: bold;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.love-button:hover {
  transform: translateY(-5px);
  box-shadow:
    0 4px 10px
    rgba(255, 64, 129, 0.5);
}

.bounce-in {
  margin: auto;
  padding-bottom: 0;
  animation:
    bounce-in
    1s
    cubic-bezier(
      0.175,
      0.885,
      0.32,
      1.275
    )
    forwards;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 101;
  padding-top: 1rem;
}

.view-nav {
  position: relative;
  isolation: isolate;
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: none;
  box-shadow:
    0 36px 12px 28px
    rgba(255, 0, 255, 0.5);
  animation:
    navShadowShift
    10s
    ease-in-out
    infinite
    alternate;
}

.view-nav::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  height: 3%;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(0, 255, 255, 0.95),
    rgba(255, 0, 255, 0.95)
  );
  filter:
    drop-shadow(
      0 0 10px
      rgba(255, 0, 255, 0.35)
    );
}

.view-nav::before {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  height: 3px;
  pointer-events: none;
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
  filter:
    blur(0.4px)
    hue-rotate(0deg)
    saturate(1.4);
  mix-blend-mode: screen;
  animation:
    navCenterSlide
      7.5s
      ease-in-out
      infinite
      alternate,
    navCenterHue
      11s
      ease-in-out
      infinite
      alternate;
}

.welcome-line {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.presence-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border: 1px solid
    rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background:
    rgba(8, 8, 12, 0.26);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter:
    blur(8px);
}

.presence-star {
  font-size: 0.78rem;
  line-height: 1;
}

.presence-online .presence-star {
  color: #76ffe1;
  text-shadow:
    0 0 8px
    rgba(64, 255, 224, 0.65);
}

.presence-away .presence-star {
  color: #ffd57a;
  text-shadow:
    0 0 8px
    rgba(255, 200, 80, 0.55);
}

.presence-offline .presence-star {
  color:
    rgba(220, 230, 255, 0.45);
  text-shadow: none;
}

@keyframes navCenterSlide {
  0% {
    background-position: 0% 0%;
    background-size: 18% 100%;
    opacity: 0.55;
  }

  10% {
    background-position: 8% 0%;
    background-size: 22% 100%;
    opacity: 0.7;
  }

  22% {
    background-position: 22% 0%;
    background-size: 28% 100%;
    opacity: 0.85;
  }

  35% {
    background-position: 40% 0%;
    background-size: 24% 100%;
    opacity: 0.72;
  }

  50% {
    background-position: 58% 0%;
    background-size: 30% 100%;
    opacity: 0.92;
  }

  66% {
    background-position: 74% 0%;
    background-size: 23% 100%;
    opacity: 0.74;
  }

  82% {
    background-position: 90% 0%;
    background-size: 27% 100%;
    opacity: 0.88;
  }

  100% {
    background-position: 100% 0%;
    background-size: 18% 100%;
    opacity: 0.6;
  }
}

@keyframes navCenterHue {
  0% {
    filter:
      blur(0.4px)
      hue-rotate(0deg)
      saturate(1.35)
      brightness(1.05);
  }

  12% {
    filter:
      blur(0.5px)
      hue-rotate(14deg)
      saturate(1.55)
      brightness(1.1);
  }

  26% {
    filter:
      blur(0.4px)
      hue-rotate(32deg)
      saturate(1.4)
      brightness(1.02);
  }

  40% {
    filter:
      blur(0.6px)
      hue-rotate(55deg)
      saturate(1.7)
      brightness(1.12);
  }

  55% {
    filter:
      blur(0.4px)
      hue-rotate(78deg)
      saturate(1.45)
      brightness(1.04);
  }

  72% {
    filter:
      blur(0.6px)
      hue-rotate(98deg)
      saturate(1.8)
      brightness(1.14);
  }

  88% {
    filter:
      blur(0.4px)
      hue-rotate(112deg)
      saturate(1.55)
      brightness(1.06);
  }

  100% {
    filter:
      blur(0.5px)
      hue-rotate(120deg)
      saturate(1.65)
      brightness(1.1);
  }
}

@keyframes navShadowShift {
  0% {
    box-shadow:
      0 18px 26px -6px
      rgba(255, 0, 255, 0.28);
  }

  10% {
    box-shadow:
      0 19px 27px -6px
      rgba(255, 0, 235, 0.32);
  }

  20% {
    box-shadow:
      0 20px 28px -6px
      rgba(255, 0, 205, 0.36);
  }

  30% {
    box-shadow:
      0 20px 29px -6px
      rgba(230, 0, 255, 0.3);
  }

  40% {
    box-shadow:
      0 21px 30px -6px
      rgba(190, 0, 255, 0.38);
  }

  50% {
    box-shadow:
      0 22px 32px -6px
      rgba(120, 40, 255, 0.34);
  }

  60% {
    box-shadow:
      0 23px 33px -6px
      rgba(40, 140, 255, 0.4);
  }

  70% {
    box-shadow:
      0 24px 34px -6px
      rgba(0, 200, 255, 0.36);
  }

  80% {
    box-shadow:
      0 24px 34px -6px
      rgba(0, 235, 255, 0.42);
  }

  90% {
    box-shadow:
      0 23px 33px -6px
      rgba(0, 255, 235, 0.38);
  }

  100% {
    box-shadow:
      0 22px 32px -6px
      rgba(0, 255, 255, 0.34);
  }
}

/* Floating partner presence star */
.presence-floating-wrap {
  position: fixed;
  top: 5.2rem;
  left: 1rem;
  z-index: 1300;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 999px;
  background:
    radial-gradient(
      circle at 22% 20%,
      rgba(0, 255, 255, 0.12),
      transparent 62%
    ),
    radial-gradient(
      circle at 78% 82%,
      rgba(255, 0, 255, 0.12),
      transparent 62%
    ),
    rgba(10, 10, 16, 0.14);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter:
    blur(8px);
}

.presence-floating-star {
  color:
    rgba(225, 235, 255, 0.45);
  font-size: 1.28rem;
  line-height: 1;
  text-shadow: none;
  transform:
    translateY(-0.5px);
  transition:
    color 0.25s ease,
    text-shadow 0.25s ease,
    transform 0.25s ease;
}

/* Online: cyan/magenta glow */
.presence-online {
  color:
    rgba(120, 255, 235, 0.9);
  text-shadow:
    0 0 7px
      rgba(0, 255, 255, 0.38),
    0 0 12px
      rgba(255, 0, 255, 0.22);
}

/* Away: yellow/warm glow */
.presence-away {
  color:
    rgba(255, 220, 155, 0.82);
  text-shadow:
    0 0 6px
      rgba(255, 0, 255, 0.22),
    0 0 8px
      rgba(0, 255, 255, 0.16);
}

/* Offline: dim glass */
.presence-offline {
  color:
    rgba(215, 225, 245, 0.35);
  text-shadow: none;
}

.view-nav a {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 0.65rem;
  padding: 0.35rem 0.95rem;
  border: 1px solid
    rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  outline: none;
  color: #aaa;
  background:
    radial-gradient(
      circle at 22% 20%,
      rgba(0, 255, 255, 0.17),
      transparent 62%
    ),
    radial-gradient(
      circle at 78% 82%,
      rgba(255, 0, 255, 0.17),
      transparent 62%
    ),
    rgba(10, 10, 16, 0.14);
  box-shadow:
    0 8px 18px
      rgba(0, 0, 0, 0.24),
    inset 0 1px 0
      rgba(255, 255, 255, 0.08);
  font-family:
    'Great Vibes',
    cursive;
  font-size: 1.65rem;
  font-weight: 400;
  text-shadow:
    0 0 4px
    rgba(255, 255, 255, 0.08);
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter:
    blur(8px);
  will-change: transform;
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
  border-color:
    color-mix(
      in srgb,
      var(--active-color) 45%,
      white 10%
    );
  box-shadow:
    0 12px 24px
      rgba(0, 0, 0, 0.3),
    0 0 18px
      color-mix(
        in srgb,
        var(--active-color) 24%,
        transparent
      );
  text-shadow:
    0 0 6px
      color-mix(
        in srgb,
        var(--active-color) 75%,
        white 10%
      ),
    0 0 14px
      color-mix(
        in srgb,
        var(--active-color) 35%,
        magenta 20%
      );
  transform:
    translateY(-2px)
    scale(1.06);
}

.view-nav a.active {
  color: var(--active-color);
  border-color:
    color-mix(
      in srgb,
      var(--active-color) 40%,
      white 12%
    );
  box-shadow:
    0 10px 22px
      rgba(0, 0, 0, 0.28),
    0 0 20px
      color-mix(
        in srgb,
        var(--active-color) 30%,
        transparent
      );
  text-shadow:
    0 0 5px
      var(--active-color),
    0 0 15px
      var(--active-color);
}

.notification-control-fixed {
  position: fixed;
  bottom: 5rem;
  left: 1.5rem;
  z-index: 10;
}

.notification-btn {
  width: 110px;
  padding: 0.7em 1.2em;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition:
    background-color 0.3s;
}

.notification-btn.enable {
  color: white;
  background-color: #42b883;
}

.notification-btn.enable:hover {
  background-color: #36a473;
}

.logout-button {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: none;
  border-radius: 50%;
  background-color: transparent;
  cursor: pointer;
  transition:
    background-color 1s;
}

.logout-button:hover {
  background-color:
    rgba(245, 8, 245, 0.356);
}

.card.is-full-width {
  width: 90%;
  max-width: 90%;
}

.card.home-view-card {
  width: 75%;
  max-width: 1100px;
}

.slide-fade-enter-active {
  transition:
    all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition:
    all 0.3s
    cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform:
    translateX(20px);
}

/* Floating map button */
.floating-map-nav {
  position: fixed;
  top: 50%;
  left:
    max(
      0.65rem,
      env(safe-area-inset-left)
    );
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  opacity: 0.9;
  cursor: pointer;
  transform:
    translateY(-50%);
  transition:
    transform
      var(--ds-transition-fast),
    opacity
      var(--ds-transition-fast);
}

.floating-map-nav:hover {
  opacity: 1;
  transform:
    translateY(
      calc(-50% - 2px)
    )
    scale(1.05);
}

.floating-map-nav.active {
  opacity: 1;
}

.floating-map-nav:focus,
.floating-map-nav:focus-visible,
.floating-map-nav:active {
  outline: none;
}

.floating-map-nav-icon {
  display: block;
  width: 2.15rem;
  height: 2.15rem;
  filter:
    drop-shadow(
      0 0 6px
      rgba(0, 247, 255, 0.28)
    )
    drop-shadow(
      0 0 9px
      rgba(255, 79, 233, 0.22)
    );
}

/* Floating sound button */
.floating-sound-nav {
  position: fixed;
  top: 50%;
  right:
    max(
      0.65rem,
      env(safe-area-inset-right)
    );
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  opacity: 0.92;
  cursor: pointer;
  transform:
    translateY(-50%);
  transition:
    transform
      var(--ds-transition-fast),
    opacity
      var(--ds-transition-fast);
}

.floating-sound-nav:hover {
  opacity: 1;
  transform:
    translateY(
      calc(-50% - 2px)
    )
    scale(1.05);
}

.floating-sound-nav.active {
  opacity: 1;
}

.floating-sound-nav:focus,
.floating-sound-nav:focus-visible,
.floating-sound-nav:active {
  outline: none;
}

.floating-sound-nav-icon {
  display: block;
  width: 2.15rem;
  height: 2.15rem;
  filter:
    drop-shadow(
      0 0 6px
      rgba(0, 247, 255, 0.28)
    )
    drop-shadow(
      0 0 9px
      rgba(255, 79, 233, 0.22)
    );
}

.floating-sound-panel {
  position: fixed;
  top: 50%;
  right:
    max(
      2.9rem,
      calc(
        env(safe-area-inset-right) +
        2.6rem
      )
    );
  z-index: 1100;
  width:
    min(320px, 76vw);
  padding:
    var(--ds-space-4);
  border:
    1px solid
    var(--ds-color-border);
  border-radius:
    var(--ds-radius-lg);
  background:
    radial-gradient(
      circle at 18% 16%,
      rgba(0, 247, 255, 0.14),
      transparent 60%
    ),
    radial-gradient(
      circle at 82% 84%,
      rgba(255, 79, 233, 0.14),
      transparent 62%
    ),
    rgba(10, 10, 16, 0.26);
  box-shadow:
    var(--ds-shadow-soft),
    0 0 14px
      rgba(255, 79, 233, 0.18),
    0 0 16px
      rgba(0, 247, 255, 0.14);
  font-family:
    var(--ds-font-body);
  transform:
    translateY(-50%);
  backdrop-filter:
    blur(14px);
  -webkit-backdrop-filter:
    blur(14px);
}

.sound-panel-head {
  display: flex;
  align-items: center;
  justify-content:
    space-between;
  gap:
    var(--ds-space-3);
  margin-bottom:
    var(--ds-space-3);
}

.sound-panel-head h4 {
  margin: 0;
  color:
    var(--ds-color-text);
  font-family:
    var(--ds-font-body);
  font-size:
    var(--ds-text-md);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-shadow:
    0 0 7px
      rgba(255, 79, 233, 0.22),
    0 0 10px
      rgba(0, 247, 255, 0.16);
}

.sound-toggle-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color:
    var(--ds-color-text-soft);
  font-family:
    var(--ds-font-body);
  font-size:
    var(--ds-text-sm);
}

.sound-toggle-inline
input[type='checkbox'] {
  accent-color:
    var(--ds-color-accent-cyan);
}

.sound-panel-row {
  display: grid;
  grid-template-columns:
    1fr auto;
  grid-template-areas:
    'label value'
    'slider slider';
  align-items: center;
  gap: 0.4rem 0.65rem;
}

.sound-panel-row label {
  grid-area: label;
  color:
    var(--ds-color-text-soft);
  font-family:
    var(--ds-font-body);
  font-size:
    var(--ds-text-sm);
}

.sound-panel-row small {
  grid-area: value;
  min-width: 3ch;
  color:
    var(--ds-color-text-muted);
  font-family:
    var(--ds-font-body);
  font-size:
    var(--ds-text-sm);
  text-align: right;
}

.sound-panel-row
input[type='range'] {
  grid-area: slider;
  width: 100%;
  height: 6px;
  border:
    1px solid
    var(--ds-color-border);
  border-radius:
    var(--ds-radius-pill);
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(
    90deg,
    color-mix(
      in srgb,
      var(--ds-color-accent-cyan) 82%,
      transparent
    )
    0%,
    color-mix(
      in srgb,
      var(--ds-color-accent-magenta) 82%,
      transparent
    )
    100%
  );
  box-shadow:
    inset 0 0 10px
      rgba(0, 0, 0, 0.28),
    0 0 8px
      rgba(0, 247, 255, 0.14),
    0 0 8px
      rgba(255, 79, 233, 0.12);
}

.sound-panel-row
input[type='range']
::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  border:
    1px solid
    var(--ds-color-border-strong);
  border-radius: 50%;
  appearance: none;
  -webkit-appearance: none;
  background:
    radial-gradient(
      circle at 30% 30%,
      rgba(255, 255, 255, 0.5),
      rgba(255, 255, 255, 0.04) 62%
    ),
    linear-gradient(
      135deg,
      var(--ds-color-accent-cyan),
      var(--ds-color-accent-magenta)
    );
  box-shadow:
    0 0 8px
      rgba(0, 247, 255, 0.22),
    0 0 8px
      rgba(255, 79, 233, 0.2);
  cursor: pointer;
}

.sound-panel-row
input[type='range']
::-moz-range-track {
  height: 6px;
  border:
    1px solid
    var(--ds-color-border);
  border-radius:
    var(--ds-radius-pill);
  background: linear-gradient(
    90deg,
    color-mix(
      in srgb,
      var(--ds-color-accent-cyan) 82%,
      transparent
    )
    0%,
    color-mix(
      in srgb,
      var(--ds-color-accent-magenta) 82%,
      transparent
    )
    100%
  );
  box-shadow:
    inset 0 0 10px
    rgba(0, 0, 0, 0.28);
}

.sound-panel-row
input[type='range']
::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border:
    1px solid
    var(--ds-color-border-strong);
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--ds-color-accent-cyan),
    var(--ds-color-accent-magenta)
  );
  box-shadow:
    0 0 8px
      rgba(0, 247, 255, 0.22),
    0 0 8px
      rgba(255, 79, 233, 0.2);
  cursor: pointer;
}

.sound-panel-fade-enter-active,
.sound-panel-fade-leave-active {
  transition:
    opacity
      var(--ds-transition-fast),
    transform
      var(--ds-transition-fast);
}

.sound-panel-fade-enter-from,
.sound-panel-fade-leave-to {
  opacity: 0;
  transform:
    translateY(-50%)
    translateX(10px);
}

@media (max-width: 768px) {
  .presence-floating-wrap {
    top: 4.6rem;
    left: 0.7rem;
    width: 1.95rem;
    height: 1.95rem;
  }

  .presence-floating-star {
    font-size: 1.16rem;
  }

  .view-nav a {
    margin: 0 0.35rem;
    padding: 0.25rem 0.7rem;
    font-size: 1.4rem;
  }

  .floating-map-nav {
    left:
      max(
        0.25rem,
        env(safe-area-inset-left)
      );
  }

  .floating-map-nav-icon {
    width: 1.8rem;
    height: 1.8rem;
  }

  .floating-sound-nav {
    right:
      max(
        0.25rem,
        env(safe-area-inset-right)
      );
  }

  .floating-sound-nav-icon {
    width: 1.8rem;
    height: 1.8rem;
  }

  .floating-sound-panel {
    right:
      max(
        2.45rem,
        calc(
          env(safe-area-inset-right) +
          2.2rem
        )
      );
    width:
      min(280px, 80vw);
    padding:
      var(--ds-space-3)
      var(--ds-space-4);
  }
}
</style>
