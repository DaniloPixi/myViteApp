<template>
  <!-- Uses global animated overlay from calendar + custom capsule styling -->
  <div class="modal-overlay tc-modal-overlay" @click.self="emitClose">
    <div class="modal-content tc-modal">

      <div class="tc-modal-header">
        <div class="tc-modal-label">
          <span class="tc-modal-label-dot"></span>
          Time capsule
        </div>
        <h2 class="tc-modal-title">
          {{ capsule.title || 'Untitled capsule' }}
        </h2>
        <p class="tc-modal-subtitle">
          {{ isMine ? 'From you' : 'From your love' }}
          <span v-if="recipientLabel">
            · To {{ recipientLabel }}
          </span>
        </p>
      </div>

      <!-- MESSAGE -->
      <div class="tc-read-message-wrap">
        <p class="tc-read-message">
          {{ capsule.message || 'No message text.' }}
        </p>
      </div>

      <!-- MEDIA GALLERY (NEW) -->
      <div
        v-if="capsule.photos && capsule.photos.length"
        class="tc-read-media"
      >
        <div
          v-for="(media, idx) in capsule.photos"
          :key="idx"
          class="tc-read-media-item"
        >
          <img
            v-if="media.resource_type === 'image' || !media.resource_type"
            :src="media.url"
            :class="{ 'tc-read-media-blur': media.isAdult }"
          />
          <video
            v-else-if="media.resource_type === 'video'"
            :src="media.url"
            muted
            loop
            playsinline
            class="tc-read-media-video"
          ></video>

          <span
            v-if="media.isAdult"
            class="tc-read-media-badge"
          >
            18+
          </span>
        </div>
      </div>

      <!-- META -->
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
      <div class="tc-modal-footer">
        <div class="tc-modal-footer-left">
          <p class="tc-footer-note">
            <span class="tc-footer-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                     2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81
                     14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.65
                     11.54l-1.25 1.31z"
                  fill="none"
                  stroke="magenta"
                  stroke-width="0.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <span class="tc-footer-text">
              Saved in your shared galaxy of memories.
            </span>
          </p>
        </div>
        <div class="tc-modal-footer-right">
          <button class="tc-btn tc-btn-ghost" @click="emitClose">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  capsule: { type: Object, required: true },
  isMine: { type: Boolean, default: false },
  recipientLabel: { type: String, default: '' },
  partnerName: { type: String, default: 'partner' },
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

// still available if you want it later
const fromLabel = computed(() => (props.isMine ? 'You' : props.partnerName));
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

.tc-modal-overlay {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at 10% 0%, rgba(0, 255, 255, 0.18), transparent 55%),
    radial-gradient(circle at 90% 100%, rgba(255, 0, 255, 0.22), transparent 55%),
    rgba(0, 0, 0, 0.84);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2600;
}

/* This sits on top of .modal-content animation from the calendar CSS */
.tc-modal {
  position: relative;
  width: min(70vw, 640px);
  max-width: 640px;
  border-radius: 20px;
  border: 1px solid rgba(255, 0, 255, 0.7);
  background:
    radial-gradient(circle at 15% 0%, rgba(0, 255, 255, 0.18), transparent 60%),
    radial-gradient(circle at 85% 100%, rgba(255, 0, 255, 0.2), transparent 65%),
    rgba(0, 0, 0, 0.9); /* ~90% opaque, more transparency than before */
  box-shadow:
    0 0 22px rgba(255, 0, 255, 0.55),
    0 0 34px rgba(0, 255, 255, 0.45);
  padding: 1.6rem 1.7rem 1.2rem;
  color: #f5f5ff;
  overflow: hidden;

  /* subtle continuous glow between magenta and cyan */
  animation: modal-glow 6s ease-in-out infinite alternate;
}

