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
    <div class="tc-read-message-wrap ds-scrollbar-none">
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
        @click="openMediaViewer(index)"
      >
      <img
  v-if="media.resource_type === 'image' || !media.resource_type"
  :src="getImageUrlByPreset(media.url, 'card')"
  class="tc-read-media-img"
  alt="Time capsule image"
  width="600"
  height="420"
/>
        <video
          v-else-if="media.resource_type === 'video'"
          :src="media.url"
          class="tc-read-media-video"
          playsinline
          muted
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

  <!-- FULLSCREEN MEDIA VIEWER -->
  <ImageModal
    :is-visible="isMediaViewerVisible"
    :media-items="capsule.photos || []"
    :start-index="mediaViewerIndex"
    @close="closeMediaViewer"
  />
</template>

<script setup>
  import { ref, computed } from 'vue';
  import BaseCapsuleModal from './BaseCapsuleModal.vue';
  import ImageModal from './ImageModal.vue';
  import { usePhotoUtils } from '../composables/usePhotoUtils';

const { getImageUrlByPreset } = usePhotoUtils();
  const props = defineProps({
    capsule: { type: Object, required: true },
    isMine: { type: Boolean, default: false },
    recipientLabel: { type: String, default: '' },
    partnerName: { type: String, default: 'partner' },
    fromName: { type: String, default: 'Dani' },
  });
  
  const emit = defineEmits(['close']);
  
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
  
  // If it's "my" capsule → fromName, otherwise → partnerName
  const fromLabel = computed(() =>
    props.isMine ? props.fromName : props.partnerName
  );
  
  const isMediaViewerVisible = ref(false);
  const mediaViewerIndex = ref(0);
  
  function openMediaViewer(index) {
    mediaViewerIndex.value = index || 0;
    isMediaViewerVisible.value = true;
  }
  
  function closeMediaViewer() {
    isMediaViewerVisible.value = false;
  }
  </script>
  

<style scoped>
.tc-read-message-wrap {
  position: relative;
  margin-top: var(--ds-space-4);
  padding: 0.75rem 1rem;
  border-radius: var(--ds-radius-lg);
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.06), transparent 65%),
    rgba(0, 0, 0, 0.88);
  border: 1px solid rgba(255, 79, 233, 0.48);
  max-height: 260px;
  overflow-y: auto;
  box-shadow:
    0 0 14px rgba(255, 79, 233, 0.28),
    0 0 18px rgba(0, 247, 255, 0.2);
  animation: message-border-glow 2.8s ease-in-out infinite alternate;
}

@keyframes message-border-glow {
  0% {
    border-color: rgba(255, 79, 233, 0.56);
    box-shadow:
      0 0 14px rgba(255, 79, 233, 0.28),
      0 0 18px rgba(0, 247, 255, 0.16);
  }
  50% {
    border-color: rgba(0, 247, 255, 0.52);
    box-shadow:
      0 0 16px rgba(0, 247, 255, 0.24),
      0 0 22px rgba(255, 79, 233, 0.18);
  }
  100% {
    border-color: rgba(255, 79, 233, 0.58);
    box-shadow:
      0 0 14px rgba(255, 79, 233, 0.26),
      0 0 20px rgba(0, 247, 255, 0.18);
  }
}

.tc-read-message-wrap::before,
.tc-read-message-wrap::after {
  content: '';
  position: sticky;
  left: 0;
  right: 0;
  height: 14px;
  pointer-events: none;
  z-index: 1;
}

.tc-read-message-wrap::before {
  top: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.94), transparent);
}

.tc-read-message-wrap::after {
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.94), transparent);
}

.tc-read-message {
  margin: 0;
  font-family: var(--ds-font-body);
  font-size: clamp(1.15rem, 1rem + 0.6vw, 1.35rem);
  line-height: 1.55;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #ffeaff;
  text-shadow: 0 0 6px rgba(255, 79, 233, 0.22);
  white-space: pre-line;
}

@media (max-width: 700px) {
  .tc-read-message-wrap {
    max-height: 220px;
    padding: 0.65rem 0.85rem;
  }

  .tc-read-message {
    font-size: clamp(1.05rem, 0.95rem + 0.65vw, 1.2rem);
    line-height: 1.5;
  }
}

