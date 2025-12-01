<template>
    <div class="tc-view">
        <header class="tc-header">
  <div class="tc-header-main">
    <p class="tc-subtitle">
      Messages for future hearts. Locked until their time.
    </p>

    <button class="tc-new-btn" @click="openCreate">
      New time capsule ✨
    </button>
  </div>
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
          :style="getCapsuleStyle(capsule)"
        >
          <!-- CARD HEADER -->
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
                <span
                  v-if="isSelfCapsule(capsule)"
                  class="tc-badge tc-badge-self"
                >
                  To yourself
                </span>
                <span
                  v-else
                  class="tc-badge tc-badge-target"
                >
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
  
          <!-- CARD BODY (no full message here anymore) -->
          <div
            class="tc-card-body"
            :class="{ 'tc-body-locked': isLocked(capsule) }"
          >
            <div class="tc-message-wrap">
              <p class="tc-message">
                <span v-if="isLocked(capsule)">
                  This capsule is locked until {{ formatUnlock(capsule.unlockAt) }}.
                </span>
                <span v-else-if="!isOpened(capsule)">
                  Ready to open. Tap <strong>“Open”</strong> to reveal the message.
                </span>
                <span v-else>
                  Message opened. Tap <strong>“View”</strong> to read it again.
                </span>
              </p>
  
              <div
                v-if="isLocked(capsule) || !isOpened(capsule)"
                class="tc-lock-overlay"
              >
                <span class="tc-lock-icon">🔒</span>
              </div>
            </div>
          </div>
  
          <!-- CARD FOOTER -->
          <div class="tc-card-footer">
            <div class="tc-footer-left">
              <small class="tc-created-at">
                Written {{ formatDate(capsule.createdAt) }}
              </small>
            </div>
  
            <div class="tc-footer-right">
              <button
                v-if="canEdit(capsule)"
                class="tc-btn tc-btn-ghost"
                @click="openEdit(capsule)"
              >
                Edit
              </button>
  
              <button
                class="tc-btn tc-btn-primary"
                :disabled="isLocked(capsule)"
                @click="handleOpen(capsule)"
              >
                <span v-if="isLocked(capsule)">Locked</span>
                <span v-else-if="isOpened(capsule)">View</span>
                <span v-else>Open</span>
              </button>
            </div>
          </div>
        </div>
      </div>
  
      <!-- CREATE / EDIT MODAL -->
      <TimeCapsuleFormModal
        v-if="isFormModalVisible"
        :capsule="editingCapsule"
        :partner-name="PARTNER_NAME"
        :is-submitting="saving"
        :submit-error="submitError"
        @close="closeFormModal"
        @save="handleSaveCapsule"
      />
  
      <!-- READ MODAL -->
      <TimeCapsuleReadModal
        v-if="showReader && readerCapsule"
        :capsule="readerCapsule"
        :is-mine="isMine(readerCapsule)"
        :recipient-label="readerRecipientLabel"
        :partner-name="PARTNER_NAME"
        @close="closeReader"
      />
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import { auth } from '../firebase';
  import {
    useTimeCapsules,
    createTimeCapsule,
    updateTimeCapsule,
    openTimeCapsule,
  } from '../composables/useTimeCapsules';
  import TimeCapsuleFormModal from '../components/TimeCapsuleFormModal.vue';
  import TimeCapsuleReadModal from '../components/TimeCapsuleReadModal.vue';
  
  const props = defineProps({
    dateFilter: {
      type: String,
      default: '',
    },
  });
  
  // TODO: replace with real partner UID + name
  const PARTNER_UID = 'PUT_PARTNER_UID_HERE';
  const PARTNER_NAME = 'Eva';
  
  // --- auth context ---
  const currentUser = computed(() => auth.currentUser);
  const currentUid = computed(() => currentUser.value?.uid || null);
  
  // --- composable ---
  const {
    sortedCapsules,
    loading,
    error,
    fetchTimeCapsules,
    isLocked,
    isOpened,
  } = useTimeCapsules();
  
  onMounted(() => {
    fetchTimeCapsules();
  });
  
  // --- filtered list ---
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
  
  // --- modal state (create/edit) ---
  const isFormModalVisible = ref(false);
  const editingCapsule = ref(null);
  const saving = ref(false);
  const submitError = ref('');
  
  // --- modal state (reader) ---
  const showReader = ref(false);
  const readerCapsule = ref(null);
  const readerRecipientLabel = ref('');
  
  // --- helpers ---
  function isMine(capsule) {
    if (!capsule || !currentUid.value) return false;
    return capsule.fromUid === currentUid.value;
  }
  
  function isSelfCapsule(capsule) {
    if (!capsule) return false;
    return capsule.fromUid && capsule.toUid && capsule.fromUid === capsule.toUid;
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
  
  // style: sibling of plan bubbles
  function getCapsuleStyle(capsule) {
    if (isMine(capsule)) {
      return {
        '--bubble-inner-shadow-color': 'rgba(255, 3, 220, 0.5)',
        '--bubble-outer-shadow-color': 'rgba(255, 3, 220, 0.3)',
        '--bubble-text-color': '#ff4fe9',
      };
    }
    return {
      '--bubble-inner-shadow-color': 'rgba(3, 220, 255, 0.5)',
      '--bubble-outer-shadow-color': 'rgba(3, 220, 255, 0.3)',
      '--bubble-text-color': '#7ef7ff',
    };
  }
  
  // --- editor modal open/close ---
  function openCreate() {
    editingCapsule.value = null;
    submitError.value = '';
    isFormModalVisible.value = true;
  }
  
  function openEdit(capsule) {
    if (!capsule) return;
    editingCapsule.value = capsule;
    submitError.value = '';
    isFormModalVisible.value = true;
  }
  
  function closeFormModal() {
    isFormModalVisible.value = false;
    editingCapsule.value = null;
    submitError.value = '';
  }
  
  // --- create/update via modal ---
  async function handleSaveCapsule(payload) {
    if (!currentUid.value) {
      alert('You must be logged in to create a time capsule.');
      return;
    }
  
    const { title, message, unlockAtLocal, recipient } = payload;
  
    if (!unlockAtLocal) {
      alert('Please choose an unlock date and time.');
      return;
    }
  
    const unlockAtLocalDate = new Date(unlockAtLocal);
    if (Number.isNaN(unlockAtLocalDate.getTime())) {
      alert('Invalid unlock date/time');
      return;
    }
  
    const now = Date.now();
    const unlockTs = unlockAtLocalDate.getTime();
    if (unlockTs <= now) {
      alert('Unlock time must be in the future.');
      return;
    }
  
    const trimmedMessage = (message || '').trim();
    if (!trimmedMessage) {
      alert('Message cannot be empty.');
      return;
    }
  
    const unlockAtIso = unlockAtLocalDate.toISOString();
  
    let toUid;
    if (!editingCapsule.value) {
      if (recipient === 'me') {
        toUid = currentUid.value;
      } else {
        toUid = PARTNER_UID || currentUid.value;
      }
    }
  
    saving.value = true;
    submitError.value = '';
  
    try {
      if (!editingCapsule.value) {
        await createTimeCapsule({
          toUid,
          unlockAt: unlockAtIso,
          title: title || '',
          message: trimmedMessage,
        });
      } else {
        await updateTimeCapsule(editingCapsule.value.id, {
          title: title || '',
          message: trimmedMessage,
          unlockAt: unlockAtIso,
        });
      }
  
      await fetchTimeCapsules();
      closeFormModal();
    } catch (e) {
      console.warn('[TimeCapsulesView] handleSaveCapsule failed:', e);
      submitError.value = 'Failed to save time capsule.';
    } finally {
      saving.value = false;
    }
  }
  
  // --- reader modal open/close ---
  function openReader(capsule) {
    if (!capsule) return;
    readerCapsule.value = capsule;
    readerRecipientLabel.value = recipientLabel(capsule);
    showReader.value = true;
  }
  
  function closeReader() {
    showReader.value = false;
    readerCapsule.value = null;
    readerRecipientLabel.value = '';
  }
  
  // --- open a capsule (and show modal) ---
  async function handleOpen(capsule) {
    if (!capsule) return;
    if (isLocked(capsule)) return;
  
    // Show modal immediately
    openReader(capsule);
  
    // First open: mark as opened in backend
    if (!isOpened(capsule)) {
      try {
        await openTimeCapsule(capsule.id);
        await fetchTimeCapsules();
      } catch (e) {
        console.warn('[TimeCapsulesView] handleOpen failed:', e);
        alert('Failed to mark time capsule as opened.');
      }
    }
  }
  </script>
  
  <style scoped>
  @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
  
  .tc-view {
    padding: 1.5rem;
    max-width: 900px;
    margin: 0 auto;
    color: #f5f5ff;
  }
  
  /* Header */
  
  .tc-header {
    display: flex;
    justify-content: center;
    margin-bottom: 1.8rem;
  }

  .tc-header-main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.75rem 1.25rem;
    text-align: center;
  }
  
  .tc-subtitle {
    margin: 0;
    font-family: 'Great Vibes', cursive;
    font-size: 1.9rem;
    font-weight: normal;
    color: #ff4fe9;
    text-shadow: 0 0 10px rgba(255, 79, 233, 0.7);
  }
  
  .tc-new-btn {
    background: linear-gradient(45deg, #0f0f0f, #f3099270, #360101);
    color: rgb(95, 213, 243);
    padding: 0.45rem 1.7rem;
    border: none;
    border-radius: 999px;
    font-family: 'Great Vibes', cursive;
    font-weight: normal;
    font-size: 1.7rem;
    cursor: pointer;
    transition: box-shadow 0.25s ease, background 0.25s ease;
    box-shadow: 0 4px 15px rgba(240, 6, 134, 0.26);
    white-space: nowrap;
  }
  
  .tc-new-btn:hover {
    box-shadow: 0 7px 24px rgba(248, 87, 166, 0.55);
    background: linear-gradient(45deg, #141414, #f3099270, #4a0202);
  }
  
  /* States & list */
  
  .tc-status {
    text-align: center;
    font-size: 0.9rem;
    opacity: 0.8;
  }
  
  .tc-status-error {
    color: #ff6b6b;
  }
  
  .tc-empty {
    text-align: center;
    font-size: 0.95rem;
    opacity: 0.85;
  }
  
  .tc-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  /* CARD – capsule-shaped, transparent, centered text */
  
  .tc-card {
    position: relative;
    backdrop-filter: blur(8px);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(0, 0, 0, 0.2);
    color: #fff;
    padding: 0.9rem 1.1rem 0.8rem;
  
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  
    box-shadow:
      inset 0 0 10px var(--bubble-inner-shadow-color, rgba(255, 0, 255, 0.4)),
      0 0 15px var(--bubble-outer-shadow-color, rgba(0, 255, 255, 0.25));
    transition:
      box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
      background-color 0.25s ease,
      border-color 0.25s ease;
  }
  
  .tc-card:hover {
    box-shadow:
      inset 0 0 18px var(--bubble-inner-shadow-color, rgba(255, 0, 255, 0.55)),
      0 0 22px var(--bubble-outer-shadow-color, rgba(0, 255, 255, 0.35));
    background-color: rgba(0, 0, 0, 0.3);
  }
  
  /* mine/theirs + lock/unlock tweaks */
  
  .tc-card-mine {
    border-color: rgba(255, 0, 255, 0.4);
  }
  
  .tc-card-theirs {
    border-color: rgba(3, 220, 255, 0.4);
  }
  
  .tc-card-locked {
    opacity: 0.95;
  }
  
  .tc-card-unlocked {
    opacity: 1;
  }
  
  /* Header area */
  
  .tc-card-header {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: center;
  }
  
  .tc-card-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: center;
  }
  
  .tc-card-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--bubble-text-color, #ff4fe9);
  }
  
  .tc-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: center;
  }
  
  .tc-badge {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.7);
  }
  
  .tc-badge-mine {
    border-color: rgba(255, 0, 255, 0.8);
    color: #ff7bff;
    box-shadow: 0 0 6px rgba(255, 0, 255, 0.6);
  }
  
  .tc-badge-theirs {
    border-color: rgba(0, 255, 255, 0.8);
    color: #7ef7ff;
    box-shadow: 0 0 6px rgba(0, 255, 255, 0.6);
  }
  
  .tc-badge-self {
    border-color: rgba(255, 223, 127, 0.85);
    color: #ffdf7f;
  }
  
  .tc-badge-target {
    opacity: 0.85;
  }
  
  /* Meta (date/status) – centered */
  
  .tc-card-meta {
    width: 100%;
    margin-top: 0.2rem;
    font-size: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: center;
  }
  
  .tc-meta-row {
    display: flex;
    gap: 0.4rem;
    justify-content: center;
  }
  
  .tc-meta-label {
    opacity: 0.7;
  }
  
  .tc-meta-value {
    font-weight: 500;
  }
  
  /* Message body */
  
  .tc-card-body {
    width: 100%;
    margin-top: 0.45rem;
  }
  
  .tc-message-wrap {
    position: relative;
    border-radius: 999px;
    padding: 0.5rem 0.8rem;
    background: radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.05), transparent 65%),
                rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }
  
  .tc-message {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.35;
    opacity: 0.92;
  }
  
  .tc-body-locked .tc-message {
    opacity: 0.85;
  }
  
  /* Lock overlay */
  
  .tc-lock-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 0%, rgba(0, 0, 0, 0.35), transparent 55%),
                rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  
  .tc-lock-icon {
    font-size: 1.2rem;
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.4));
  }
  
  /* Footer */
  
  .tc-card-footer {
    width: 100%;
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    align-items: center;
  }
  
  .tc-footer-left {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  
  .tc-created-at {
    margin: 0;
  }
  
  .tc-footer-right {
    display: flex;
    gap: 0.4rem;
  }
  
  /* Buttons */
  
  .tc-btn {
    border-radius: 999px;
    padding: 0.25rem 0.8rem;
    font-size: 0.75rem;
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    color: #f5f5ff;
    transition: box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
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
  }
  
  .tc-btn:disabled {
    opacity: 0.55;
    cursor: default;
    box-shadow: none;
  }
  
  /* Responsive */
  
  @media (max-width: 700px) {
    .tc-header-main {
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
    }
  
    .tc-new-btn {
      width: 100%;
      max-width: 260px;
      font-size: 1.6rem;
    }
  
    .tc-card {
      border-radius: 20px;
    }
  }
</style>

  