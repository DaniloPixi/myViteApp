<template>
  <div class="collapsible-filters-container">
    <div class="filter-wrapper">
      <div class="filter-content" :class="{ expanded: isExpanded }">
        <div class="content-inner">
          <!-- Row 1: Location & Hashtags -->
          <div class="filter-row">
            <div v-if="showLocation" class="filter-group location-group">
              <input
                id="location-filter"
                class="filter-input"
                type="text"
                :value="location"
                @input="$emit('update:location', $event.target.value)"
                placeholder="Location..."
              />
            </div>

            <div v-if="showHashtags" class="filter-group hashtags-group">
              <div class="chip-group">
                <button
                  v-for="tag in availableHashtags"
                  :key="tag"
                  type="button"
                  class="filter-chip"
                  :class="{ 'is-selected': hashtags === tag }"
                  @click="toggleHashtagFilter(tag)"
                >
                  #{{ tag }}
                </button>
              </div>
            </div>
          </div>

          <!-- Row 2: Date, Time & Duration -->
          <div class="filter-row">
            <div v-if="showDate" class="filter-group date-group">
              <div class="input-with-clear">
                <input
                  id="date-filter"
                  class="filter-input filter-input--compact"
                  type="date"
                  :value="date"
                  @input="$emit('update:date', $event.target.value)"
                  placeholder="Date..."
                />
                <button
                  v-if="date"
                  type="button"
                  class="clear-btn"
                  title="Clear filter"
                  @click="$emit('update:date', '')"
                >
                  ×
                </button>
              </div>
            </div>

            <div v-if="showTime" class="filter-group time-group">
              <div class="input-with-clear">
                <StyledTimeInput
                  :modelValue="time"
                  @update:modelValue="$emit('update:time', $event)"
                />
                <button
                  v-if="time"
                  type="button"
                  class="clear-btn"
                  title="Clear filter"
                  @click="$emit('update:time', '')"
                >
                  ×
                </button>
              </div>
            </div>

            <div v-if="showDuration" class="filter-group duration-group">
              <div class="chip-group">
                <button
                  v-for="d in availableDurations"
                  :key="d"
                  type="button"
                  class="filter-chip"
                  :class="{ 'is-selected': Array.isArray(duration) && duration.includes(d) }"
                  @click="toggleDurationFilter(d)"
                >
                  {{ d === 'Indetermined' ? '∞' : d }}
                </button>
              </div>
            </div>
          </div>

          <!-- Row 3: Lock Status -->
          <div v-if="showLockStatus" class="filter-row">
            <div class="filter-group lock-status-group">
              <div class="chip-group">
                <button
                  type="button"
                  class="filter-chip"
                  :class="{ 'is-selected': !lockStatus }"
                  @click="setLockStatus('')"
                >
                  All
                </button>
                <button
                  type="button"
                  class="filter-chip"
                  :class="{ 'is-selected': lockStatus === 'locked' }"
                  @click="setLockStatus('locked')"
                >
                  Locked
                </button>
                <button
                  type="button"
                  class="filter-chip"
                  :class="{ 'is-selected': lockStatus === 'unlocked' }"
                  @click="setLockStatus('unlocked')"
                >
                  Unlocked
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="toggle-handle"
        :class="{ expanded: isExpanded }"
        @click="isExpanded = !isExpanded"
      >
        <span class="arrow">▼</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import StyledTimeInput from './StyledTimeInput.vue';

const isExpanded = ref(false);

const props = defineProps({
  location: {
    type: String,
    default: '',
  },
  hashtags: {
    type: String,
    default: '',
  },
  date: {
    type: String,
    default: '',
  },
  time: {
    type: String,
    default: '',
  },
  duration: {
    type: [Array, String],
    default: () => [],
  },
  lockStatus: {
    type: String,
    default: '',
  },
  enabledFilters: {
    type: Array,
    default: () => ['location', 'hashtags', 'date', 'time', 'duration'],
  },
});

const emit = defineEmits([
  'update:location',
  'update:hashtags',
  'update:date',
  'update:time',
  'update:duration',
  'update:lockStatus',
]);

const showLocation = computed(() => props.enabledFilters.includes('location'));
const showHashtags = computed(() => props.enabledFilters.includes('hashtags'));
const showDate = computed(() => props.enabledFilters.includes('date'));
const showTime = computed(() => props.enabledFilters.includes('time'));
const showDuration = computed(() => props.enabledFilters.includes('duration'));
const showLockStatus = computed(() => props.enabledFilters.includes('lockStatus'));

const availableHashtags = ref([
  'date',
  'party',
  'food',
  '18+',
  'travel',
  'weekend',
  'chill',
  'friends',
  'love',
  'random',
]);

const toggleHashtagFilter = (tag) => {
  emit('update:hashtags', props.hashtags === tag ? '' : tag);
};

const availableDurations = ref(['All day', 'All night', 'Indetermined']);

const toggleDurationFilter = (d) => {
  const newDurations = Array.isArray(props.duration)
    ? [...props.duration]
    : props.duration
      ? [props.duration]
      : [];

  const index = newDurations.indexOf(d);
  if (index > -1) {
    newDurations.splice(index, 1);
  } else {
    newDurations.push(d);
  }

  emit('update:duration', newDurations);
};

const setLockStatus = (value) => {
  emit('update:lockStatus', value);
};
</script>

<style scoped>
.collapsible-filters-container {
  position: relative;
  height: 2rem;
  z-index: 11;
  margin-bottom: var(--ds-space-6);
}

.filter-wrapper {
  position: absolute;
  inset: 0 0 auto;
  width: 100%;
  transition: all var(--ds-transition-base);
}

