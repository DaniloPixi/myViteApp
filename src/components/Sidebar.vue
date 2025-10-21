<template>
  <div class="collapsible-filters-container">
    <div class="filter-wrapper">
      <div class="filter-content" :class="{ 'expanded': isExpanded }">
        <div class="content-inner">

          <!-- Row 1: Location & Hashtags -->
          <div class="filter-row">
            <div class="filter-group location-group">
              <input id="location-filter" type="text" :value="location" @input="$emit('update:location', $event.target.value)" placeholder="Location..." />
            </div>
            <div class="filter-group hashtags-group">
              <div class="hashtag-buttons">
                <button v-for="tag in availableHashtags" :key="tag" @click="toggleHashtagFilter(tag)" :class="{ selected: hashtags === tag }">#{{ tag }}</button>
              </div>
            </div>
          </div>

          <!-- Row 2: Date, Time & Duration -->
          <div class="filter-row">
            <div class="filter-group date-group">
              <div class="date-input-wrapper">
                <input id="date-filter" type="date" :value="date" @input="$emit('update:date', $event.target.value)" placeholder="Date..." />
                <button v-if="date" @click="$emit('update:date', '')" class="clear-btn" title="Clear filter">×</button>
              </div>
            </div>
            <div class="filter-group time-group">
              <div class="time-input-wrapper">
                <StyledTimeInput :modelValue="time" @update:modelValue="$emit('update:time', $event)" />
                <button v-if="time" @click="$emit('update:time', '')" class="clear-btn" title="Clear filter">×</button>
              </div>
            </div>
            <div class="filter-group duration-group">
              <div class="duration-buttons">
                <button v-for="d in availableDurations" :key="d" @click="toggleDurationFilter(d)" :class="{ selected: duration.includes(d) }">{{ d === 'Indetermined' ? '∞' : d }}</button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <button class="toggle-handle" @click="isExpanded = !isExpanded" :class="{ 'expanded': isExpanded }">
        <span class="arrow">▼</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import StyledTimeInput from './StyledTimeInput.vue';

const isExpanded = ref(false);

const props = defineProps(['location', 'hashtags', 'date', 'time', 'duration']);
const emit = defineEmits(['update:location', 'update:hashtags', 'update:date', 'update:time', 'update:duration']);

const availableHashtags = ref(['date', 'party', 'food', '18+', 'travel', 'weekend', 'chill', 'friends', 'love', 'random']);
const toggleHashtagFilter = (tag) => emit('update:hashtags', props.hashtags === tag ? '' : tag);

const availableDurations = ref(['All day', 'All night', 'Indetermined']);
const toggleDurationFilter = (d) => {
  const newDurations = Array.isArray(props.duration) ? [...props.duration] : (props.duration ? [props.duration] : []);
  const index = newDurations.indexOf(d);
  if (index > -1) {
    newDurations.splice(index, 1);
  } else {
    newDurations.push(d);
  }
  emit('update:duration', newDurations);
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

.collapsible-filters-container {
  position: relative;
  height: 26px;
  z-index: 11;
  margin-bottom: 2rem;
}

.filter-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  background-color: transparent;
  transition: all 0.3s ease-in-out;
}

.filter-content {
  max-height: 0;
  overflow: hidden;
  background: #000;
  border-radius: 12px;
  border: 1px solid rgba(255, 0, 255, 0);
  box-shadow: 0 0 15px rgba(255, 0, 255, 0);
  will-change: max-height;
  transform: translateZ(0);
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: 0;
  padding-bottom: 0;
  transition: max-height 1.2s ease-out, padding-top 1.2s ease-out, padding-bottom 1.2s ease-out, border-color 1.2s ease-out, box-shadow 1.2s ease-out;
}

.filter-content.expanded {
  max-height: 280px;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  border-color: magenta;
  box-shadow: 0 0 15px rgba(255, 0, 255, 0.4);
}

.content-inner {
  opacity: 0;
  transform: translateY(-15px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  pointer-events: none;
}

.filter-content.expanded .content-inner {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
  transition-delay: 0.4s;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
}
.filter-row:last-child { margin-bottom: 0; }

.filter-group {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.location-group { flex-basis: 180px; }
.hashtags-group { flex-basis: 300px; flex-grow: 2; }
.date-group { flex-basis: 130px; }
.time-group { flex-basis: 120px; }
.duration-group { flex-basis: 220px; flex-grow: 2; }

.filter-group input[type="text"],
.filter-group input[type="date"] {
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
}

.filter-group input:focus {
    outline: none;
    box-shadow: inset 0 0 8px rgba(64, 224, 208, 0.8), 0 0 8px rgba(64, 224, 208, 0.8);
}

.hashtag-buttons, .duration-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.hashtag-buttons button,
.duration-buttons button {
  padding: 0.4em 0.8em;
  border-radius: 15px;
  border: 1px solid turquoise;
  background-color: #000;
  color: turquoise;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8em;
  box-shadow: inset 0 0 4px rgba(64, 224, 208, 0.5), 0 0 4px rgba(64, 224, 208, 0.5);
}

.hashtag-buttons button:hover, 
.duration-buttons button:hover { 
  box-shadow: inset 0 0 8px rgba(64, 224, 208, 0.8), 0 0 8px rgba(64, 224, 208, 0.8);
}

.hashtag-buttons button.selected,
.duration-buttons button.selected {
  background-color: turquoise;
  border-color: turquoise;
  color: #000;
  font-weight: 600;
  box-shadow: 0 0 10px turquoise;
}

.date-input-wrapper, .time-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  justify-content: center;
}

.clear-btn { 
  background: none; 
  border: none; 
  color: #aaa; 
  font-size: 1.1em; 
  cursor: pointer; 
  padding: 0;
  line-height: 1;
  text-shadow: 0 0 5px #aaa;
}

.toggle-handle {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 75px;
  height: 26px;
  margin: 0 auto;
  background: black;
  border: 1px solid magenta;
  border-top: none;
  border-bottom-left-radius: 35px;
  border-bottom-right-radius: 35px;
  cursor: pointer;
  color: magenta;
  box-shadow: 0 5px 15px rgba(255, 0, 255, 0.3);
  transition: all 0.3s ease;
}

.toggle-handle:hover {
  box-shadow: 0 5px 20px rgba(255, 0, 255, 0.5);
  border-color: magenta;
  border-top: none;
}

.toggle-handle:focus, .toggle-handle:focus-visible { outline: none; }

.arrow { transition: transform 1.2s ease-out; }

.toggle-handle.expanded .arrow { transform: rotate(180deg); }

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .filter-group { flex-basis: auto !important; width: 100%; }

  .filter-content.expanded { max-height: 500px; }

  .hashtag-buttons, .duration-buttons { justify-content: center; }
}
</style>