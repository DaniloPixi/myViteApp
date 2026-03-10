<template>
  <div v-if="showLauncher" class="notification-stack-shell">
    <transition name="stack-pop">
      <section v-if="visible" class="stack-panel" aria-label="Unread notifications">
        <header class="stack-header">
          <h4>Unread notifications</h4>
          <button class="panel-close" type="button" @click="emit('toggle')">×</button>
        </header>

        <ul class="stack-list">
          <li
            v-for="notification in notifications"
            :key="notification.id"
            class="stack-item"
          >
            <div
              class="stack-item-body"
              :style="itemStyles[notification.id] || ''"
              @touchstart.passive="onTouchStart(notification.id, $event)"
              @touchmove.passive="onTouchMove(notification.id, $event)"
              @touchend.passive="onTouchEnd(notification.id, $event)"
              @click="openNotification(notification.id)"
            >
              <h5>{{ notification.title }}</h5>
              <p>{{ notification.body }}</p>
              <small>{{ formatTimestamp(notification.createdAt) }}</small>
            </div>

            <button
              v-if="!isMobile"
              class="item-dismiss"
              type="button"
              @click.stop="emit('dismiss', notification.id)"
            >
              Close
            </button>
          </li>
        </ul>
      </section>
    </transition>

    <button
      class="launcher-button"
      type="button"
      aria-label="Open unread notifications"
      @click="emit('toggle')"
    >
      <span class="launcher-icon">🔔</span>
      <span class="launcher-count">{{ unreadCount }}</span>
    </button>
  </div>
</template>

<script setup>
import { reactive } from 'vue';

const props = defineProps({
  showLauncher: {
    type: Boolean,
    required: true,
  },
  unreadCount: {
    type: Number,
    required: true,
  },
  notifications: {
    type: Array,
    required: true,
  },
  visible: {
    type: Boolean,
    required: true,
  },
  isMobile: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['toggle', 'dismiss', 'open']);

const touchStartXById = new Map();
const touchDeltaById = new Map();
const itemStyles = reactive({});

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const onTouchStart = (id, event) => {
  if (!props.isMobile) return;
  touchStartXById.set(id, event.changedTouches?.[0]?.clientX ?? 0);
  touchDeltaById.set(id, 0);
};

const onTouchMove = (id, event) => {
  if (!props.isMobile) return;

  const startX = touchStartXById.get(id);
  if (typeof startX !== 'number') return;

  const currentX = event.changedTouches?.[0]?.clientX ?? startX;
  const deltaX = currentX - startX;
  const limitedDelta = Math.max(Math.min(deltaX, 90), -90);
  const opacity = Math.max(0.3, 1 - Math.abs(limitedDelta) / 140);

  touchDeltaById.set(id, deltaX);
  itemStyles[id] = `transform: translateX(${limitedDelta}px); opacity: ${opacity};`;
};

const onTouchEnd = (id, event) => {
  if (!props.isMobile) return;

  const startX = touchStartXById.get(id);
  if (typeof startX !== 'number') return;

  const endX = event.changedTouches?.[0]?.clientX ?? startX;
  const deltaX = endX - startX;
  const swipeThreshold = 70;

  if (Math.abs(deltaX) >= swipeThreshold) {
    emit('dismiss', id);
  }

  itemStyles[id] = '';
  touchStartXById.delete(id);
  touchDeltaById.delete(id);
};

const openNotification = (id) => {
  const deltaX = touchDeltaById.get(id) || 0;
  if (props.isMobile && Math.abs(deltaX) > 8) {
    return;
  }

  emit('open', id);
};
</script>

<style scoped>
.notification-stack-shell {
  position: fixed;
  right: clamp(0.6rem, 2vw, 1.2rem);
  top: 50%;
  transform: translateY(-50%);
  z-index: 4000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.launcher-button {
  width: 62px;
  height: 62px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background:
    radial-gradient(circle at 20% 20%, rgba(0, 255, 255, 0.45), transparent 55%),
    radial-gradient(circle at 85% 85%, rgba(255, 0, 255, 0.38), transparent 60%),
    rgba(8, 8, 16, 0.58);
  backdrop-filter: blur(13px);
  -webkit-backdrop-filter: blur(13px);
  box-shadow:
    0 0 18px rgba(255, 0, 255, 0.45),
    0 0 26px rgba(0, 255, 255, 0.3);
  color: #fff;
  cursor: pointer;
  position: relative;
}

.launcher-icon {
  font-size: 1.25rem;
}

.launcher-count {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  min-width: 23px;
  height: 23px;
  border-radius: 999px;
  background: rgba(10, 10, 14, 0.86);
  border: 1px solid rgba(0, 255, 255, 0.7);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.74rem;
  font-weight: 700;
}

.stack-panel {
  width: min(420px, 90vw);
  max-height: min(68vh, 540px);
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background:
    radial-gradient(circle at 0% 0%, rgba(0, 255, 255, 0.14), transparent 56%),
    radial-gradient(circle at 100% 100%, rgba(255, 0, 255, 0.16), transparent 55%),
    rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow:
    0 0 22px rgba(255, 0, 255, 0.35),
    0 0 30px rgba(0, 255, 255, 0.26);
}

.stack-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.95rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.stack-header h4 {
  margin: 0;
  color: #f4f8ff;
  font-family: 'Great Vibes', cursive;
  font-size: 1.45rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-shadow:
    0 0 8px rgba(255, 0, 255, 0.4),
    0 0 11px rgba(0, 255, 255, 0.3);
}

.panel-close,
.item-dismiss {
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
}

.panel-close {
  width: 30px;
  height: 30px;
  font-size: 1.2rem;
  line-height: 1;
}

.stack-list {
  list-style: none;
  margin: 0;
  padding: 0.55rem;
  overflow-y: auto;
  max-height: calc(min(68vh, 540px) - 60px);
}

.stack-item {
  display: flex;
  align-items: stretch;
  gap: 0.55rem;
  margin-bottom: 0.55rem;
}

.stack-item-body {
  flex: 1;
  padding: 0.7rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.stack-item-body h5 {
  margin: 0;
  color: #fff;
  font-size: 0.95rem;
}

.stack-item-body p {
  margin: 0.25rem 0;
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.9rem;
}

.stack-item-body small {
  color: rgba(255, 255, 255, 0.65);
}

.item-dismiss {
  padding: 0.3rem 0.5rem;
  align-self: center;
}

.stack-pop-enter-active,
.stack-pop-leave-active {
  transition: all 0.2s ease;
}

.stack-pop-enter-from,
.stack-pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}

@media (max-width: 768px) {
  .notification-stack-shell {
    right: 50%;
    top: auto;
    bottom: calc(0.95rem + env(safe-area-inset-bottom));
    transform: translateX(50%);
    align-items: center;
  }

  .stack-panel {
    width: min(94vw, 430px);
  }
}
</style>
