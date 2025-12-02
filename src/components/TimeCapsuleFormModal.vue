<template>
  <div class="modal-overlay tc-modal-overlay" @click.self="emitClose">
    <div class="modal-content tc-modal">
      <button class="tc-modal-close" @click="emitClose">×</button>

      <div class="tc-modal-header">
        <div class="tc-modal-label">
          <span class="tc-modal-label-dot"></span>
          Time capsule
        </div>
        <h2 class="tc-modal-title">
          {{ modalTitle }}
        </h2>
        <p class="tc-modal-subtitle">
          {{ modalSubtitle }}
        </p>
      </div>

      <div class="tc-modal-grid">
        <!-- LEFT: meta (recipient + unlock time) -->
        <div class="tc-modal-column tc-modal-column-meta">
          <label class="tc-field">
            <span class="tc-field-label">Recipient</span>

            <!-- Creation: let user choose -->
            <div
              class="tc-recipient-options"
              v-if="!capsule"
            >
              <label class="tc-recipient-pill">
                <input
                  type="radio"
                  value="partner"
                  v-model="formRecipient"
                />
                <span class="pill-main">
                  To {{ partnerName || 'partner' }}
                </span>
                <span class="pill-sub">
                  They’ll get a notification when it unlocks.
                </span>
              </label>

              <label class="tc-recipient-pill">
                <input
                  type="radio"
                  value="me"
                  v-model="formRecipient"
                />
                <span class="pill-main">To yourself</span>
                <span class="pill-sub">
                  A message from past you, for future you.
                </span>
              </label>
            </div>

            <!-- Editing: recipient fixed -->
            <div v-else class="tc-recipient-fixed">
              <p class="tc-recipient-fixed-label">
                {{ recipientSummary }}
              </p>
              <p class="tc-field-hint">
                Recipient can’t be changed after creation.
              </p>
            </div>
          </label>

          <label class="tc-field">
            <span class="tc-field-label">Unlock date &amp; time</span>
            <input
              v-model="formUnlockAt"
              type="datetime-local"
              class="tc-input tc-input-unlock"
            />
            <p class="tc-field-hint" v-if="formUnlockAt">
              This capsule will stay locked until
              <span class="tc-hint-highlight">{{ formUnlockAt }}</span>
              (your local time).
            </p>
            <p class="tc-field-hint" v-else>
              Pick a date in the future. No spoilers before then.
            </p>
          </label>
        </div>

        <!-- RIGHT: title + message -->
        <div class="tc-modal-column tc-modal-column-message">
          <label class="tc-field">
            <span class="tc-field-label">Title (optional)</span>
            <input
              v-model="formTitle"
              type="text"
              class="tc-input"
              placeholder="e.g. For the day you forget how loved you are"
            />
          </label>

          <label class="tc-field">
            <span class="tc-field-label">Message</span>
            <textarea
              v-model="formMessage"
              class="tc-textarea tc-textarea-message"
              rows="6"
              placeholder="Write like they can’t open it until exactly when they’ll need it most."
            ></textarea>
          </label>
        </div>
      </div>

      <div class="tc-modal-footer">
        <div class="tc-modal-footer-left">
          <p class="tc-footer-note">
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
              Capsules can be edited until they unlock.
            </span>
          </p>
        </div>
        <div class="tc-modal-footer-right">
          <button class="tc-btn tc-btn-ghost" @click="emitClose">
            Cancel
          </button>
          <button
            class="tc-btn tc-btn-primary"
            :disabled="isSubmitting || !formUnlockAt"
            @click="submitForm"
          >
            <span v-if="isSubmitting">Saving...</span>
            <span v-else>
              {{ capsule ? 'Save changes' : 'Create capsule' }}
            </span>
          </button>
        </div>
      </div>

      <p v-if="submitError" class="tc-error">
        {{ submitError }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  capsule: { type: Object, default: null },
  partnerName: { type: String, default: 'partner' },
  isSubmitting: { type: Boolean, default: false },
  submitError: { type: String, default: '' },
});

const emit = defineEmits(['save', 'close']);

const formTitle = ref('');
const formMessage = ref('');
const formUnlockAt = ref('');
const formRecipient = ref('partner'); // 'partner' | 'me'

// title/subtitle depend on create vs edit
const modalTitle = computed(() =>
  props.capsule ? 'Edit your capsule' : 'Drop a new capsule into time'
);

const modalSubtitle = computed(() =>
  props.capsule
    ? 'Update the words or timing. The recipient stays the same.'
    : 'Choose who it’s for, when it unlocks, and what future hearts will read.'
);

// Recipient summary for editing (no auth needed, just from/to comparison)
const recipientSummary = computed(() => {
  const c = props.capsule;
  if (!c) return '';
  if (!c.toUid || !c.fromUid) return 'Recipient was set when this capsule was created.';
  if (c.toUid === c.fromUid) return 'To your future self.';
  return 'To your partner.';
});

