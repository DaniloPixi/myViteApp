<template>
  <BaseCapsuleModal
    title-id="tc-read-title"
    :show-close-icon="false"
    @close="emitClose"
  >
    <template #label>
      Time capsule
    </template>

    <template #title>
      {{ capsule.title || 'Untitled capsule' }}
    </template>

    <template #subtitle>
      From {{ fromLabel }}
      <span v-if="recipientLabel">
        · To {{ recipientLabel }}
      </span>
    </template>

    <!-- BODY -->
    <div class="tc-read-message-wrap">
      <p class="tc-read-message">
        {{ capsule.message || 'No message text.' }}
      </p>
    </div>

    <!-- Media gallery -->
    <div
      v-if="capsule.photos && capsule.photos.length"
      class="tc-read-media-gallery"
    >
      <div
        v-for="(media, index) in capsule.photos"
        :key="index"
        class="tc-read-media-item"
      >
        <img
          v-if="media.resource_type === 'image' || !media.resource_type"
          :src="media.url"
          class="tc-read-media-img"
          alt="Time capsule image"
        />
        <video
          v-else-if="media.resource_type === 'video'"
          :src="media.url"
          class="tc-read-media-video"
          controls
          playsinline
        ></video>
      </div>
    </div>

    <div class="tc-read-meta">
      <p v-if="capsule.createdAt" class="tc-meta-line">
        <span class="tc-meta-label">Written</span>
        <span class="tc-meta-value">{{ formatDate(capsule.createdAt) }}</span>
      </p>
      <p v-if="capsule.openedAt" class="tc-meta-line">
        <span class="tc-meta-label">Opened</span>
        <span class="tc-meta-value">{{ formatDate(capsule.openedAt) }}</span>
      </p>
    </div>

    <!-- FOOTER -->
    <template #footer-text>
      Saved in your shared galaxy of memories.
    </template>

    <template #footer-right>
      <button class="tc-btn tc-btn-ghost" @click="emitClose">
        Close
      </button>
    </template>
  </BaseCapsuleModal>
</template>

<script setup>
import { computed } from 'vue';
import BaseCapsuleModal from './BaseCapsuleModal.vue';

const props = defineProps({
  capsule: { type: Object, required: true },
  isMine: { type: Boolean, default: false },
  recipientLabel: { type: String, default: '' },
  partnerName: { type: String, default: 'partner' },
});

const emit = defineEmits(['close']);

// hard-coded because this app is literally just you + your girlfriend
const MY_NAME = 'Dani';

function emitClose() {
  emit('close');
}

function formatDate(raw) {
  if (!raw) return 'Unknown';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// From-label = Dani if it's yours, otherwise partner's name ("Eva")
const fromLabel = computed(() =>
  props.isMine ? MY_NAME : props.partnerName
);
</script>

<style scoped>
.tc-read-message-wrap {
  position: relative;
  margin-top: 1.1rem;
  padding: 0.4rem 1.1rem;
  border-radius: 16px;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.08), transparent 65%),
    rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 0, 255, 0.75);
  max-height: 260px;
  overflow-y: auto;
  box-shadow:
    0 0 16px rgba(255, 0, 255, 0.6),
    0 0 20px rgba(0, 255, 255, 0.45);
  animation: message-border-glow 2.5s ease-in-out infinite alternate;
}

@keyframes message-border-glow {
  0% {
    border-color: rgba(255, 0, 255, 0.8);
    box-shadow:
      0 0 16px rgba(255, 0, 255, 0.8),
      0 0 20px rgba(0, 255, 255, 0.35);
  }
  50% {
    border-color: rgba(0, 255, 255, 0.9);
    box-shadow:
      0 0 18px rgba(0, 255, 255, 0.8),
      0 0 26px rgba(255, 0, 255, 0.45);
  }
  100% {
    border-color: rgba(255, 0, 255, 0.85);
    box-shadow:
      0 0 16px rgba(255, 0, 255, 0.75),
      0 0 22px rgba(0, 255, 255, 0.45);
  }
}

