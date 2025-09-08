<template>
  <div class="collapsible-filters-container">
    <div class="filter-wrapper">
      <div class="filter-content" :class="{ 'expanded': isExpanded }">
        <div class="content-inner">

          <!-- Row 1: Location & Hashtags -->
          <div class="filter-row">
            <div class="filter-group location-group">
              <label for="location-filter">Location</label>
              <input id="location-filter" type="text" :value="location" @input="$emit('update:location', $event.target.value)" placeholder="Filter by location..." />
            </div>
            <div class="filter-group hashtags-group">
              <label>Hashtags</label>
              <div class="hashtag-buttons">
                <button v-for="tag in availableHashtags" :key="tag" @click="toggleHashtagFilter(tag)" :class="{ selected: hashtags === tag }">#{{ tag }}</button>
              </div>
            </div>
          </div>

          <!-- Row 2: Date, Time & Duration -->
          <div class="filter-row">
            <div class="filter-group date-group">
              <label for="date-filter">Date</label>
              <div class="date-input-wrapper">
                <input id="date-filter" type="date" :value="date" @input="$emit('update:date', $event.target.value)" />
                <button v-if="date" @click="$emit('update:date', '')" class="clear-btn" title="Clear filter">×</button>
              </div>
            </div>
            <div class="filter-group time-group">
              <label>Time</label>
              <div class="time-input-wrapper">
                <div class="stepper-input">
                  <input type="text" class="hour-display" :value="time" @input="handleTimeInput" @blur="handleTimeBlur" maxlength="2" placeholder="--" />
                  <div class="stepper-controls">
                    <button @click="incrementHour">▲</button>
                    <button @click="decrementHour">▼</button>
                  </div>
                </div>
                <button v-if="time" @click="clearTimeFilter" class="clear-btn" title="Clear filter">×</button>
              </div>
            </div>
            <div class="filter-group duration-group">
              <label>Duration</label>
              <div class="duration-buttons">
                <button v-for="d in availableDurations" :key="d" @click="toggleDurationFilter(d)" :class="{ selected: duration.includes(d) }">{{ d }}</button>
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
import { ref, computed } from 'vue';

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

const currentHour = computed(() => (props.time ? parseInt(props.time, 10) : null));

const incrementHour = () => {
  let newHour = (currentHour.value === null || currentHour.value === 23) ? 0 : currentHour.value + 1;
  emit('update:time', newHour.toString().padStart(2, '0'));
};

const decrementHour = () => {
  let newHour = (currentHour.value === null || currentHour.value === 0) ? 23 : currentHour.value - 1;
  emit('update:time', newHour.toString().padStart(2, '0'));
};

const handleTimeInput = (event) => {
  const value = event.target.value.replace(/\D/g, '');
  if (value === '') {
    emit('update:time', '');
  } else {
    const hour = parseInt(value, 10);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) emit('update:time', value);
  }
};

const handleTimeBlur = () => {
  if (props.time && props.time.length === 1) emit('update:time', props.time.padStart(2, '0'));
};

const clearTimeFilter = () => emit('update:time', '');

</script>

<style scoped>
.collapsible-filters-container {
  position: relative;
  height: 26px; /* Defines the space the collapsed component takes up */
  z-index: 11;
  margin-bottom: 2rem;
}

.filter-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
}

.filter-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 1.2s ease-out;
  background: #1e1e1e;
  border-radius: 12px;
  border: 1px solid #444;
  will-change: max-height;
  transform: translateZ(0);
}

.filter-content.expanded {
  max-height: 280px; /* Adjust if content height changes */
}

.content-inner {
  padding: 0.8rem;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-bottom: 0.8rem;
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

.filter-group label {
  display: block;
  margin-bottom: 0.3rem;
  color: #ccc;
  font-weight: 500;
  font-size: 0.75em;
  text-align: center;
}

.filter-group input[type="text"],
.filter-group input[type="date"] {
  box-sizing: border-box;
  width: 100%;
  padding: 0.4em 0.6em;
  border-radius: 5px;
  border: 1px solid #444;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 0.8em;
  font-family: inherit;
  text-align: center;
}

.hashtag-buttons, .duration-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  justify-content: center;
}

.hashtag-buttons button,
.duration-buttons button {
  padding: 0.3em 0.7em;
  border-radius: 15px;
  border: 1px solid #444;
  background-color: #333;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75em;
}

.hashtag-buttons button:hover, 
.duration-buttons button:hover { background-color: #555; }

.hashtag-buttons button.selected,
.duration-buttons button.selected {
  background-color: #42b883;
  border-color: #42b883;
  font-weight: 600;
}

.date-input-wrapper, .time-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  justify-content: center;
}

.stepper-input {
  display: flex;
  align-items: center;
  background-color: #1a1a1a;
  border: 1px solid #444;
  border-radius: 5px;
  padding: 0.15em 0.3em;
}

.hour-display {
  background: transparent; border: none; color: #fff; font-size: 1.1em; font-weight: 600;
  text-align: center; width: 30px; padding: 0.1em 0; margin-right: 0.2rem;
}

.hour-display:focus { outline: none; }
.hour-display::placeholder { color: #888; }

.stepper-controls { display: flex; flex-direction: column; }
.stepper-controls button { border: none; background: #333; color: #fff; cursor: pointer; width: 20px; height: 12px; font-size: 0.5em; border-radius: 2px; }
.stepper-controls button:first-child { margin-bottom: 2px; }

.clear-btn { 
  background: none; 
  border: none; 
  color: #aaa; 
  font-size: 1.1em; 
  cursor: pointer; 
  padding: 0;
  line-height: 1;
}

.toggle-handle {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 75px;
  height: 26px;
  margin: 0 auto;
  background: transparent;
  border: 1px solid magenta;
  border-top: none;
  border-bottom-left-radius: 35px;
  border-bottom-right-radius: 35px;
  cursor: pointer;
  color: magenta;
}

.toggle-handle:hover {
  border: 1px solid magenta;
  border-top: none;
}

.toggle-handle:focus,
.toggle-handle:focus-visible {
  outline: none;
}

.arrow {
  transition: transform 1.2s ease-out;
}

.toggle-handle.expanded .arrow {
  transform: rotate(180deg);
}
</style>
