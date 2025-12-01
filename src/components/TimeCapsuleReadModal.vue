<template>
    <div class="tc-modal-overlay" @click.self="emitClose">
      <div class="tc-modal tc-modal-animated">
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
          <p v-if="capsule.createdAt">
            Written {{ formatDate(capsule.createdAt) }}
          </p>
          <p v-if="capsule.unlockAt">
            Unlocks {{ formatDate(capsule.unlockAt) }}
          </p>
          <p v-if="capsule.openedAt">
            Opened {{ formatDate(capsule.openedAt) }}
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
  
  // Just to keep the computed available if you want to reuse it later
  const fromLabel = computed(() => (props.isMine ? 'You' : props.partnerName));
  </script>
  
  <style scoped>
  @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
  
  .tc-modal-overlay {
    position: fixed;
    inset: 0;
    background: radial-gradient(circle at 10% 0%, rgba(0, 255, 255, 0.15), transparent 55%),
                radial-gradient(circle at 90% 100%, rgba(255, 0, 255, 0.18), transparent 55%),
                rgba(0, 0, 0, 0.84);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2600;
  }
  
  .tc-modal {
    position: relative;
    width: 96%;
    max-width: 640px;
    border-radius: 18px;
    border: 1px solid rgba(255, 0, 255, 0.6);
    background: radial-gradient(circle at 10% 0%, rgba(0, 255, 255, 0.18), transparent 60%),
                radial-gradient(circle at 90% 100%, rgba(255, 0, 255, 0.18), transparent 60%),
                rgba(0, 0, 0, 0.92);
    box-shadow:
      0 0 28px rgba(255, 0, 255, 0.55),
      0 0 32px rgba(0, 255, 255, 0.45);
    padding: 1.4rem 1.5rem 1.1rem;
    color: #f5f5ff;
    overflow: hidden;
  }
  
  .tc-modal-animated {
    animation: tc-modal-pop 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.2);
  }
  
  @keyframes tc-modal-pop {
    0% {
      transform: scale(0.9) translateY(8px);
      opacity: 0;
    }
    100% {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }
  
  .tc-modal-close {
    position: absolute;
    top: -0.7rem;
    right: -0.9rem;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid cyan;
    background: rgba(0, 0, 0, 0.9);
    color: cyan;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .tc-modal-header {
    margin-bottom: 0.9rem;
    text-align: center;
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
    margin: 0.25rem 0 0.25rem;
    font-size: 2.2rem;
    font-weight: 500;
    font-family: 'Great Vibes', cursive;
    text-shadow: 0 0 10px magenta;
  }
  
  .tc-modal-subtitle {
    margin: 0;
    font-size: 0.82rem;
    opacity: 0.8;
  }
  
  /* Message */
  
  .tc-read-message-wrap {
    margin-top: 0.8rem;
    padding: 0.9rem 1rem;
    border-radius: 14px;
    background: radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.05), transparent 65%),
                rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.15);
    max-height: 260px;
    overflow-y: auto;
  }
  
  .tc-read-message {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  
  /* Meta info */
  
  .tc-read-meta {
    margin-top: 0.7rem;
    font-size: 0.8rem;
    opacity: 0.85;
    text-align: center;
  }
  
  .tc-read-meta p {
    margin: 0.12rem 0;
  }
  
  /* Footer */
  
  .tc-modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.9rem;
  }
  
  .tc-modal-footer-left {
    font-size: 0.75rem;
    opacity: 0.8;
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
    padding: 0.3rem 0.85rem;
    font-size: 0.8rem;
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    color: #f5f5ff;
    transition: all 0.15s ease;
  }
  
  .tc-btn-ghost {
    border-color: rgba(255, 255, 255, 0.35);
    background: rgba(0, 0, 0, 0.6);
  }
  
  .tc-btn-ghost:hover {
    border-color: rgba(0, 255, 255, 0.8);
    box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  }
  
  /* Responsive */
  
  @media (max-width: 700px) {
    .tc-modal {
      padding: 1.1rem 1rem 0.9rem;
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
  