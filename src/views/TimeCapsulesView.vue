<template>
    <div class="tc-view">
      <header class="tc-header">
        <div>
          <h1 class="tc-title">Time Capsules</h1>
          <p class="tc-subtitle">
            Messages for future hearts. Locked until their time.
          </p>
        </div>
  
        <button class="tc-new-btn" @click="openCreate">
          New time capsule ✨
        </button>
      </header>
  
      <div v-if="loading" class="tc-status">Loading capsules...</div>
      <div v-else-if="error" class="tc-status tc-status-error">
        Failed to load time capsules.
      </div>
  
      <div v-else class="tc-list">
  <div v-if="displayCapsules.length === 0" class="tc-empty">
    No time capsules yet.<br />
    Create one and drop it into the future.
  </div>

  <div
    v-for="capsule in displayCapsules"
    :key="capsule.id"
    class="tc-card"
    :class="[
      isMine(capsule) ? 'tc-card-mine' : 'tc-card-theirs',
      isLocked(capsule) ? 'tc-card-locked' : 'tc-card-unlocked',
    ]"
  >
    ...
  </div>
</div>
  
     <!-- Time Capsule Editor Modal -->
<!-- Time Capsule Editor Modal -->
<div v-if="showEditor" class="tc-modal-overlay" @click.self="closeEditor">
  <div class="tc-modal tc-modal-animated">
    <button class="tc-modal-close" @click="closeEditor">×</button>

    <div class="tc-modal-header">
      <div class="tc-modal-label">
        <span class="tc-modal-label-dot"></span>
        Time capsule
      </div>
      <h2 class="tc-modal-title">
        {{ editingId ? 'Edit your capsule' : 'Drop a new capsule into time' }}
      </h2>
      <p class="tc-modal-subtitle">
        Choose who it’s for, when it unlocks, and what future hearts will read.
      </p>
    </div>

    <div class="tc-modal-grid">
      <!-- LEFT: meta (recipient + unlock time) -->
      <div class="tc-modal-column tc-modal-column-meta">
        <label class="tc-field">
          <span class="tc-field-label">Recipient</span>
          <div class="tc-recipient-options">
            <label class="tc-recipient-pill">
              <input
                type="radio"
                value="partner"
                v-model="formRecipient"
              />
              <span class="pill-main">To {{ PARTNER_NAME || 'partner' }}</span>
              <span class="pill-sub">They’ll get a notification when it unlocks.</span>
            </label>

            <label class="tc-recipient-pill">
              <input
                type="radio"
                value="me"
                v-model="formRecipient"
              />
              <span class="pill-main">To yourself</span>
              <span class="pill-sub">A message from past you, for future you.</span>
            </label>
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
          💌 Capsules can be edited by the creator until they unlock.
        </p>
      </div>
      <div class="tc-modal-footer-right">
        <button class="tc-btn tc-btn-ghost" @click="closeEditor">
          Cancel
        </button>
        <button
          class="tc-btn tc-btn-primary"
          :disabled="saving || !formUnlockAt"
          @click="saveCapsule"
        >
          <span v-if="saving">Saving...</span>
          <span v-else>
            {{ editingId ? 'Save changes' : 'Create capsule' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</div>


    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue';
  import { auth } from '../firebase';
  import {
    useTimeCapsules,
    createTimeCapsule,
    updateTimeCapsule,
    openTimeCapsule,
  } from '../composables/useTimeCapsules';
  
  // TODO: plug in real values
  const props = defineProps({
  dateFilter: {
    type: String,
    default: '',
  },
});
  const PARTNER_UID = 'PUT_PARTNER_UID_HERE';
  const PARTNER_NAME = 'Her name';
  
  const currentUser = computed(() => auth.currentUser);
  const currentUid = computed(() => currentUser.value?.uid || null);
  
  const {
    sortedCapsules,
    loading,
    error,
    fetchTimeCapsules,
    isLocked,
    isOpened,
  } = useTimeCapsules();
  
  const displayCapsules = computed(() => {
  let list = sortedCapsules.value || [];

  if (props.dateFilter) {
    const target = new Date(props.dateFilter);
    if (!Number.isNaN(target.getTime())) {
      const ty = target.getFullYear();
      const tm = target.getMonth();
      const td = target.getDate();

      list = list.filter((capsule) => {
        const raw = capsule.unlockAt || capsule.createdAt;
        if (!raw) return false;

        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return false;

        return (
          d.getFullYear() === ty &&
          d.getMonth() === tm &&
          d.getDate() === td
        );
      });
    }
  }

  return list;
});

  const showEditor = ref(false);
  const editingId = ref(null);
  const formTitle = ref('');
  const formMessage = ref('');
  const formUnlockAt = ref('');
  const formRecipient = ref('partner');
  const saving = ref(false);
  
  function isMine(capsule) {
    if (!capsule || !currentUid.value) return false;
    return capsule.fromUid === currentUid.value;
  }
  
  function isSelfCapsule(capsule) {
    if (!capsule || !currentUid.value) return false;
    return capsule.fromUid === currentUid.value && capsule.toUid === currentUid.value;
  }
  
  function recipientLabel(capsule) {
    if (!capsule) return '';
    if (isSelfCapsule(capsule)) return 'yourself';
    if (capsule.toUid === PARTNER_UID) return PARTNER_NAME || 'partner';
    if (capsule.toUid === currentUid.value) return 'you';
    return 'someone';
  }
  
  function canEdit(capsule) {
    if (!capsule) return false;
    if (!isMine(capsule)) return false;
    if (isOpened(capsule)) return false;
    if (!capsule.unlockAt) return false;
    const unlockTime = new Date(capsule.unlockAt).getTime();
    return unlockTime > Date.now();
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
  
  function formatUnlock(raw) {
    if (!raw) return 'Unknown';
    return formatDate(raw);
  }
  
  function resetForm() {
    editingId.value = null;
    formTitle.value = '';
    formMessage.value = '';
    formUnlockAt.value = '';
    formRecipient.value = 'partner';
  }
  
  function openCreate() {
    resetForm();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const local = new Date(
      tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
  
    formUnlockAt.value = local;
    showEditor.value = true;
  }
  
  function openEdit(capsule) {
    if (!capsule) return;
    editingId.value = capsule.id || null;
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
      }
    }
  
    if (capsule.toUid === currentUid.value) {
      formRecipient.value = 'me';
    } else {
      formRecipient.value = 'partner';
    }
  
    showEditor.value = true;
  }
  
  function closeEditor() {
    showEditor.value = false;
  }
  
  async function saveCapsule() {
    if (!currentUid.value) {
      alert('You must be logged in to create a time capsule.');
      return;
    }
    if (!formUnlockAt.value) return;
  
    const unlockAtLocal = new Date(formUnlockAt.value);
    if (Number.isNaN(unlockAtLocal.getTime())) {
      alert('Invalid unlock date/time');
      return;
    }
    const unlockAtIso = unlockAtLocal.toISOString();
  
    let toUid;
    if (formRecipient.value === 'me') {
      toUid = currentUid.value;
    } else {
      toUid = PARTNER_UID || currentUid.value;
    }
  
    saving.value = true;
    try {
      if (!editingId.value) {
        await createTimeCapsule({
          toUid,
          unlockAt: unlockAtIso,
          title: formTitle.value,
          message: formMessage.value,
        });
      } else {
        await updateTimeCapsule(editingId.value, {
          title: formTitle.value,
          message: formMessage.value,
          unlockAt: unlockAtIso,
        });
      }
  
      await fetchTimeCapsules();
      closeEditor();
    } catch (e) {
      console.warn('[TimeCapsulesView] saveCapsule failed:', e);
      alert('Failed to save time capsule.');
    } finally {
      saving.value = false;
    }
  }
  
  async function handleOpen(capsule) {
    if (!capsule) return;
    if (isLocked(capsule)) return;
    try {
      await openTimeCapsule(capsule.id);
      await fetchTimeCapsules();
    } catch (e) {
      console.warn('[TimeCapsulesView] handleOpen failed:', e);
      alert('Failed to open time capsule.');
    }
  }
  </script>
  
  <style scoped>
  /* same styles you had in App.vue */
  .tc-view {
    padding: 1.5rem;
    max-width: 900px;
    margin: 0 auto;
    color: #f5f5ff;
  }
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
  z-index: 2500;
}

.tc-modal {
  position: relative;
  width: 96%;
  max-width: 720px;
  border-radius: 18px;
  border: 1px solid rgba(255, 0, 255, 0.6);
  background: radial-gradient(circle at 10% 0%, rgba(0, 255, 255, 0.18), transparent 60%),
              radial-gradient(circle at 90% 100%, rgba(255, 0, 255, 0.18), transparent 60%),
              rgba(0, 0, 0, 0.92);
  box-shadow:
    0 0 28px rgba(255, 0, 255, 0.55),
    0 0 32px rgba(0, 255, 255, 0.45);
  padding: 1.3rem 1.4rem 1.1rem;
  color: #f5f5ff;
  overflow: hidden;
}

.tc-modal-animated {
  animation: tc-modal-pop 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.2);
}

@keyframes tc-modal-pop {
  0% {
    transform: scale(0.85) translateY(12px);
    opacity: 0;
    box-shadow:
      0 0 0 rgba(255, 0, 255, 0),
      0 0 0 rgba(0, 255, 255, 0);
  }
  60% {
    transform: scale(1.03) translateY(0);
    opacity: 1;
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
  margin: 0.25rem 0 0.2rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.tc-modal-subtitle {
  margin: 0;
  font-size: 0.82rem;
  opacity: 0.8;
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
  background: radial-gradient(circle at 0% 0%, rgba(255, 0, 255, 0.18), transparent 60%),
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

/* Reuse your button styles, but ensure they look good here */
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
  