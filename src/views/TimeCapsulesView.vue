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
        :data-capsule-id="capsule.id"
        :class="[
          isMine(capsule) ? 'tc-card-mine' : 'tc-card-theirs',
          isLocked(capsule) ? 'tc-card-locked' : 'tc-card-unlocked',
          isTouchDevice && focusedCapsuleId === capsule.id ? 'tc-card-focused' : ''
        ]"
      >
        <div class="tc-card-main">
          <div class="tc-card-text">
            <h2 class="tc-card-title">
              {{ capsule.title || 'Untitled capsule' }}
            </h2>

            <div class="tc-badges">
              <span
                class="tc-badge"
                :class="isMine(capsule) ? 'tc-badge-mine' : 'tc-badge-theirs'"
              >
                From {{ nameForUid(capsule.fromUid) }}
              </span>

              <span class="tc-badge tc-badge-target">
                To {{ nameForUid(capsule.toUid) }}
              </span>
            </div>
          </div>
        </div>

        <div class="tc-card-actions">
          <button
            v-if="canEdit(capsule)"
            class="tc-btn tc-btn-ghost"
            @click="openEdit(capsule)"
          >
            Edit
          </button>

          <button
  v-if="canDelete(capsule)"
  type="button"
  class="tc-btn tc-btn-danger tc-btn-icon"
  @click="promptDelete(capsule)"
  aria-label="Delete capsule"
>
  <svg
    class="tc-icon-trash"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      d="M9 3.5h6c.55 0 1 .45 1 1v1.5h3.25a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1 0-1.5H8V4.5c0-.55.45-1 1-1zm1.5 3h3v-1h-3v1zM7.75 9.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5c0-.41.34-.75.75-.75zm4.25 0a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5c0-.41.34-.75.75-.75zm4.25 0a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5c0-.41.34-.75.75-.75zM7 8h10l-.74 9.23A2 2 0 0 1 14.27 19H9.73a2 2 0 0 1-1.99-1.77L7 8z"
    />
  </svg>
</button>


          <button
            class="tc-btn tc-btn-primary"
            :disabled="isLocked(capsule)"
            @click="handleOpen(capsule)"
          >
            <span v-if="isLocked(capsule)">🔒 Locked</span>
            <span v-else-if="isOpened(capsule)">🔓 View</span>
            <span v-else>🔓 Open</span>
          </button>
        </div>
      </div>
    </div>

    <!-- CREATE / EDIT MODAL -->
  <!-- CREATE / EDIT MODAL -->
<Transition name="modal">
  <TimeCapsuleFormModal
    v-if="isFormModalVisible"
    :capsule="editingCapsule"
    :partner-name="partnerName"
    :from-name="myName"
    :is-submitting="saving"
    :submit-error="submitError"
    cloudinary-cloud-name="dknmcj1qj"
    cloudinary-upload-preset="memos_and_moments"
    @close="closeFormModal"
    @save="handleSaveCapsule"
  />
</Transition>

<!-- READ MODAL -->
<Transition name="modal">
  <TimeCapsuleReadModal
    v-if="showReader && readerCapsule"
    :capsule="readerCapsule"
    :is-mine="isMine(readerCapsule)"
    :recipient-label="readerRecipientLabel"
    :partner-name="partnerName"
    :from-name="myName"
    @close="closeReader"
  />
