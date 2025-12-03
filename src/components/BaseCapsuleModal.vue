<template>
    <div class="tc-modal-overlay" @click.self="onClose">
      <div
        class="tc-modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        ref="modalRef"
        @keydown.esc="onClose"
      >
        <button
          v-if="showCloseIcon"
          class="tc-modal-close"
          @click="onClose"
        >
          ×
        </button>
  
        <header class="tc-modal-header">
          <div class="tc-modal-label">
            <span class="tc-modal-label-dot"></span>
            <slot name="label">Time capsule</slot>
          </div>
          <h2 :id="titleId" class="tc-modal-title">
            <slot name="title" />
          </h2>
          <p class="tc-modal-subtitle">
            <slot name="subtitle" />
          </p>
        </header>
  
        <section class="tc-modal-body">
          <slot />
        </section>
  
        <footer class="tc-modal-footer">
          <div class="tc-modal-footer-left">
            <p v-if="$slots['footer-text']" class="tc-footer-note">
              <span class="tc-footer-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
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
                <slot name="footer-text" />
              </span>
            </p>
          </div>
          <div class="tc-modal-footer-right">
            <slot name="footer-right" />
          </div>
        </footer>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  
  const props = defineProps({
    titleId: { type: String, default: 'tc-modal-title' },
    showCloseIcon: { type: Boolean, default: false },
  });
  
  const emit = defineEmits(['close']);
  
  const modalRef = ref(null);
  
  onMounted(() => {
    if (modalRef.value) {
      modalRef.value.focus();
    }
  });
  
  function onClose() {
    emit('close');
  }
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
  
  /* Shell */
  
  .tc-modal {
    position: relative;
    width: min(70vw, 640px);
    max-width: 640px;
    border-radius: 20px;
    border: 1px solid rgba(255, 0, 255, 0.7);
    background:
      radial-gradient(circle at 15% 0%, rgba(0, 255, 255, 0.18), transparent 60%),
      radial-gradient(circle at 85% 100%, rgba(255, 0, 255, 0.2), transparent 65%),
      rgba(0, 0, 0, 0.9);
    box-shadow:
      0 0 22px rgba(255, 0, 255, 0.55),
      0 0 34px rgba(0, 255, 255, 0.45);
    padding: 1.4rem 1.5rem 1.1rem;
    color: #f5f5ff;
    overflow: hidden;
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
    margin-bottom: 0.9rem;
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
    color: turquoise;
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
    font-size: 2.2rem;
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
  
  /* Close icon */
  
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
  
  /* Body */
  
  .tc-modal-body {
    margin-top: 0.6rem;
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
  
  .tc-modal-footer-right {
    display: flex;
    gap: 0.5rem;
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
    fill: none;
    stroke: magenta;
    stroke-width: 0.9;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.95;
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
  
  /* Responsive */
  
  @media (max-width: 700px) {
    .tc-modal {
      padding: 1.1rem 1rem 0.9rem;
    }
  
    .tc-modal-title {
      font-size: 2rem;
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
  