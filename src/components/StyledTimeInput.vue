<template>
  <div class="styled-time-input-wrapper">
    <input 
      type="time"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      class="styled-time-input"
    />
  </div>
</template>

<script setup>
  defineProps(['modelValue']);
  defineEmits(['update:modelValue']);
</script>

<style scoped>
.styled-time-input-wrapper {
  position: relative;
  display: inline-block;
}

.styled-time-input {
  box-sizing: border-box;
  width: 100%;
  padding: 0.6em 0.8em;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: #000;
  color: turquoise;
  font-size: 0.9em;
  font-family: inherit;
  text-align: center;
  box-shadow: inset 0 0 5px rgba(64, 224, 208, 0.5), 0 0 5px rgba(64, 224, 208, 0.5);
  transition: box-shadow 0.3s ease;
  -webkit-appearance: none; /* Remove default styling */
  -moz-appearance: textfield; /* Firefox */
}

.styled-time-input:focus {
  outline: none;
  box-shadow: inset 0 0 8px rgba(64, 224, 208, 0.8), 0 0 8px rgba(64, 224, 208, 0.8);
}

/* Style the clock icon */
.styled-time-input::-webkit-calendar-picker-indicator {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="turquoise" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>');
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.styled-time-input::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}
</style>