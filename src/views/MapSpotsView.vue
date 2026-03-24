<template>
    <section class="map-spots-view">
      <header class="map-spots-header">
        <h1>Shared Map</h1>
        <p>Tap a spot to see all memos and plans linked to that place.</p>
      </header>
  
      <div v-if="loading" class="ds-state">
        <p class="ds-state-copy">Loading map spots...</p>
      </div>
  
      <div v-else class="map-spots-grid">
        <div>
          <div ref="mapRoot" class="map-canvas"></div>
          <p v-if="mapLoadError" class="map-error ds-alert ds-alert--danger ds-alert--compact">
            {{ mapLoadError }}
          </p>
          <p v-else-if="!groupedSpots.length" class="map-empty-note">
            No mapped spots yet. Add a memo/plan location to drop your first pin.
          </p>
        </div>
  
        <aside class="spot-sidebar">
          <template v-if="selectedSpot">
            <h2>{{ selectedSpot.title }}</h2>
            <p>{{ selectedSpot.count }} item(s)</p>
  
            <div v-if="selectedSpot.items.memo.length">
              <h3>Memos</h3>
              <ul>
                <li v-for="item in selectedSpot.items.memo" :key="item.id">{{ item.label }}</li>
              </ul>
            </div>
  
            <div v-if="selectedSpot.items.plan.length">
              <h3>Plans</h3>
              <ul>
                <li v-for="item in selectedSpot.items.plan" :key="item.id">{{ item.label }}</li>
              </ul>
            </div>
          </template>
  
          <p v-else class="spot-empty-copy">Select a marker to inspect linked moments.</p>
        </aside>
      </div>
    </section>
  </template>
  
  <script setup>
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
  import { collection, getFirestore, onSnapshot, query } from 'firebase/firestore';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  
  const mapRoot = ref(null);
  const loading = ref(true);
  const selectedSpotKey = ref('');
  const memos = ref([]);
  const plans = ref([]);
  const mapLoadError = ref('');
  
  const mapInstance = ref(null);
  const markerLayer = ref(null);
  
  let resizeObserver = null;
  const unsubscribers = [];
  
  function normalizeItem(type, raw) {
    const coords = raw?.locationCoords;
    if (!coords || !Number.isFinite(Number(coords.lat)) || !Number.isFinite(Number(coords.lng))) {
      return null;
    }
  
    const lat = Number(coords.lat);
    const lng = Number(coords.lng);
    const locationLabel = (raw.location || coords.placeName || 'Pinned place').trim();
  
    const labelByType = {
      memo: raw.description || 'Untitled memo',
      plan: raw.text || 'Untitled plan',
    };
  
    return {
      id: raw.id,
      type,
      lat,
      lng,
      locationLabel,
      label: labelByType[type],
    };
  }
  
  function buildSpotKey(lat, lng) {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }
  
  const groupedSpots = computed(() => {
    const bucket = new Map();
    const allItems = [
      ...memos.value.map((m) => normalizeItem('memo', m)),
      ...plans.value.map((p) => normalizeItem('plan', p)),
    ].filter(Boolean);
  
    for (const item of allItems) {
      const key = buildSpotKey(item.lat, item.lng);
      if (!bucket.has(key)) {
        bucket.set(key, {
          key,
          title: item.locationLabel,
          lat: item.lat,
          lng: item.lng,
          count: 0,
          items: { memo: [], plan: [] },
        });
      }
      const spot = bucket.get(key);
      spot.count += 1;
      spot.items[item.type].push(item);
    }
  
    return Array.from(bucket.values());
  });
  
  const selectedSpot = computed(() => {
    if (!selectedSpotKey.value) return null;
    return groupedSpots.value.find((spot) => spot.key === selectedSpotKey.value) || null;
  });
  
  function initMap() {
    if (!mapRoot.value || mapInstance.value) return;
  
    const map = L.map(mapRoot.value, { zoomControl: true }).setView([48.2082, 16.3738], 11);
  
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 20,
    }).addTo(map);
  
    mapInstance.value = map;
    markerLayer.value = L.layerGroup().addTo(map);
  }
  
  function stabilizeMapLayout() {
    if (!mapInstance.value || !mapRoot.value) return;
  
    if (mapRoot.value.clientHeight < 120) {
      mapRoot.value.style.minHeight = '420px';
    }
  
    requestAnimationFrame(() => mapInstance.value?.invalidateSize());
    setTimeout(() => mapInstance.value?.invalidateSize(), 100);
    setTimeout(() => mapInstance.value?.invalidateSize(), 400);
  }
  
  function colorByType(type) {
    if (type === 'memo') return '#20e3ff';
    if (type === 'plan') return '#3ef06d';
    return '#df6eff';
  }
  
  function renderMarkers() {
    if (!mapInstance.value || !markerLayer.value) return;
  
    markerLayer.value.clearLayers();
  
    if (!groupedSpots.value.length) return;
  
    const bounds = [];
  
    for (const spot of groupedSpots.value) {
      const primaryType = spot.items.plan.length ? 'plan' : 'memo';
  
      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius: 9,
        color: '#ffffff',
        fillColor: colorByType(primaryType),
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindTooltip(`${spot.title} (${spot.count})`)
        .on('click', () => {
          selectedSpotKey.value = spot.key;
        });
  
      marker.addTo(markerLayer.value);
      bounds.push([spot.lat, spot.lng]);
    }
  
    if (bounds.length === 1) {
      mapInstance.value.setView(bounds[0], 12);
    } else {
      mapInstance.value.fitBounds(bounds, { padding: [30, 30] });
    }
  
    if (!selectedSpotKey.value) {
      selectedSpotKey.value = groupedSpots.value[0].key;
    }
  }
  
  onMounted(async () => {
    const db = getFirestore();
  
    unsubscribers.push(
      onSnapshot(query(collection(db, 'memos')), (snapshot) => {
        memos.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        loading.value = false;
      }),
    );
  
    unsubscribers.push(
      onSnapshot(query(collection(db, 'plans')), (snapshot) => {
        plans.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        loading.value = false;
      }),
    );
  
    try {
      await nextTick();
      initMap();
      stabilizeMapLayout();
      renderMarkers();
  
      resizeObserver = new ResizeObserver(() => stabilizeMapLayout());
      if (mapRoot.value) resizeObserver.observe(mapRoot.value);
      window.addEventListener('resize', stabilizeMapLayout, { passive: true });
    } catch (error) {
      console.error('Map init failed:', error);
      mapLoadError.value = 'Map failed to initialize.';
    }
  });
  
  watch(groupedSpots, () => {
    if (!mapInstance.value) return;
    stabilizeMapLayout();
    renderMarkers();
  });
  
  onUnmounted(() => {
    unsubscribers.forEach((fn) => {
      if (typeof fn === 'function') fn();
    });
  
    if (mapInstance.value) {
      mapInstance.value.remove();
      mapInstance.value = null;
    }
  
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  
    window.removeEventListener('resize', stabilizeMapLayout);
  });
  </script>
  
  <style scoped>
  .map-spots-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 1rem;
  }
  
  .map-canvas {
    min-height: 420px;
    width: 100%;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(64, 255, 255, 0.4);
    background: #0d1117;
  }
  
  .spot-sidebar {
    border: 1px solid rgba(255, 0, 255, 0.3);
    border-radius: 14px;
    padding: 0.9rem;
    background: rgba(0, 0, 0, 0.2);
  }
  
  .spot-empty-copy {
    opacity: 0.8;
  }
  
  .map-empty-note {
    margin-top: 0.6rem;
    opacity: 0.75;
    font-size: 0.9rem;
  }
  
  .map-error {
    margin-top: 0.6rem;
  }
  
  @media (max-width: 900px) {
    .map-spots-grid {
      grid-template-columns: 1fr;
    }
  }
  </style>