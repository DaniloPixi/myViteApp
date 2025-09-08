<template>
  <div class="collapsible-filters">
    <div class="filter-content" :class="{ 'expanded': isExpanded }">
      <div class="content-inner">
        
        <div class="filter-group">
          <label for="location-filter">Location</label>
          <input id="location-filter" type="text" :value="location" @input="$emit('update:location', $event.target.value)" placeholder="Filter by location..." />
        </div>

        <div class="filter-group">
          <label>Hashtag</label>
          <div class="hashtag-buttons">
            <button
              v-for="tag in availableHashtags"
              :key="tag"
              @click="toggleHashtagFilter(tag)"
              :class="{ selected: hashtags === tag }"
            >
              #{{ tag }}
            </button>
          </div>
        </div>

        <!-- New Duration Button Filter -->
        <div class="filter-group">
          <label>Duration</label>
          <div class="duration-buttons">
            <button
              v-for="d in availableDurations"
              :key="d"
              @click="toggleDurationFilter(d)"
              :class="{ selected: duration === d }"
            >
              {{ d }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label for="date-filter">Date</label>
          <input id="date-filter" type="date" :value="date" @input="$emit('update:date', $event.target.value)" />
        </div>
        
        <div class="filter-group">
            <label>Time (Hour)</label>
            <div class="stepper-input">
                <input 
                  type="text" 
                  class="hour-display"
                  :value="time"
                  @input="handleTimeInput"
                  @blur="handleTimeBlur"
                  maxlength="2"
                  placeholder="--"
                />
                <div class="stepper-controls">
                    <button @click="incrementHour">▲</button>
                    <button @click="decrementHour">▼</button>
                </div>
                <button v-if="time" @click="clearTimeFilter" class="clear-btn" title="Clear filter">×</button>
            </div>
        </div>

      </div>
    </div>

    <button class="toggle-handle" @click="isExpanded = !isExpanded" :class="{ 'expanded': isExpanded }">
      <span class="arrow">▼</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const isExpanded = ref(false);

const props = defineProps([
  'location',
  'hashtags',
  'date',
  'time',
  'duration',
]);

const emit = defineEmits([
  'update:location',
  'update:hashtags',
  'update:date',
  'update:time',
  'update:duration',
]);

// --- Hashtag Logic ---
const availableHashtags = ref(['date', 'party', 'food', '18+', 'travel', 'weekend', 'chill', 'friends', 'love', 'random']);
const toggleHashtagFilter = (tag) => {
  emit('update:hashtags', props.hashtags === tag ? '' : tag);
};

// --- Duration Logic ---
const availableDurations = ref(['All day', 'All night', 'Indetermined']);
const toggleDurationFilter = (d) => {
  emit('update:duration', props.duration === d ? '' : d);
};

// --- Time Filter Logic ---
const currentHour = computed(() => {
    return (props.time !== null && props.time !== '') ? parseInt(props.time, 10) : null;
});

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
        return;
    }
    const hour = parseInt(value, 10);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
        emit('update:time', value);
    }
};

const handleTimeBlur = () => {
    if (props.time && props.time.length === 1) {
        emit('update:time', props.time.padStart(2, '0'));
    }
};

const clearTimeFilter = () => {
    emit('update:time', '');
};

</script>

<style scoped>
/* ... styles are mostly unchanged ... */

.collapsible-filters {
  position: relative;
  padding-bottom: 20px; 
  margin-bottom: 2rem;
}

.filter-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease-out;
  background: #1e1e1e;
  border-radius: 12px;
  border: 1px solid #444;
}

.filter-content.expanded {
  max-height: 600px; /* Increased to accommodate new filters */
}

.content-inner {
  padding: 1.5rem;
  padding-bottom: 2.5rem; 
}

.toggle-handle {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 25px;
  background: #1e1e1e;
  border: 1px solid #444;
  border-top: none;
  border-bottom-left-radius: 25px;
  border-bottom-right-radius: 25px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #42b883;
}

.arrow {
  transition: transform 0.3s ease;
}

.toggle-handle.expanded .arrow {
  transform: rotate(180deg);
}

.filter-group {
  margin-bottom: 1.5rem;
}
.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ccc;
  font-weight: 500;
}

.filter-group > input {
  box-sizing: border-box;
  width: 100%;
  padding: 0.8em 1em;
  border-radius: 8px;
  border: 1px solid #444;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 1em;
  font-family: inherit;
}

/* Button Group Styles (shared by hashtags and durations) */
.hashtag-buttons,
.duration-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.hashtag-buttons button,
.duration-buttons button {
  padding: 0.5em 1em;
  border-radius: 20px;
  border: 1px solid #444;
  background-color: #333;
  color: #fff;
  cursor: pointer;
  transition: background-color 0.3s, border-color 0.3s;
  font-size: 0.9em;
}

.hashtag-buttons button:hover,
.duration-buttons button:hover {
  background-color: #555;
}

.hashtag-buttons button.selected,
.duration-buttons button.selected {
  background-color: #42b883;
  border-color: #42b883;
  font-weight: 600;
}


/* Odometer/Stepper Styles */
.stepper-input {
  display: flex;
  align-items: center;
  background-color: #1a1a1a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 0.3em 0.5em;
  width: fit-content;
}

.hour-display {
  background-color: transparent;
  border: none;
  color: #fff;
  font-size: 1.4em;
  font-weight: 600;
  text-align: center;
  width: 50px;
  padding: 0.2em 0;
  margin-right: 0.5rem;
  font-family: inherit;
}

.hour-display:focus {
  outline: none;
  background-color: #111;
  border-radius: 4px;
}

.hour-display::placeholder {
  color: #888;
  font-weight: 600;
}

.stepper-controls {
  display: flex;
  flex-direction: column;
}

.stepper-controls button {
  border: none;
  background: #333;
  color: #fff;
  cursor: pointer;
  width: 30px;
  height: 18px;
  font-size: 0.7em;
  line-height: 1;
  border-radius: 4px;
}
.stepper-controls button:first-child { margin-bottom: 3px; }

.clear-btn {
  background: none; border: none; color: #aaa; font-size: 1.5em; cursor: pointer; margin-left: 0.7rem;
}
</style>