// Initialize / update form when capsule prop changes
watch(
  () => props.capsule,
  (capsule) => {
    if (capsule) {
      formTitle.value = capsule.title || '';
      formMessage.value = capsule.message || '';

      if (capsule.unlockAt) {
        const d = new Date(capsule.unlockAt);
        if (!Number.isNaN(d.getTime())) {
          const local = new Date(
            d.getTime() - d.getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16);
          formUnlockAt.value = local;
        } else {
          formUnlockAt.value = '';
        }
      } else {
        formUnlockAt.value = '';
      }

      // Recipient not editable on edit; keep default, used only on create.
    } else {
      // Creating a new capsule: reset fields & prefill unlockAt to "tomorrow"
      formTitle.value = '';
      formMessage.value = '';

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const local = new Date(
        tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);

      formUnlockAt.value = local;
      formRecipient.value = 'partner';
    }
  },
  { immediate: true },
);

const isSubmitting = computed(() => props.isSubmitting);
const submitError = computed(() => props.submitError);

function emitClose() {
  emit('close');
}

function submitForm() {
  emit('save', {
    title: formTitle.value,
    message: formMessage.value,
    unlockAtLocal: formUnlockAt.value,
    recipient: formRecipient.value, // used only on create
  });
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
  z-index: 2500;
}

/* Same glowing shell as read modal, just a bit wider */
.tc-modal {
  position: relative;
  width: min(70vw, 640px);
  max-width: 640px;
  border-radius: 20px;
  border: 1px solid rgba(255, 0, 255, 0.7);
  background:
    radial-gradient(circle at 15% 0%, rgba(0, 255, 255, 0.18), transparent 60%),
    radial-gradient(circle at 85% 100%, rgba(255, 0, 255, 0.2), transparent 65%),
    rgba(0, 0, 0, 0.9); /* ~90% opaque */
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

/* Header: match read modal */

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

/* Grid layout inside modal */

.tc-modal-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
  gap: 1rem;
  margin-top: 0.6rem;
}

.tc-modal-column {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.tc-modal-column-meta {
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding-right: 0.8rem;
}

.tc-modal-column-message {
  padding-left: 0.1rem;
}

/* Fields */

.tc-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tc-field-label {
  font-size: 0.8rem;
  opacity: 0.85;
}

.tc-input,
.tc-textarea {
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.85);
  color: #f5f5ff;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  outline: none;
}

.tc-input:focus,
.tc-textarea:focus {
  border-color: cyan;
  box-shadow: 0 0 7px rgba(0, 255, 255, 0.7);
}

.tc-input-unlock {
  font-family: inherit;
}

.tc-textarea-message {
  min-height: 140px;
  resize: vertical;
}

/* Recipient pills */

.tc-recipient-options {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.tc-recipient-pill {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.35rem 0.55rem 0.35rem 1.8rem;
  border-radius: 10px;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 0, 255, 0.18), transparent 60%),
    rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  font-size: 0.8rem;
}

.tc-recipient-pill input[type='radio'] {
  position: absolute;
  left: 0.5rem;
  top: 0.6rem;
  width: 12px;
  height: 12px;
  accent-color: magenta;
}

.tc-recipient-pill .pill-main {
  font-weight: 500;
}

.tc-recipient-pill .pill-sub {
  opacity: 0.75;
  font-size: 0.75rem;
}

.tc-recipient-fixed-label {
  font-size: 0.85rem;
  font-weight: 500;
}

/* Hint text */

.tc-field-hint {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  opacity: 0.75;
}

.tc-hint-highlight {
  color: #ffdf7f;
  font-weight: 500;
}

/* Modal footer */

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

.tc-btn-primary {
  border-color: magenta;
  background: rgba(0, 0, 0, 0.7);
  color: magenta;
  box-shadow:
    inset 0 0 6px rgba(255, 0, 255, 0.6),
    0 0 6px rgba(255, 0, 255, 0.5);
}

.tc-btn-primary:hover:not(:disabled) {
  box-shadow:
    inset 0 0 8px rgba(255, 0, 255, 0.9),
    0 0 10px rgba(0, 255, 255, 0.6);
  transform: translateY(-0.5px);
}

.tc-btn:disabled {
  opacity: 0.55;
  cursor: default;
  box-shadow: none;
}

/* Error */

.tc-error {
  margin-top: 0.6rem;
  text-align: center;
  font-size: 0.8rem;
  color: #ff6b6b;
}

/* Responsive tweaks */

@media (max-width: 700px) {
  .tc-modal {
    padding: 1.1rem 1rem 0.9rem;
  }

  .tc-modal-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.8rem;
  }

  .tc-modal-column-meta {
    border-right: none;
    padding-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 0.6rem;
    margin-bottom: 0.4rem;
  }

  .tc-modal-column-message {
    padding-left: 0;
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