/* Media gallery – centered items */

.tc-read-media-gallery {
  margin-top: var(--ds-space-4);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--ds-space-3);
}

.tc-read-media-item {
  position: relative;
  overflow: hidden;
  border-radius: var(--ds-radius-md);
  border: 1px solid rgba(255, 255, 255, 0.14);
  background:
    radial-gradient(circle at 18% 16%, rgba(0, 247, 255, 0.08), transparent 60%),
    radial-gradient(circle at 82% 84%, rgba(255, 79, 233, 0.08), transparent 62%),
    rgba(0, 0, 0, 0.86);
  box-shadow:
    0 0 12px rgba(255, 79, 233, 0.18),
    0 0 16px rgba(0, 247, 255, 0.14);
  cursor: zoom-in;
  transition:
    transform var(--ds-transition-fast),
    box-shadow var(--ds-transition-base),
    border-color var(--ds-transition-base);
}

.tc-read-media-item:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.22);
  box-shadow:
    0 0 16px rgba(255, 79, 233, 0.24),
    0 0 20px rgba(0, 247, 255, 0.18);
}

.tc-read-media-img,
.tc-read-media-video {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: contain;
  background: var(--ds-gradient-glass)
}

@media (max-width: 700px) {
  .tc-read-media-gallery {
    grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
    gap: var(--ds-space-2);
  }

  .tc-read-media-img,
  .tc-read-media-video {
    height: 110px;
  }
}

/* meta info */

.tc-read-meta {
  margin-top: var(--ds-space-4);
  align-self: center;
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.45rem 0.9rem;
  padding: 0.55rem 1rem;
  border-radius: var(--ds-radius-pill);
  background:
    radial-gradient(circle at 0% 0%, rgba(0, 247, 255, 0.14), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(255, 79, 233, 0.14), transparent 60%),
    rgba(0, 0, 0, 0.82);
  border: 1px solid rgba(0, 247, 255, 0.42);
  box-shadow:
    0 0 10px rgba(0, 247, 255, 0.2),
    0 0 14px rgba(255, 79, 233, 0.18);
  color: #d8ffff;
  font-size: var(--ds-text-sm);
}

.tc-meta-line {
  margin: 0;
  position: relative;
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.3rem;
  white-space: nowrap;
  padding-left: 0.9rem;
}

.tc-meta-line::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: var(--ds-radius-pill);
  transform: translateY(-50%);
  background: radial-gradient(circle, var(--ds-color-accent-cyan) 0%, var(--ds-color-accent-magenta) 70%);
  box-shadow:
    0 0 6px rgba(0, 247, 255, 0.65),
    0 0 8px rgba(255, 79, 233, 0.5);
}

.tc-meta-label {
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(126, 247, 255, 0.92);
  opacity: 0.9;
}

.tc-meta-value {
  font-size: var(--ds-text-sm);
  color: #ebffff;
}

@media (max-width: 480px) {
  .tc-read-meta {
    padding: 0.45rem 0.8rem;
    gap: 0.3rem 0.65rem;
  }

  .tc-meta-line {
    white-space: normal;
  }
}

/* Buttons */

.tc-btn {
  min-height: 2.35rem;
  padding: 0.55rem 1rem;
  border-radius: var(--ds-radius-pill);
  border: 1px solid transparent;
  background: var(--ds-gradient-glass);
  color: var(--ds-color-text);
  font: inherit;
  font-size: var(--ds-text-sm);
  line-height: 1;
  cursor: pointer;
  box-shadow: var(--ds-shadow-soft);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition:
    color var(--ds-transition-base),
    transform var(--ds-transition-fast),
    box-shadow var(--ds-transition-base),
    border-color var(--ds-transition-base),
    background-color var(--ds-transition-base),
    opacity var(--ds-transition-base);
}

.tc-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.tc-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.tc-btn-ghost {
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(0, 0, 0, 0.5);
  color: var(--ds-color-text);
}

.tc-btn-ghost:hover:not(:disabled) {
  border-color: rgba(0, 247, 255, 0.58);
  box-shadow:
    var(--ds-shadow-soft),
    0 0 16px rgba(0, 247, 255, 0.2);
}

@media (max-width: 480px) {
  .tc-btn {
    width: 100%;
    justify-content: center;
  }
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
