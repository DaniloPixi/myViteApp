<template>
  <div class="modal-overlay ds-modal-overlay" @click.self="onClose">
    <div
  class="modal-content tc-modal-shell ds-modal-surface"
  role="dialog"
  :aria-labelledby="titleId || undefined"
  aria-modal="true"
>
      <!-- Close icon -->
      <button
        v-if="showCloseIcon"
        type="button"
        class="tc-modal-close"
        @click="onClose"
      >
        ×
      </button>

      <!-- HEADER -->
      <header class="tc-modal-header">
        <div v-if="$slots.label" class="tc-modal-label ds-label ds-label--meta">
  <slot name="label" />
</div>

        <h2
          v-if="$slots.title"
          :id="titleId || null"
          class="tc-modal-title ds-modal-title"
        >
          <slot name="title" />
        </h2>

        <p v-if="$slots.subtitle" class="tc-modal-subtitle">
          <slot name="subtitle" />
        </p>
      </header>

      <!-- BODY -->
      <div class="tc-modal-body">
        <slot />
      </div>

      <!-- FOOTER -->
      <footer class="tc-modal-footer">
        <div class="tc-modal-footer-left">
          <slot name="footer-text" />
        </div>
        <div class="tc-modal-footer-right">
          <slot name="footer-right" />
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  titleId: {
    type: String,
    default: 'tc-modal-title',
  },
  showCloseIcon: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['close']);

function onClose() {
  emit('close');
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

/* Overlay */
/*
  Shell = actual panel.
  Uses class "modal-content" so your global warp animation still hits it.
*/
.tc-modal-shell {
  position: relative;
}


@keyframes tc-modal-glow {
  0%, 100% {
    border-color: rgba(255, 0, 255, 0.32);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.4),
      inset 0 0 10px rgba(255, 0, 255, 0.5),
      -60px 0 80px -40px rgba(255, 0, 255, 0.5),
      60px 0 80px -40px rgba(0, 255, 255, 0.5);
  }
  50% {
    border-color: rgba(0, 255, 255, 0.45);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.4),
      inset 0 0 10px rgba(0, 255, 255, 0.5),
      -70px 0 100px -45px rgba(0, 255, 255, 0.7),
      70px 0 100px -45px rgba(255, 0, 255, 0.7);
  }
}

/* Close button */
.tc-modal-close {
  position: absolute;
  top: 0.45rem;
  right: 0.7rem;
  border: none;
  background: transparent;
  color: #7ef7ff;
  font-size: 1.6rem;
  cursor: pointer;
  padding: 0.1rem 0.35rem;
  line-height: 1;
  border-radius: 999px;
  transition: color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
}

.tc-modal-close:hover {
  color: #ff4fe9;
  box-shadow: 0 0 15px rgba(255, 0, 255, 0.8);
  transform: translateY(-1px);
}

/* HEADER */

.tc-modal-header {
  text-align: center;
  padding-bottom: 1rem;
  margin-bottom: 0.4rem;
  position: relative;
}

/* Gradient separator under title */
.tc-modal-header::after {
  content: '';
  display: block;
  height: 1px;
  width: 92%;
  margin: 0.6rem auto 0;
  border-radius: 999px;

  /* your smooth fade in/out */
  background: linear-gradient(
    90deg,
    rgba(0, 255, 255, 0) 0%,
    rgba(0, 255, 255, 0.35) 15%,
    rgba(0, 255, 255, 0.7) 30%,
    rgba(255, 0, 255, 0.7) 70%,
    rgba(255, 0, 255, 0.35) 85%,
    rgba(255, 0, 255, 0) 100%
  );

  /* make the gradient wider so we can scroll it */
  background-size: 200% 100%;

  box-shadow:
    0 0 8px rgba(0, 255, 255, 0.5),
    0 0 12px rgba(255, 0, 255, 0.5);

  /* LED strip motion */
  animation: tc-strip-flow 5s linear infinite;
}

@keyframes tc-strip-flow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Small uppercase label above title */
.tc-modal-label {
  margin-bottom: 0.15rem;
}

/* TITLE – Great Vibes, neon magenta, not gold */
.tc-modal-title {
  margin: 0;
  font-size: 2.4rem;
  font-weight: 500;
}

/* Subtitle – you hide this in the form modal with :deep() */
.tc-modal-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: #f2e8ff;
  opacity: 0.9;
}

/* BODY */
.tc-modal-body {
  flex: 1;
  margin-top: 0.1rem;
  padding: 0.1rem 0;
 
}

/* FOOTER */
.tc-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-top: 0.8rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.22);
  font-size: 0.85rem;
  color: #e2e2ff;
  opacity: 0.9;
}

.tc-modal-footer-left {
  flex: 1;
  min-width: 0;
}

.tc-modal-footer-right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

/* Responsive */
@media (max-width: 700px) {
  .tc-modal-shell {
    /* give it some breathing room so the glow is visible */
    width: 75vw;
    max-width: 420px;
    padding: 1.4rem 1.2rem 0.9rem;
    border-radius: 16px;
  }

  .tc-modal-title {
    font-size: 2rem;
  }

  .tc-modal-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .tc-modal-footer-right {
    justify-content: flex-end;
  }
}

</style>
