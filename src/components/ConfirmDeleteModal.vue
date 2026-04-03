<template>
  <div class="modal-overlay ds-modal-overlay" @click.self="onOverlayClose">
    <div class="modal-content ds-modal-surface ds-modal-surface--xs ds-surface-danger">
      <h3 class="modal-title ds-modal-title ds-modal-title--gold">
        {{ randomMessage }}
      </h3>

      <div class="modal-actions ds-modal-actions">
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
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Check, X } from 'lucide-vue-next';
import { useSoundManager } from '../composables/useSoundManager';

const emit = defineEmits(['confirm', 'close']);
const { play } = useSoundManager();

const messages = [
  "We don't need this anymore?",
  'Trash it?',
  'Straight to MA48?',
];

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
.modal-content {
  text-align: center;
}
.modal-title {
  margin: 0 0 var(--ds-space-6);
}

@media (max-width: 480px) {
  .modal-title {
    margin-bottom: var(--ds-space-5);
  }
}
</style>