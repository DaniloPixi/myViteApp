<template>
  <div class="collapsible-filters">
    <!-- This header is the button that the user clicks -->
    <div class="filter-header" @click="isExpanded = !isExpanded">
      <span>Filters</span>
      <span class="arrow" :class="{ 'expanded': isExpanded }">▼</span>
    </div>

    <!-- This is the content that collapses/expands -->
    <div class="filter-content" :class="{ 'expanded': isExpanded }">
      <div class="content-inner">
        <div class="filter-group">
          <label for="location-filter">Location</label>
          <input id="location-filter" type="text" :value="location" @input="$emit('update:location', $event.target.value)" placeholder="Filter by location..." />
        </div>
        <div class="filter-group">
          <label for="hashtag-filter">Hashtag</label>
          <input id="hashtag-filter" type="text" :value="hashtags" @input="$emit('update:hashtags', $event.target.value)" placeholder="Filter by hashtag..." />
        </div>
        <div class="filter-group">
          <label for="date-filter">Date</label>
          <input id="date-filter" type="date" :value="date" @input="$emit('update:date', $event.target.value)" />
        </div>
        <div class="filter-group">
            <label for="time-filter">Time</label>
            <input id="time-filter" type="text" :value="time" @input="$emit('update:time', $event.target.value)" placeholder="e.g., 8 PM, All day" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// By default, the filters are not expanded (they are collapsed).
const isExpanded = ref(false);

defineProps([
  'location',
  'hashtags',
  'date',
  'time',
]);

defineEmits([
  'update:location',
  'update:hashtags',
  'update:date',
  'update:time'
]);
</script>

<style scoped>
.collapsible-filters {
  margin-bottom: 2rem;
  border-radius: 12px;
  background: #1e1e1e;
  border: 1px solid #444;
  overflow: hidden; /* This is crucial for the collapse effect */
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
  user-select: none; /* Prevents text selection on click */
}

.filter-header span {
  color: #42b883;
  font-size: 1.2em;
  font-weight: 600;
}

.arrow {
  transition: transform 0.3s ease;
}

.arrow.expanded {
  transform: rotate(180deg);
}

.filter-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease-out;
}

.filter-content.expanded {
  max-height: 500px; /* Adjust if your content is taller */
}

.content-inner {
  padding: 0 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid #444;
}

.filter-group {
  margin-top: 1.5rem;
}

.filter-group:first-child {
  margin-top: 1.5rem;
}

.filter-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ccc;
  font-weight: 500;
}

.filter-group input {
  width: 100%;
  padding: 0.7em 1em;
  border-radius: 8px;
  border: 1px solid #444;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 1em;
  box-sizing: border-box;
}

.filter-group input::placeholder {
  color: #666;
}
</style>
