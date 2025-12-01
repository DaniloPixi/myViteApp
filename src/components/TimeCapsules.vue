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
        <div v-if="sortedCapsules.length === 0" class="tc-empty">
          No time capsules yet.<br />
          Create one and drop it into the future.
        </div>
  
        <div
          v-for="capsule in sortedCapsules"
          :key="capsule.id"
          class="tc-card"
          :class="[
            isMine(capsule) ? 'tc-card-mine' : 'tc-card-theirs',
            isLocked(capsule) ? 'tc-card-locked' : 'tc-card-unlocked',
          ]"
        >
          <div class="tc-card-header">
            <div class="tc-card-title-wrap">
              <h2 class="tc-card-title">
                {{ capsule.title || 'Untitled capsule' }}
              </h2>
              <div class="tc-badges">
                <span
                  class="tc-badge"
                  :class="isMine(capsule) ? 'tc-badge-mine' : 'tc-badge-theirs'"
                >
                  {{ isMine(capsule) ? 'From you' : 'From them' }}
                </span>
                <span v-if="isSelfCapsule(capsule)" class="tc-badge tc-badge-self">
                  To yourself
                </span>
                <span v-else class="tc-badge tc-badge-target">
                  To {{ recipientLabel(capsule) }}
                </span>
              </div>
            </div>
  
            <div class="tc-card-meta">
              <div class="tc-meta-row">
                <span class="tc-meta-label">Unlocks</span>
                <span class="tc-meta-value">
                  {{ formatUnlock(capsule.unlockAt) }}
                </span>
              </div>
  
              <div class="tc-meta-row">
                <span class="tc-meta-label">Status</span>
                <span class="tc-meta-value">
                  <span v-if="isLocked(capsule)">
                    🔒 Locked
                  </span>
                  <span v-else-if="!isOpened(capsule)">
                    ✨ Ready to open
                  </span>
                  <span v-else>
                    💫 Opened
                    <span v-if="capsule.openedAt">
                      ({{ formatDate(capsule.openedAt) }})
                    </span>
                  </span>
                </span>
              </div>
            </div>
          </div>
  
          <div
            class="tc-card-body"
            :class="{ 'tc-body-locked': isLocked(capsule) }"
          >
            <div class="tc-message-wrap">
              <p class="tc-message">
                {{ capsule.message || 'No message text.' }}
              </p>
  
              <div v-if="isLocked(capsule)" class="tc-lock-overlay">
                <span class="tc-lock-icon">🔒</span>
              </div>
            </div>
          </div>
  
          <div class="tc-card-footer">
            <div class="tc-footer-left">
              <small class="tc-created-at">
                Written {{ formatDate(capsule.createdAt) }}
              </small>
            </div>
  
            <div class="tc-footer-right">
              <!-- Edit: only creator, only before unlock, only if not opened -->
              <button
                v-if="canEdit(capsule)"
                class="tc-btn tc-btn-ghost"
                @click="openEdit(capsule)"
              >
                Edit
              </button>
  
              <!-- Open: allowed if unlocked; openTimeCapsule() also notifies creator -->
              <button
                class="tc-btn tc-btn-primary"
                :disabled="isLocked(capsule)"
                @click="handleOpen(capsule)"
              >
                <span v-if="isLocked(capsule)">Locked</span>
                <span v-else-if="isOpened(capsule)">View again</span>
                <span v-else>Open now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
  
      <!-- Simple editor modal -->
      <div v-if="showEditor" class="tc-modal-overlay" @click.self="closeEditor">
        <div class="tc-modal">
          <button class="tc-modal-close" @click="closeEditor">×</button>
  
          <h2 class="tc-modal-title">
            {{ editingId ? 'Edit time capsule' : 'New time capsule' }}
          </h2>
  
          <div class="tc-modal-body">
            <label class="tc-field">
              <span class="tc-field-label">Recipient</span>
              <div class="tc-recipient-options">
                <label class="tc-radio">
                  <input
                    type="radio"
                    value="partner"
                    v-model="formRecipient"
                  />
                  <span>
                    To {{ PARTNER_NAME || 'partner' }}
                  </span>
                </label>
                <label class="tc-radio">
                  <input
                    type="radio"
                    value="me"
                    v-model="formRecipient"
                  />
                  <span>To yourself</span>
                </label>
              </div>
            </label>
  
            <label class="tc-field">
              <span class="tc-field-label">Unlock date &amp; time</span>
              <input
                v-model="formUnlockAt"
                type="datetime-local"
                class="tc-input"
              />
            </label>
  
            <label class="tc-field">
              <span class="tc-field-label">Title (optional)</span>
              <input
                v-model="formTitle"
                type="text"
                class="tc-input"
                placeholder="e.g. For the day you need this"
              />
            </label>
  
            <label class="tc-field">
              <span class="tc-field-label">Message</span>
              <textarea
                v-model="formMessage"
                class="tc-textarea"
                rows="5"
                placeholder="Write something your future selves will be glad to read."
              ></textarea>
            </label>
          </div>
  
          <div class="tc-modal-footer">
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
  
  // 🔧 TEMP: hardcode partner name+uid here for now.
  // Replace these with your real values or hook them to your auth/user store.
  const PARTNER_UID = 'PUT_PARTNER_UID_HERE';
  const PARTNER_NAME = 'Eva';
  
  // --- auth context ---
  const currentUser = computed(() => auth.currentUser);
  const currentUid = computed(() => currentUser.value?.uid || null);
  const currentName = computed(
    () => currentUser.value?.displayName || currentUser.value?.email || 'You',
  );
  
  // --- data from composable ---
  const {
    sortedCapsules,
    loading,
    error,
    fetchTimeCapsules,
    isLocked,
    isOpened,
  } = useTimeCapsules();
  
  // --- editor modal state ---
  const showEditor = ref(false);
  const editingId = ref(null);
  const formTitle = ref('');
  const formMessage = ref('');
  const formUnlockAt = ref('');
  const formRecipient = ref('partner'); // 'partner' | 'me'
  const saving = ref(false);
  
  // helpers
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
    // simple mapping: if toUid is partnerUid, show partner name; else generic
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
  
  // --- editor open/close ---
  function resetForm() {
    editingId.value = null;
    formTitle.value = '';
    formMessage.value = '';
    formUnlockAt.value = '';
    formRecipient.value = 'partner';
  }
  
  function openCreate() {
    resetForm();
  
    // default unlock = tomorrow at the same time
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const local = new Date(
      tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16); // yyyy-MM-ddTHH:mm
  
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
  
    // guess recipient type
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
  
  // --- save create/update ---
  async function saveCapsule() {
    if (!currentUid.value) {
      alert('You must be logged in to create a time capsule.');
      return;
    }
  
    if (!formUnlockAt.value) return;
  
    // convert local datetime-local string to ISO, let backend normalize anyway
    const unlockAtLocal = new Date(formUnlockAt.value);
    if (Number.isNaN(unlockAtLocal.getTime())) {
      alert('Invalid unlock date/time');
      return;
    }
  
    const unlockAtIso = unlockAtLocal.toISOString();
  
    // decide recipient uid
    let toUid;
    if (formRecipient.value === 'me') {
      toUid = currentUid.value;
    } else {
      toUid = PARTNER_UID || currentUid.value; // fallback to self if not set
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
  
  // --- open a capsule (marks opened + notifies creator via backend) ---
  async function handleOpen(capsule) {
    if (!capsule) return;
    if (isLocked(capsule)) return;
  
    try {
      await openTimeCapsule(capsule.id);
      // ensure we have latest openedAt state
      await fetchTimeCapsules();
    } catch (e) {
      console.warn('[TimeCapsulesView] handleOpen failed:', e);
      alert('Failed to open time capsule.');
    }
  }
  </script>
  
  <style scoped>
  .tc-view {
    padding: 1.5rem;
    max-width: 900px;
    margin: 0 auto;
    color: #f5f5ff;
  }
  
  .tc-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-end;
    margin-bottom: 1.25rem;
  }
  
  .tc-title {
    font-family: 'Great Vibes', cursive;
    font-size: 2.3rem;
    color: rgb(236, 5, 148);
    text-shadow: 0 0 10px magenta;
    margin: 0;
  }
  
  .tc-subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.95rem;
    opacity: 0.85;
  }
  
  .tc-new-btn {
    border-radius: 999px;
    border: 1px solid magenta;
    background: rgba(0, 0, 0, 0.7);
    color: magenta;
    padding: 0.4rem 1.1rem;
    font-size: 0.9rem;
    cursor: pointer;
    box-shadow:
      inset 0 0 8px rgba(255, 0, 255, 0.6),
      0 0 8px rgba(255, 0, 255, 0.5);
    transition: all 0.18s ease;
  }
  
  .tc-new-btn:hover {
    box-shadow:
      inset 0 0 10px rgba(255, 0, 255, 0.9),
      0 0 12px rgba(0, 255, 255, 0.6);
    transform: translateY(-1px);
  }
  
  .tc-status {
    margin-top: 1rem;
    font-size: 0.95rem;
    opacity: 0.8;
  }
  
  .tc-status-error {
    color: #ff7b9c;
  }
  
  .tc-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .tc-empty {
    margin-top: 1.5rem;
    text-align: center;
    opacity: 0.9;
    font-size: 0.95rem;
  }
  
  .tc-card {
    position: relative;
    border-radius: 14px;
    padding: 0.9rem 1rem 0.8rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: radial-gradient(circle at 5% 0%, rgba(0, 255, 255, 0.09), transparent 55%),
      radial-gradient(circle at 95% 100%, rgba(255, 0, 255, 0.1), transparent 55%),
      rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .tc-card-mine {
    border-color: rgba(255, 0, 255, 0.6);
    box-shadow:
      0 0 14px rgba(255, 0, 255, 0.35),
      0 0 20px rgba(0, 255, 255, 0.18);
  }
  
  .tc-card-theirs {
    border-color: rgba(0, 255, 255, 0.55);
    box-shadow:
      0 0 14px rgba(0, 255, 255, 0.3),
      0 0 20px rgba(255, 0, 255, 0.18);
  }
  
  .tc-card-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }
  
  .tc-card-title-wrap {
    flex: 1;
    min-width: 0;
  }
  
  .tc-card-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
  }
  
  .tc-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.25rem;
  }
  
  .tc-badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(0, 0, 0, 0.7);
  }
  
  .tc-badge-mine {
    border-color: magenta;
    color: magenta;
  }
  
  .tc-badge-theirs {
    border-color: cyan;
    color: cyan;
  }
  
  .tc-badge-self {
    border-color: gold;
    color: gold;
  }
  
  .tc-badge-target {
    opacity: 0.85;
  }
  
  .tc-card-meta {
    font-size: 0.75rem;
    opacity: 0.9;
    text-align: right;
  }
  
  .tc-meta-row {
    display: flex;
    justify-content: flex-end;
    gap: 0.25rem;
  }
  
  .tc-meta-label {
    opacity: 0.7;
  }
  
  .tc-meta-value {
    font-weight: 500;
  }
  
  .tc-card-body {
    position: relative;
    margin-top: 0.2rem;
  }
  
  .tc-message-wrap {
    position: relative;
  }
  
  .tc-message {
    font-size: 0.9rem;
    line-height: 1.4;
    margin: 0;
  }
  
  .tc-body-locked .tc-message {
    filter: blur(7px);
  }
  
  .tc-lock-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  
  .tc-lock-icon {
    font-size: 1.4rem;
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.9);
  }
  
  .tc-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.3rem;
  }
  
  .tc-created-at {
    font-size: 0.7rem;
    opacity: 0.7;
  }
  
  .tc-footer-right {
    display: flex;
    gap: 0.4rem;
  }
  
  .tc-btn {
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
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
  
  .tc-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2500;
  }
  
  .tc-modal {
    position: relative;
    width: 95%;
    max-width: 520px;
    border-radius: 14px;
    border: 1px solid magenta;
    background: radial-gradient(circle at 10% 0%, rgba(0, 255, 255, 0.18), transparent 60%),
      radial-gradient(circle at 90% 100%, rgba(255, 0, 255, 0.18), transparent 60%),
      rgba(0, 0, 0, 0.9);
    box-shadow:
      0 0 25px rgba(255, 0, 255, 0.5),
      0 0 30px rgba(0, 255, 255, 0.4);
    padding: 1.1rem 1.2rem 0.9rem;
  }
  
  .tc-modal-close {
    position: absolute;
    top: -0.7rem;
    right: -0.9rem;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid cyan;
    background: rgba(0, 0, 0, 0.85);
    color: cyan;
    font-size: 1.2rem;
    cursor: pointer;
  }
  
  .tc-modal-title {
    margin: 0 0 0.7rem;
    font-size: 1.15rem;
  }
  
  .tc-modal-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .tc-field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .tc-field-label {
    font-size: 0.8rem;
    opacity: 0.8;
  }
  
  .tc-input,
  .tc-textarea {
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(0, 0, 0, 0.8);
    color: #f5f5ff;
    padding: 0.35rem 0.55rem;
    font-size: 0.85rem;
    outline: none;
  }
  
  .tc-input:focus,
  .tc-textarea:focus {
    border-color: cyan;
    box-shadow: 0 0 6px rgba(0, 255, 255, 0.6);
  }
  
  .tc-recipient-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  
  .tc-radio {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
  }
  
  .tc-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.9rem;
  }
  
  @media (max-width: 600px) {
    .tc-header {
      flex-direction: column;
      align-items: flex-start;
    }
  
    .tc-card-header {
      flex-direction: column;
    }
  
    .tc-card-meta {
      text-align: left;
    }
  }
  </style>
  