.filter-content {
  max-height: 0;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.88);
  border-radius: var(--ds-radius-md);
  border: 1px solid transparent;
  box-shadow: 0 0 0 rgba(255, 0, 255, 0);
  will-change: max-height;
  transform: translateZ(0);
  padding: 0 var(--ds-space-5);
  transition:
    max-height 1.05s ease,
    padding-top 1.05s ease,
    padding-bottom 1.05s ease,
    border-color 1.05s ease,
    box-shadow 1.05s ease;
}

.filter-content.expanded {
  max-height: 24rem;
  padding-top: var(--ds-space-5);
  padding-bottom: var(--ds-space-5);
  border-color: rgba(255, 79, 233, 0.55);
  box-shadow:
    0 0 16px rgba(255, 79, 233, 0.24),
    0 0 22px rgba(0, 247, 255, 0.12);
}

.content-inner {
  opacity: 0;
  transform: translateY(-0.9rem);
  transition:
    opacity 0.6s ease,
    transform 0.6s ease;
  pointer-events: none;
}

.filter-content.expanded .content-inner {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
  transition-delay: 0.2s;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-4);
  margin-bottom: var(--ds-space-4);
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-group {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.location-group {
  flex-basis: 180px;
}
.hashtags-group {
  flex-basis: 300px;
  flex-grow: 2;
}
.date-group {
  flex-basis: 130px;
}
.time-group {
  flex-basis: 120px;
}
.duration-group {
  flex-basis: 220px;
  flex-grow: 2;
}
.lock-status-group {
  flex-basis: 200px;
}

.filter-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.7rem 0.9rem;
  border-radius: var(--ds-radius-sm);
  border: 1px solid transparent;
  background: rgba(0, 0, 0, 0.8);
  color: var(--ds-color-accent-cyan);
  font: inherit;
  font-size: var(--ds-text-sm);
  text-align: center;
  box-shadow:
    inset 0 0 5px rgba(64, 224, 208, 0.45),
    0 0 5px rgba(64, 224, 208, 0.28);
  transition:
    box-shadow var(--ds-transition-base),
    border-color var(--ds-transition-base);
}

.filter-input--compact {
  padding: 0.65rem 0.85rem;
}

.filter-input:focus {
  outline: none;
  border-color: rgba(0, 247, 255, 0.42);
  box-shadow:
    inset 0 0 8px rgba(64, 224, 208, 0.72),
    0 0 9px rgba(64, 224, 208, 0.4);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--ds-space-2);
}

.filter-chip {
  min-height: 2rem;
  padding: 0.45rem 0.9rem;
  border-radius: var(--ds-radius-pill);
  border: 1px solid rgba(0, 247, 255, 0.48);
  background: rgba(0, 0, 0, 0.72);
  color: var(--ds-color-accent-cyan);
  font: inherit;
  font-size: var(--ds-text-sm);
  line-height: 1;
  cursor: pointer;
  box-shadow:
    inset 0 0 4px rgba(64, 224, 208, 0.38),
    0 0 4px rgba(64, 224, 208, 0.28);
  transition:
    transform var(--ds-transition-fast),
    box-shadow var(--ds-transition-base),
    border-color var(--ds-transition-base),
    background-color var(--ds-transition-base),
    color var(--ds-transition-base);
}

.filter-chip:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 0 8px rgba(64, 224, 208, 0.65),
    0 0 8px rgba(64, 224, 208, 0.42);
}

.filter-chip.is-selected {
  background: rgba(0, 247, 255, 0.95);
  border-color: rgba(0, 247, 255, 1);
  color: #020305;
  font-weight: 600;
  box-shadow: 0 0 12px rgba(0, 247, 255, 0.42);
}

.input-with-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.clear-btn {
  border: none;
  background: none;
  color: var(--ds-color-text-soft);
  font-size: 1.1rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.18);
  transition:
    color var(--ds-transition-base),
    transform var(--ds-transition-fast);
}

.clear-btn:hover {
  color: var(--ds-color-accent-gold);
  transform: scale(1.06);
}

.toggle-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.75rem;
  height: 1.65rem;
  margin: 0 auto;
  background: rgba(0, 0, 0, 0.94);
  color: var(--ds-color-accent-magenta);
  border: 1px solid rgba(255, 79, 233, 0.72);
  border-top: none;
  border-bottom-left-radius: 2.2rem;
  border-bottom-right-radius: 2.2rem;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(255, 79, 233, 0.24);
  transition:
    box-shadow var(--ds-transition-base),
    border-color var(--ds-transition-base),
    color var(--ds-transition-base);
}

.toggle-handle:hover {
  border-color: rgba(255, 79, 233, 0.95);
  box-shadow:
    0 5px 20px rgba(255, 79, 233, 0.34),
    0 0 14px rgba(0, 247, 255, 0.12);
}

.toggle-handle:focus,
.toggle-handle:focus-visible {
  outline: none;
}

.arrow {
  transition: transform 1.05s ease;
}

.toggle-handle.expanded .arrow {
  transform: rotate(180deg);
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: stretch;
    gap: var(--ds-space-3);
  }

  .filter-group {
    flex: 1 1 calc(50% - var(--ds-space-3));
    min-width: 140px;
    width: auto;
  }

  .hashtags-group,
  .duration-group,
  .lock-status-group {
    flex-basis: 100%;
  }

  .filter-content.expanded {
    max-height: 42rem;
  }

  .chip-group {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .filter-row {
    gap: var(--ds-space-2);
  }

  .filter-group {
    flex: 1 1 100%;
    min-width: 0;
  }

  .filter-content {
    padding-inline: var(--ds-space-4);
  }

  .filter-content.expanded {
    padding-top: var(--ds-space-4);
    padding-bottom: var(--ds-space-4);
  }
}
</style>
