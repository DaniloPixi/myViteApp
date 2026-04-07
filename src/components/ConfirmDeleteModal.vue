<template>
  <Teleport to="body">
    <div class="confirm-delete-overlay ds-modal-overlay" @click.self="onOverlayClose">
      <div class="confirm-delete-content ds-modal-surface ds-modal-surface--xs ds-surface-danger">
        <h3 class="confirm-delete-title ds-modal-title ds-modal-title--gold">
          {{ randomMessage }}
        </h3>

        <div class="ds-modal-actions">
          <button
            @click="onConfirm"
            class="ds-modal-action-btn ds-modal-action-btn--danger"
            type="button"
          >
            <Check :size="20" />
            <span>Confirm</span>
          </button>

          <button
            @click="onClose"
            class="ds-modal-action-btn ds-modal-action-btn--cancel"
            type="button"
          >
            <X :size="20" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Check, X } from 'lucide-vue-next';
import { useSoundManager } from '../composables/useSoundManager';

const emit = defineEmits(['confirm', 'close']);
const { play } = useSoundManager();

const messages = ["We don't need this anymore?", 'Trash it?', 'Straight to MA48?'];

const randomMessage = ref('');

onMounted(() => {
  randomMessage.value = messages[Math.floor(Math.random() * messages.length)];
});

function onConfirm() {
  play('tap');
  emit('confirm');
}

function onClose() {
  play('tap');
  emit('close');
}

function onOverlayClose() {
  play('tap');
  emit('close');
}
</script>

<style scoped>
.confirm-delete-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000; /* above floating map/sound buttons */
  display: grid;
  place-items: center;
  padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
}

.confirm-delete-content {
  width: min(var(--ds-container-xs, 420px), calc(100vw - 1.5rem));
  max-width: 100%;
  margin: 0;
  text-align: center;
  box-sizing: border-box;
}

.confirm-delete-title {
  margin: 0 0 var(--ds-space-6);
}

@media (max-width: 480px) {
  .confirm-delete-title {
    margin-bottom: var(--ds-space-5);
  }

  .confirm-delete-content {
    width: min(var(--ds-container-xs, 420px), calc(100vw - 1rem));
  }
}
</style>
