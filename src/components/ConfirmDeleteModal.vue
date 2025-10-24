<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3 class="cursive-title">{{ randomMessage }}</h3>
      <div class="modal-actions">
        <button @click="$emit('confirm')" class="confirm-button">
          <Check :size="20" />
          <span>Confirm</span>
        </button>
        <button @click="$emit('close')" class="cancel-button">
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
  "Trash it?",
  "Straight to MA48?",
];

const randomMessage = ref('');

onMounted(() => {
  randomMessage.value = messages[Math.floor(Math.random() * messages.length)];
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #03030369;
  padding: 2.5rem;
  border-radius: 15px;
  box-shadow: 0 0 27px rgba(235, 3, 184, 0.973), 0 0 35px rgba(44, 226, 208, 0.822);
  max-width: 420px;
  width: 90%;
  text-align: center;
  border: 1px solid #555;
}

.cursive-title {
  font-family: 'Great Vibes', cursive;
  font-size: 2.5rem;
  color: #eba101;
  margin-top: 0;
  margin-bottom: 2.5rem;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

button {
  padding: 0.8em 1.6em;
  border-radius: 50px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: transparent;
}

.confirm-button {
  border: 2px solid rgb(253, 8, 200);
  color: rgb(253, 8, 200);
}

.confirm-button:hover {
  background-color: rgba(253, 8, 200, 0.1);
  box-shadow: 0 0 15px rgba(253, 8, 200, 0.7);
  transform: translateY(-2px);
}

.cancel-button {
  border: 2px solid turquoise;
  color: turquoise;
}

.cancel-button:hover {
  background-color: rgba(64, 224, 208, 0.1);
  box-shadow: 0 0 15px rgba(64, 224, 208, 0.7);
  transform: translateY(-2px);
}
</style>