@keyframes modal-glow {
  0% {
    box-shadow:
      0 0 30px rgba(255, 0, 255, 0.85),
      0 0 44px rgba(0, 255, 255, 0.35);
  }
  10% {
    box-shadow:
      0 0 36px rgba(255, 0, 255, 0.82),
      0 0 52px rgba(0, 255, 255, 0.4);
  }
  20% {
    box-shadow:
      0 0 42px rgba(255, 0, 255, 0.78),
      0 0 60px rgba(0, 255, 255, 0.45);
  }
  30% {
    box-shadow:
      0 0 48px rgba(255, 0, 255, 0.72),
      0 0 70px rgba(0, 255, 255, 0.5);
  }
  40% {
    box-shadow:
      0 0 54px rgba(220, 0, 255, 0.7),
      0 0 80px rgba(0, 240, 255, 0.55);
  }
  50% {
    box-shadow:
      0 0 60px rgba(0, 255, 255, 0.85),
      0 0 90px rgba(255, 0, 255, 0.55);
  }
  60% {
    box-shadow:
      0 0 56px rgba(0, 245, 255, 0.8),
      0 0 82px rgba(255, 0, 255, 0.6);
  }
  70% {
    box-shadow:
      0 0 52px rgba(80, 0, 255, 0.78),
      0 0 76px rgba(0, 255, 255, 0.6);
  }
  80% {
    box-shadow:
      0 0 48px rgba(180, 0, 255, 0.8),
      0 0 68px rgba(0, 230, 255, 0.55);
  }
  90% {
    box-shadow:
      0 0 42px rgba(230, 0, 255, 0.82),
      0 0 58px rgba(0, 210, 255, 0.5);
  }
  100% {
    box-shadow:
      0 0 36px rgba(255, 0, 255, 0.85),
      0 0 50px rgba(0, 255, 255, 0.45);
  }
}

/* Header */

.tc-modal-header {
  margin-bottom: 1.1rem;
  text-align: center;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
}

.tc-modal-header::after {
  content: "";
  position: absolute;
  left: 1%;
  right: 1%;
  bottom: 0;
  height: 1px;
  background:
    linear-gradient(
      90deg,
      transparent,
      rgba(255, 0, 255, 0.9),
      rgba(0, 255, 255, 0.9),
      transparent
    );
  opacity: 1;
}

.tc-modal-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.9;
  color: turquoise; /* cyan-ish project color */
}

.tc-modal-label-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: radial-gradient(circle, magenta, transparent);
  box-shadow: 0 0 8px rgba(255, 0, 255, 0.9);
}

.tc-modal-title {
  margin: 0.3rem 0 0.25rem;
  font-size: 2.4rem;
  font-weight: 500;
  font-family: 'Great Vibes', cursive;
  text-shadow:
    0 0 14px rgba(255, 0, 255, 0.95),
    0 0 22px rgba(0, 255, 255, 0.9),
    0 0 30px rgba(255, 255, 255, 0.45);
}

.tc-modal-subtitle {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.85;
}

/* Message */

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

  animation: message-border-glow 4.5s ease-in-out infinite alternate;
}

/* animated magenta-cyan glow */
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
  padding:0;
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
}

/* MEDIA GALLERY (NEW) */

.tc-read-media {
  margin-top: 0.8rem;
  margin-bottom: 0.4rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.45rem;
}

.tc-read-media-item {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.9);
  box-shadow:
    0 0 10px rgba(255, 0, 255, 0.45),
    0 0 16px rgba(0, 255, 255, 0.45);
}

.tc-read-media-item img,
.tc-read-media-video {
  display: block;
  width: 100%;
  height: 80px;
  object-fit: cover;
}

.tc-read-media-blur {
  filter: blur(8px);
}

.tc-read-media-badge {
  position: absolute;
  right: 4px;
  bottom: 4px;
  font-size: 0.65rem;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.85);
  color: #ffffff;
}

/* meta info – cyan on a high-contrast pill */

.tc-read-meta {
  margin-top: 0.9rem;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(0, 255, 255, 0.55);
  color: #7ef7ff;
  align-self: center;
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

/* Footer */

.tc-modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.tc-modal-footer-left {
  font-size: 0.78rem;
}

.tc-footer-note {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.tc-footer-icon svg {
  width: 18px;
  height: 18px;
  
  filter: drop-shadow(0 0 6px rgba(255, 0, 255, 0.7));
}

.tc-footer-text {
  font-family: 'Great Vibes', cursive;
  font-size: 1.2rem;
  color: cyan;
  text-shadow:
    0 0 8px rgba(0, 255, 255, 0.7),
    0 0 14px rgba(255, 0, 255, 0.6);
}

.tc-modal-footer-right {
  display: flex;
  gap: 0.5rem;
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

/* Responsive */

@media (max-width: 700px) {
  .tc-modal {
    padding: 1.3rem 1.1rem 0.9rem;
  }

  .tc-modal-title {
    font-size: 2rem;
  }

  .tc-read-message-wrap {
    max-height: 220px;
  }

  .tc-read-media {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  }

  .tc-read-media-item img,
  .tc-read-media-video {
    height: 70px;
  }

  .tc-modal-footer {
    flex-direction: column-reverse;
    align-items: flex-end;
  }

  .tc-modal-footer-left {
    align-self: flex-start;
  }
}
</style>