/* subtle fading edges for scroll */
.tc-read-message-wrap::before,
.tc-read-message-wrap::after {
  content: "";
  position: sticky;
  left: 0;
  right: 0;
  height: 14px;
  pointer-events: none;
  z-index: 1;
}

.tc-read-message-wrap::before {
  top: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.95), transparent);
}

.tc-read-message-wrap::after {
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95), transparent);
}

.tc-read-message {
  margin: 0;
  font-size: 1.3rem;
  line-height: 1.6;
  font-family: 'Great Vibes', cursive;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #ffeaff;
  text-shadow: 0 0 6px rgba(255, 0, 255, 0.3);
  white-space: pre-line;
}

/* Media gallery – bigger items */

.tc-read-media-gallery {
  margin-top: 0.9rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.55rem;
}

.tc-read-media-item {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 0 12px rgba(255, 0, 255, 0.45),
    0 0 16px rgba(0, 255, 255, 0.35);
}

.tc-read-media-img,
.tc-read-media-video {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
}

/* meta info */

/* meta info */

.tc-read-meta {
  margin-top: 0.9rem;
  align-self: center;

  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.35rem 0.9rem;

  padding: 0.45rem 1.1rem;
  border-radius: 999px;

  background:
    radial-gradient(circle at 0% 0%, rgba(0, 255, 255, 0.12), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(255, 0, 255, 0.12), transparent 60%),
    rgba(0, 0, 0, 0.9);

  border: 1px solid rgba(0, 255, 255, 0.55);
  box-shadow:
    0 0 10px rgba(0, 255, 255, 0.45),
    0 0 14px rgba(255, 0, 255, 0.35);

  color: #c7fdff;
  font-size: 0.8rem;
}

.tc-meta-line {
  margin: 0;
  position: relative;

  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  white-space: nowrap;
  padding-left: 0.9rem; /* space for the dot */
}

/* glowing dot for each meta line */
.tc-meta-line::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  transform: translateY(-50%);

  background: radial-gradient(circle, #00ffff 0%, #ff00ff 70%);
  box-shadow:
    0 0 6px rgba(0, 255, 255, 0.8),
    0 0 8px rgba(255, 0, 255, 0.7);
}

.tc-meta-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.68rem;
  opacity: 0.9;
  color: #7ef7ff;
}

.tc-meta-value {
  font-size: 0.8rem;
  color: #e4feff;
}

/* make sure it still feels good on very small screens */
@media (max-width: 480px) {
  .tc-read-meta {
    padding: 0.45rem 0.8rem;
    gap: 0.25rem 0.6rem;
  }

  .tc-meta-line {
    white-space: normal;
  }
}


.tc-meta-line {
  margin: 0;
  display: inline-flex;
  justify-content: center;
  gap: 0.35rem;
  align-items: baseline;
}

.tc-meta-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.7rem;
  opacity: 0.9;
  color: #7ef7ff;
}

.tc-meta-value {
  font-size: 0.8rem;
  color: #c7fdff;
}

/* Buttons */

.tc-btn {
  border-radius: 999px;
  padding: 0.3rem 0.95rem;
  font-size: 0.8rem;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: #f5f5ff;
  transition: all 0.15s ease;
}

.tc-btn-ghost {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(0, 0, 0, 0.65);
}

.tc-btn-ghost:hover {
  border-color: rgba(0, 255, 255, 0.9);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  transform: translateY(-0.5px);
}

/* Scrollbar styling inside message */

.tc-read-message-wrap::-webkit-scrollbar {
  width: 6px;
}

.tc-read-message-wrap::-webkit-scrollbar-track {
  background: transparent;
}

.tc-read-message-wrap::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, magenta, cyan);
  border-radius: 999px;
}

@media (max-width: 700px) {
  .tc-read-message-wrap {
    max-height: 220px;
  }

  .tc-read-media-img,
  .tc-read-media-video {
    height: 110px;
  }
}
</style>
