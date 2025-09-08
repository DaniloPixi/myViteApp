<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <div class="modal-actions">
        <button @click="$emit('confirm')" class="confirm-button">Confirm</button>
        <button @click="$emit('close')" class="cancel-button">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
});
defineEmits(['confirm', 'close']);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #1e1e1e;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #444;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
  max-width: 400px;
  width: 90%;
  text-align: center;
}

h3 {
  color: #42b883;
  margin-top: 0;
  margin-bottom: 1rem;
}

p {
  color: #ccc;
  margin-bottom: 2rem;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

button {
  padding: 0.7em 1.4em;
  border-radius: 30px;
  border: none;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.confirm-button {
  background-color: #ff6b6b;
  color: white;
}

.confirm-button:hover {
  background-color: #d9534f;
}

.cancel-button {
  background-color: #555;
  color: white;
}

.cancel-button:hover {
  background-color: #666;
}
</style>
