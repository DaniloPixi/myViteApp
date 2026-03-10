<template>
  <div v-if="showLauncher" class="notification-stack-launcher">
    <button
      class="launcher-button"
      type="button"
      aria-label="Open unread notifications"
      @click="emit('toggle')"
    >
      <span class="launcher-icon">🔔</span>
      <span class="launcher-count">{{ unreadCount }}</span>
    </button>

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
          @touchstart.passive="onTouchStart(notification.id, $event)"
          @touchend.passive="onTouchEnd(notification.id, $event)"
          @click="openNotification(notification.id)"
        >
          <div class="stack-item-content">
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
  </div>
</template>

<script setup>
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

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const onTouchStart = (id, event) => {
  if (!props.isMobile) return;
  touchStartXById.set(id, event.changedTouches?.[0]?.clientX ?? 0);
};

const onTouchEnd = (id, event) => {
  if (!props.isMobile) return;

  const startX = touchStartXById.get(id);
  if (typeof startX !== 'number') return;

  const endX = event.changedTouches?.[0]?.clientX ?? startX;
  const deltaX = endX - startX;
  const swipeThreshold = 60;

  if (Math.abs(deltaX) >= swipeThreshold) {
    emit('dismiss', id);
  }

  touchStartXById.delete(id);
};

const openNotification = (id) => {
  emit('open', id);
};
</script>

<style scoped>
.notification-stack-launcher {
  position: fixed;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  z-index: 4000;
}

.launcher-button {
  width: 58px;
  height: 58px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 0, 255, 0.95), rgba(0, 255, 255, 0.85));
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  position: relative;
}

.launcher-icon {
  font-size: 1.2rem;
}

.launcher-count {
  position: absolute;
  top: -0.3rem;
  right: -0.3rem;
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.stack-panel {
  width: min(360px, 90vw);
  max-height: min(65vh, 500px);
  overflow: hidden;
  margin-bottom: 0.75rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}

.stack-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.stack-header h4 {
  margin: 0;
  color: #fff;
}

.panel-close,
.item-dismiss {
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
}

.panel-close {
  width: 28px;
  height: 28px;
}

.stack-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  overflow-y: auto;
  max-height: calc(min(65vh, 500px) - 54px);
}

.stack-item {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0.65rem;
  margin-bottom: 0.55rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
}

.stack-item-content h5 {
  margin: 0;
  color: #fff;
}

.stack-item-content p {
  margin: 0.25rem 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9rem;
}

.stack-item-content small {
  color: rgba(255, 255, 255, 0.65);
}

.item-dismiss {
  padding: 0.3rem 0.45rem;
}

@media (max-width: 768px) {
  .notification-stack-launcher {
    right: 0.7rem;
    bottom: calc(0.85rem + env(safe-area-inset-bottom));
  }
}
</style>