</Transition>


    <!-- READ MODAL -->
    <Transition name="modal">
      <TimeCapsuleReadModal
        v-if="showReader && readerCapsule"
        :capsule="readerCapsule"
        :is-mine="isMine(readerCapsule)"
        :recipient-label="readerRecipientLabel"
        :partner-name="PARTNER_NAME"
        @close="closeReader"
      />
    </Transition>

    <!-- DELETE CONFIRM MODAL -->
    <Transition name="modal">
      <ConfirmDeleteModal
        v-if="isDeleteModalVisible"
        @confirm="confirmDelete"
        @close="closeDeleteModal"
      />
    </Transition>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { auth } from '../firebase';
  import {
    useTimeCapsules,
    createTimeCapsule,
    updateTimeCapsule,
    openTimeCapsule,
    deleteTimeCapsule,
  } from '../composables/useTimeCapsules';
  import TimeCapsuleFormModal from '../components/TimeCapsuleFormModal.vue';
  import TimeCapsuleReadModal from '../components/TimeCapsuleReadModal.vue';
  import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
  
  const props = defineProps({
    dateFilter: {
      type: String,
      default: '',
    },
    // '' | 'locked' | 'unlocked'
    lockStatusFilter: {
      type: String,
      default: '',
    },
  });
  
  const isTouchDevice = ref(false);
  const focusedCapsuleId = ref(null);
  
  function updateFocusedCapsule() {
    if (!isTouchDevice.value) return;
  
    const cards = document.querySelectorAll('.tc-card[data-capsule-id]');
    if (!cards.length) {
      focusedCapsuleId.value = null;
      return;
    }
  
    const viewportCenterY = window.innerHeight / 2;
    let closestId = null;
    let minDistance = Infinity;
  
    cards.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const distance = Math.abs(centerY - viewportCenterY);
  
      if (distance < minDistance) {
        minDistance = distance;
        closestId = el.dataset.capsuleId;
      }
    });
  
    if (minDistance < 140) {
      focusedCapsuleId.value = closestId;
    } else {
      focusedCapsuleId.value = null;
    }
  }
  
  /* ---------- USERS / NAMES ---------- */
  
  /**
   * Your Firebase UID (Dani)
   */
  const DANI_UID = 'uuqNmyiBe5Vm2Ap6PwZFzLVO72Q2';
  
  /**
   * Eva's UID – this is the one you already had as PARTNER_UID.
   * We still need it for toUid when you send capsules to her.
   */
  const EVA_UID = '6SXYP6cypwRZSJSL8GjrP0LtzMi1';
  
  const DANI_NAME = 'Dani';
  const EVA_NAME = 'Eva';
  
  // --- auth context ---
  const currentUser = computed(() => auth.currentUser);
  const currentUid = computed(() => currentUser.value?.uid || null);
  
  /**
   * Name of the *logged in* user:
   * - if UID === DANI_UID → "Dani"
   * - otherwise → "Eva"
   */
  const myName = computed(() => {
    if (!currentUid.value) return DANI_NAME; // default when not logged in
    return currentUid.value === DANI_UID ? DANI_NAME : EVA_NAME;
  });
  
  /**
   * Name of the other person:
   * - if I'm Dani → partner = Eva
   * - if I'm Eva → partner = Dani
   */
  const partnerName = computed(() => {
    if (!currentUid.value) return EVA_NAME;
    return currentUid.value === DANI_UID ? EVA_NAME : DANI_NAME;
  });
  
  /**
   * Map a stored UID in the capsule to a human name.
   * Only two users exist: Dani + Eva.
   */
  function nameForUid(uid) {
    if (!uid) return 'Unknown';
    if (uid === DANI_UID) return DANI_NAME;
    if (uid === EVA_UID) return EVA_NAME;
    return 'Unknown';
  }
  
  /* ---------- COMPOSABLE ---------- */
  
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
  
    isTouchDevice.value =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  
    if (isTouchDevice.value) {
      setTimeout(updateFocusedCapsule, 200);
      window.addEventListener('scroll', updateFocusedCapsule, { passive: true });
      window.addEventListener('resize', updateFocusedCapsule);
    }
  });
  
  onUnmounted(() => {
    if (isTouchDevice.value) {
      window.removeEventListener('scroll', updateFocusedCapsule);
      window.removeEventListener('resize', updateFocusedCapsule);
    }
  });
  
  /* ---------- FILTERED LIST ---------- */
  
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
  
    if (props.lockStatusFilter === 'locked') {
      list = list.filter((capsule) => isLocked(capsule));
    } else if (props.lockStatusFilter === 'unlocked') {
      list = list.filter((capsule) => !isLocked(capsule));
    }
  
    return list;
  });
  
  /* ---------- MODAL STATE ---------- */
  
  // create/edit
  const isFormModalVisible = ref(false);
  const editingCapsule = ref(null);
  const saving = ref(false);
  const submitError = ref('');
  
  // reader
  const showReader = ref(false);
  const readerCapsule = ref(null);
  const readerRecipientLabel = ref('');
  
  // delete confirm
  const isDeleteModalVisible = ref(false);
  const capsulePendingDelete = ref(null);
  
  /* ---------- HELPERS ---------- */
  
  function isMine(capsule) {
    if (!capsule || !currentUid.value) return false;
    return capsule.fromUid === currentUid.value;
  }
  
  // simple recipient label for the reader modal
  function recipientLabel(capsule) {
    if (!capsule) return '';
    return nameForUid(capsule.toUid);
  }
  
  function canEdit(capsule) {
    if (!capsule) return false;
    if (!isMine(capsule)) return false;
    if (isOpened(capsule)) return false;
    if (!capsule.unlockAt) return false;
    const unlockTime = new Date(capsule.unlockAt).getTime();
    return unlockTime > Date.now();
  }
  
  function canDelete(capsule) {
    if (!capsule) return false;
    return isMine(capsule);
  }
  
  /* ---------- EDITOR MODAL OPEN/CLOSE ---------- */
  
  function openCreate() {
    // give form a "blank" capsule, but with safe defaults
    editingCapsule.value = {
      id: null,
      title: '',
      message: '',
      unlockAt: null,
      photos: [],
      fromUid: currentUid.value || null,
      toUid: null,
    };
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
  
  /* ---------- CREATE / UPDATE VIA MODAL ---------- */
  
  async function handleSaveCapsule(payload) {
    if (!currentUid.value) {
      alert('You must be logged in to create a time capsule.');
      return;
    }
  
    const { title, message, unlockAtLocal, recipient, photos } = payload;
  
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
  
    // who is this capsule for?
    let toUid;
  
    // new capsule
    if (!editingCapsule.value || !editingCapsule.value.id) {
      if (recipient === 'me') {
        // send to myself
        toUid = currentUid.value;
      } else {
        // send to the other person
        toUid = currentUid.value === DANI_UID ? EVA_UID : DANI_UID;
      }
    }
  
    saving.value = true;
    submitError.value = '';
  
    try {
      if (!editingCapsule.value || !editingCapsule.value.id) {
        await createTimeCapsule({
          toUid,
          unlockAt: unlockAtIso,
          title: title || '',
          message: trimmedMessage,
          photos: photos || [],
        });
      } else {
        await updateTimeCapsule(editingCapsule.value.id, {
          title: title || '',
          message: trimmedMessage,
          unlockAt: unlockAtIso,
          photos: photos || [],
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
  
  /* ---------- READER MODAL ---------- */
  
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
  
  /* ---------- OPEN CAPSULE ---------- */
  
  async function handleOpen(capsule) {
    if (!capsule) return;
    if (isLocked(capsule)) return;
  
    openReader(capsule);
  
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
  
  /* ---------- DELETE CAPSULE FLOW ---------- */
  
  function promptDelete(capsule) {
    if (!capsule || !canDelete(capsule)) return;
    capsulePendingDelete.value = capsule;
    isDeleteModalVisible.value = true;
  }
  
  function closeDeleteModal() {
    isDeleteModalVisible.value = false;
    capsulePendingDelete.value = null;
  }
  
  async function confirmDelete() {
    const capsule = capsulePendingDelete.value;
    if (!capsule) {
      closeDeleteModal();
      return;
    }
  
    isDeleteModalVisible.value = false;
    capsulePendingDelete.value = null;
  
    saving.value = true;
    submitError.value = '';
  
    try {
      await deleteTimeCapsule(capsule.id);
  
      if (readerCapsule.value && readerCapsule.value.id === capsule.id) {
        closeReader();
      }
    } catch (e) {
      console.warn('[TimeCapsulesView] confirmDelete failed:', e);
      submitError.value = 'Failed to delete time capsule.';
    } finally {
      saving.value = false;
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
  margin-bottom: 1.4rem;
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

/* Grid of capsules */

.tc-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

/* CARD */

.tc-card {
  position: relative;
  backdrop-filter: blur(8px);
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.55rem 0.7rem;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  text-align: center;

  flex: 0 1 calc(20% - 0.75rem);
  min-width: 150px;
  max-width: 190px;

  background:
    radial-gradient(
      circle at 10% 0%,
      var(--tc-card-glow-a, rgba(0, 255, 255, 0)),
      transparent 60%
    ),
    radial-gradient(
      circle at 90% 100%,
      var(--tc-card-glow-b, rgba(255, 0, 255, 0)),
      transparent 60%
    ),
    rgba(0, 0, 0, 0);

  box-shadow:
    inset 0 0 6px var(--bubble-inner-shadow-color, rgba(255, 0, 255, 0.35)),
    0 0 11px var(--bubble-outer-shadow-color, rgba(0, 255, 255, 0.22));
  transition:
    box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
    background 0.25s ease,
    border-color 0.25s ease,
    transform 0.22s cubic-bezier(0.25, 0.8, 0.25, 1);
  backface-visibility: hidden;
}

.tc-card:hover {
  background:
    radial-gradient(
      circle at 10% 0%,
      var(--tc-card-glow-a, rgba(0, 255, 255, 0.16)),
      transparent 60%
    ),
    radial-gradient(
      circle at 90% 100%,
      var(--tc-card-glow-b, rgba(255, 0, 255, 0.16)),
      transparent 60%
    ),
    rgba(0, 0, 0, 0.18);

  box-shadow:
    inset 0 0 10px var(--bubble-inner-shadow-color, rgba(255, 0, 255, 0.5)),
    0 0 14px var(--bubble-outer-shadow-color, rgba(0, 255, 255, 0.32));

  /* NEW: match the mobile “focused” feel on hover */
  transform: scale(1.5);
  z-index: 2;
}


/* mine/theirs tweaks */

.tc-card-mine {
  border-color: rgba(255, 0, 255, 0.4);
  --bubble-inner-shadow-color: rgba(255, 3, 220, 0.5);
  --bubble-outer-shadow-color: rgba(255, 3, 220, 0.3);
  --bubble-text-color: #ff4fe9;

  --tc-card-glow-a: rgba(255, 0, 255, 0.24);
  --tc-card-glow-b: rgba(255, 0, 255, 0.14);
}

.tc-card-theirs {
  border-color: rgba(3, 220, 255, 0.4);
  --bubble-inner-shadow-color: rgba(3, 220, 255, 0.5);
  --bubble-outer-shadow-color: rgba(3, 220, 255, 0.3);
  --bubble-text-color: #7ef7ff;

  --tc-card-glow-a: rgba(0, 255, 255, 0.24);
  --tc-card-glow-b: rgba(0, 140, 255, 0.14);
}

.tc-card-locked {
  opacity: 0.9;
}

.tc-card-unlocked {
  opacity: 1;
}

/* Main content inside card */

.tc-card-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  width: 100%;
}

.tc-card-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 0;
  width: 100%;
}

.tc-card-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--bubble-text-color, #ff4fe9);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-width: 100%;
}

.tc-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;
}

.tc-badge {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.7);
}

.tc-badge-mine {
  border-color: rgba(255, 0, 255, 0.8);
  color: #ff7bff;
  box-shadow: 0 0 4px rgba(255, 0, 255, 0.6);
}

.tc-badge-theirs {
  border-color: rgba(0, 255, 255, 0.8);
  color: #7ef7ff;
  box-shadow: 0 0 4px rgba(0, 255, 255, 0.6);
}

.tc-badge-target {
  opacity: 0.85;
}

/* Actions */

.tc-card-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  margin-top: 0.3rem;
  width: 100%;

  /* NEW: allow wrapping so buttons go on two rows instead of overflowing */
  flex-wrap: wrap;
}


/* Buttons */

.tc-btn {
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  font-size: 0.7rem;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: #f5f5ff;
  transition: box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  white-space: nowrap;
}
/* Icon-style buttons (for delete) */
.tc-btn-icon {
  padding: 0.2rem;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Make the danger button not too wide when used as icon-only */
.tc-btn-danger.tc-btn-icon {
  padding-inline: 0.35rem;
}

/* Trash icon sizing */
.tc-icon-trash {
  width: 1rem;
  height: 1rem;
  display: block;
  fill: currentColor; /* <- this is the important line */
}


/* Slight tweak for very small screens so it never overflows */
@media (max-width: 37.5rem) {
  .tc-btn-danger.tc-btn-icon {
    padding-inline: 0.3rem;
  }
}

.tc-btn-ghost {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(0, 0, 0, 0.6);
}

.tc-btn-ghost:hover {
  border-color: rgba(0, 255, 255, 0.8);
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

/* Delete button styling */
.tc-btn-danger {
  border-color: rgba(255, 99, 132, 0.9);
  background: rgba(40, 0, 10, 0.85);
  color: #ffb0c5;
  box-shadow: 0 0 6px rgba(255, 99, 132, 0.5);
}

.tc-btn-danger:hover {
  border-color: rgba(255, 140, 160, 1);
  box-shadow: 0 0 10px rgba(255, 99, 132, 0.8);
}

.tc-btn-primary {
  border-color: magenta;
  background: rgba(0, 0, 0, 0.7);
  color: magenta;
  box-shadow:
    inset 0 0 6px rgba(255, 0, 255, 0.6),
    0 0 6px rgba(255, 0, 255, 0.5);
    flex-basis: 50%;
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

@media (max-width: 900px) {
  .tc-card {
    flex: 0 1 calc(25% - 0.75rem);
  }
}

@media (max-width: 600px) {
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
    flex: 0 1 calc(33.333% - 0.75rem);
    border-radius: 75px;
    transform: scale(1);
    transform-origin: center center;
    will-change: transform, box-shadow;
  }

  .tc-card-focused {
    transform: scale(1.5);
    z-index: 2;
    box-shadow:
      inset 0 0 14px var(--bubble-inner-shadow-color, rgba(255, 0, 255, 0.6)),
      0 0 20px var(--bubble-outer-shadow-color, rgba(0, 255, 255, 0.45));
  }
}

@media (max-width: 500px) {
  .tc-card {
    flex: 0 1 calc(50% - 0.75rem);
  }
}
</style>
