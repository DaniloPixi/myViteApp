<template>
    <div class="location-autocomplete">
      <label v-if="label" class="ds-label" :for="inputId">{{ label }}</label>
  
      <input
        :id="inputId"
        :value="modelValue"
        type="text"
        class="ds-input"
        :placeholder="placeholder"
        autocomplete="off"
        @input="onInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />
  
      <div v-if="isSearching" class="location-status">Searching places…</div>
  
      <ul v-if="showSuggestions && suggestions.length" class="location-suggestions">
        <li v-for="item in suggestions" :key="item.id">
          <button type="button" class="location-suggestion-btn" @mousedown.prevent="selectSuggestion(item)">
            <span class="location-suggestion-title">{{ item.mainText }}</span>
            <span class="location-suggestion-subtitle">{{ item.secondaryText }}</span>
          </button>
        </li>
      </ul>
  
      <div class="location-actions">
        <button
          type="button"
          class="ds-chip"
          :disabled="!trimmedLabel || isLocating"
          @click="useCurrentLocation"
        >
          {{ isLocating ? 'Locating…' : 'Use current location for this name' }}
        </button>
      </div>
  
      <p v-if="statusMessage" class="location-status">{{ statusMessage }}</p>
      <p v-if="errorMessage" class="error-message ds-alert ds-alert--danger ds-alert--compact">{{ errorMessage }}</p>
    </div>
  </template>
  
  <script setup>
  import { computed, ref } from 'vue';
  import { searchLocationSuggestions, sanitizeLocationLabel } from '../composables/useLocationGeocoding';
  
  const props = defineProps({
    modelValue: { type: String, default: '' },
    coords: { type: Object, default: null },
    label: { type: String, default: 'Location' },
    placeholder: { type: String, default: 'Search place or type a custom label' },
    inputId: { type: String, default: 'location-input' },
  });
  
  const emit = defineEmits(['update:modelValue', 'update:coords']);
  
  const suggestions = ref([]);
  const isSearching = ref(false);
  const isLocating = ref(false);
  const errorMessage = ref('');
  const statusMessage = ref('');
  const showSuggestions = ref(false);
  let searchTimer = null;
  
  const trimmedLabel = computed(() => sanitizeLocationLabel(props.modelValue));
  
  const onInput = (event) => {
    const nextValue = event.target.value;
    emit('update:modelValue', nextValue);
    emit('update:coords', null);
    statusMessage.value = '';
    errorMessage.value = '';
  
    if (searchTimer) clearTimeout(searchTimer);
  
    const q = sanitizeLocationLabel(nextValue);
    if (q.length < 3) {
      suggestions.value = [];
      showSuggestions.value = false;
      return;
    }
  
    searchTimer = setTimeout(async () => {
      isSearching.value = true;
      const result = await searchLocationSuggestions(q);
      suggestions.value = result;
      showSuggestions.value = true;
      isSearching.value = false;
    }, 250);
  };
  
  const selectSuggestion = (item) => {
    emit('update:modelValue', item.label);
    emit('update:coords', {
      lat: item.lat,
      lng: item.lng,
      placeName: item.label,
      source: 'geocode',
    });
  
    statusMessage.value = 'Place linked to map coordinates.';
    errorMessage.value = '';
    suggestions.value = [];
    showSuggestions.value = false;
  };
  
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      errorMessage.value = 'Geolocation is not supported on this device.';
      return;
    }
  
    isLocating.value = true;
    errorMessage.value = '';
  
    navigator.geolocation.getCurrentPosition(
      (position) => {
        emit('update:coords', {
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
          placeName: trimmedLabel.value,
          source: 'custom',
        });
        statusMessage.value = 'Custom place linked to your current GPS coordinates.';
        isLocating.value = false;
      },
      (err) => {
        errorMessage.value = err?.message || 'Unable to get your location.';
        isLocating.value = false;
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  
  const handleBlur = () => {
    setTimeout(() => {
      showSuggestions.value = false;
    }, 150);
  };
  
  const handleFocus = () => {
    showSuggestions.value = suggestions.value.length > 0;
  };
  </script>
  
  <style scoped>
  .location-autocomplete { position: relative; }
  .location-suggestions {
    margin: 0.4rem 0 0;
    padding: 0.3rem;
    list-style: none;
    border: 1px solid rgba(0, 255, 255, 0.45);
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.9);
    max-height: 220px;
    overflow-y: auto;
  }
  .location-suggestion-btn {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    color: #fff;
    padding: 0.4rem;
    cursor: pointer;
  }
  .location-suggestion-subtitle {
    display: block;
    opacity: 0.7;
    font-size: 0.8rem;
  }
  .location-actions { margin-top: 0.55rem; }
  .location-status {
    margin-top: 0.4rem;
    opacity: 0.75;
    font-size: 0.85rem;
  }
  </style>