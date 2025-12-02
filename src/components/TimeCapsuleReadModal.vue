<template>
  <!-- Uses global animated overlay from calendar + custom capsule styling -->
  <div class="modal-overlay tc-modal-overlay" @click.self="emitClose">
    <div class="modal-content tc-modal">
      <button class="tc-modal-close" @click="emitClose">×</button>

      <div class="tc-modal-header">
        <div class="tc-modal-label">
          <span class="tc-modal-label-dot"></span>
          Time capsule
        </div>
        <h2 class="tc-modal-title">
          {{ capsule.title || 'Untitled capsule' }}
        </h2>
        <p class="tc-modal-subtitle">
          {{ isMine ? 'From you' : 'From your partner' }}
          <span v-if="recipientLabel">
            · To {{ recipientLabel }}
          </span>
        </p>
      </div>

      <div class="tc-read-message-wrap">
        <p class="tc-read-message">
          {{ capsule.message || 'No message text.' }}
        </p>
      </div>

      <div class="tc-read-meta">
        <p v-if="capsule.createdAt" class="tc-meta-line">
          <span class="tc-meta-label">Written</span>
          <span class="tc-meta-value">{{ formatDate(capsule.createdAt) }}</span>
        </p>
        <p v-if="capsule.unlockAt" class="tc-meta-line tc-meta-unlock">
          <span class="tc-meta-label">Unlocks</span>
          <span class="tc-meta-value">{{ formatDate(capsule.unlockAt) }}</span>
        </p>
        <p v-if="capsule.openedAt" class="tc-meta-line tc-meta-opened">
          <span class="tc-meta-label">Opened</span>
          <span class="tc-meta-value">{{ formatDate(capsule.openedAt) }}</span>
        </p>
      </div>

      <div class="tc-modal-footer">
        <div class="tc-modal-footer-left">
          <p class="tc-footer-note">
            💌 Saved in your shared galaxy of memories.
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

// still here if you want it for future tweaks
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
    rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2600;
}

/* This sits on top of .modal-content from the calendar CSS */
.tc-modal {
  position: relative;
  width: 96%;
  max-width: 640px;
  border-radius: 20px;
  border: 1px solid rgba(255, 0, 255, 0.7);
  background:
    radial-gradient(circle at 15% 0%, rgba(0, 255, 255, 0.18), transparent 60%),
    radial-gradient(circle at 85% 100%, rgba(255, 0, 255, 0.2), transparent 65%),
    rgba(0, 0, 0, 0.94);
  box-shadow:
    0 0 28px rgba(255, 0, 255, 0.55),
    0 0 40px rgba(0, 255, 255, 0.45);
  padding: 1.6rem 1.7rem 1.2rem;
  color: #f5f5ff;
  overflow: hidden;
}

/* X button */
.tc-modal-close {
  position: absolute;
  top: -0.7rem;
  right: -0.9rem;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid cyan;
  background: rgba(0, 0, 0, 0.9);
  color: cyan;
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.tc-modal-close:hover {
  transform: scale(1.05);
  border-color: magenta;
  box-shadow: 0 0 16px rgba(255, 0, 255, 0.7);
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
  left: 25%;
  right: 25%;
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
  opacity: 0.7;
}

.tc-modal-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.8;
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
  font-size: 2.3rem;
  font-weight: 500;
  font-family: 'Great Vibes', cursive;
  text-shadow:
    0 0 10px rgba(255, 0, 255, 0.9),
    0 0 16px rgba(0, 255, 255, 0.7);
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
  padding: 1rem 1.1rem;
  border-radius: 16px;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.08), transparent 65%),
    rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.18);
  max-height: 260px;
  overflow-y: auto;
  box-shadow:
    inset 0 0 14px rgba(0, 0, 0, 0.8),
    0 0 16px rgba(0, 255, 255, 0.25);
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
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent);
}

.tc-read-message-wrap::after {
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
}

.tc-read-message {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.6;
  font-family: 'Great Vibes', cursive;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: #ffe4ff;
  text-shadow: 0 0 6px rgba(255, 0, 255, 0.25);
}

/* meta info */

.tc-read-meta {
  margin-top: 0.85rem;
  font-size: 0.78rem;
  text-align: center;
  opacity: 0.9;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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
  opacity: 0.75;
}

.tc-meta-value {
  font-size: 0.8rem;
  color: #f5f5ff;
}

.tc-meta-unlock .tc-meta-value {
  color: #ffdf7f;
}

.tc-meta-opened .tc-meta-value {
  color: #7ef7ff;
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
  opacity: 0.85;
}

.tc-footer-note {
  margin: 0;
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

  .tc-modal-footer {
    flex-direction: column-reverse;
    align-items: flex-end;
  }

  .tc-modal-footer-left {
    align-self: flex-start;
  }
}
</style>
