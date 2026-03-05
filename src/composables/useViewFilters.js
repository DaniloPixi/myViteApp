import { computed, ref, watch } from 'vue';

export function useViewFilters() {
  const currentView = ref(localStorage.getItem('currentView') || 'home');

  const locationFilter = ref('');
  const hashtagFilter = ref('');
  const dateFilter = ref('');
  const timeFilter = ref('');
  const durationFilter = ref([]);
  const lockStatusFilter = ref('');

  const enabledFilters = computed(() => {
    if (currentView.value === 'memos') {
      return ['location', 'hashtags', 'date'];
    }
    if (currentView.value === 'plans') {
      return ['location', 'hashtags', 'date', 'time', 'duration'];
    }
    if (currentView.value === 'capsules') {
      return ['date', 'lockStatus'];
    }
    return [];
  });

  watch(currentView, (newView) => {
    localStorage.setItem('currentView', newView);
    locationFilter.value = '';
    hashtagFilter.value = '';
    dateFilter.value = '';
    timeFilter.value = '';
    durationFilter.value = [];
    lockStatusFilter.value = '';
  });

  return {
    currentView,
    locationFilter,
    hashtagFilter,
    dateFilter,
    timeFilter,
    durationFilter,
    lockStatusFilter,
    enabledFilters,
  };
}
