<template>
  <div class="modal-overlay ds-modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3 class="modal-title ds-modal-title ds-modal-title--gold">
  {{ randomMessage }}
</h3>

      <div class="modal-actions ds-modal-actions">
  <button
    @click="$emit('confirm')"
    class="ds-modal-action-btn ds-modal-action-btn--danger"
    type="button"
  >
    <Check :size="20" />
    <span>Confirm</span>
  </button>

  <button
    @click="$emit('close')"
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

defineEmits(['confirm', 'close']);

const messages = [
  "We don't need this anymore?",
  'Trash it?',
  'Straight to MA48?',
];

const randomMessage = ref('');

onMounted(() => {
  randomMessage.value = messages[Math.floor(Math.random() * messages.length)];
});
</script>

<style scoped>

.modal-content {
  width: min(var(--ds-container-xs), calc(100vw - 2rem));
  padding: var(--ds-space-6);
  border-radius: var(--ds-radius-lg);
  border: 1px solid rgba(255, 107, 107, 0.28);
  background: var(--ds-gradient-panel);
  box-shadow: var(--ds-shadow-soft), var(--ds-shadow-glow);
  text-align: center;
}

.modal-title {
  margin: 0 0 var(--ds-space-6);
}
@media (max-width: 480px) {
  .modal-content {
    width: min(var(--ds-container-xs), calc(100vw - 1.25rem));
    padding: var(--ds-space-5) var(--ds-space-4);
  }

  @media (max-width: 480px) {
  .modal-title {
    margin-bottom: var(--ds-space-5);
  }
}
}
</style>