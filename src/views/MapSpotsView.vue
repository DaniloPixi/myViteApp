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
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const SPOT_SOURCE_ID = 'spot-source';
const SPOT_LAYER_ID = 'spot-layer';
const SPOT_GLOW_LAYER_ID = 'spot-layer-glow';

const mapRoot = ref(null);
const loading = ref(true);
const selectedSpotKey = ref('');
const memos = ref([]);
const plans = ref([]);
const mapLoadError = ref('');

const mapInstance = ref(null);
const mapIsLoaded = ref(false);
const listenerStatus = ref({
  memos: false,
  plans: false,
});

let resizeObserver = null;
const unsubscribers = [];

function markListenerReady(key) {
  listenerStatus.value[key] = true;
  if (listenerStatus.value.memos && listenerStatus.value.plans) {
    loading.value = false;
  }
}

function handleSnapshotError(error, collectionName) {
  console.error(`Failed to load ${collectionName}:`, error);
  mapLoadError.value = 'Could not load map data. Please refresh or check Firestore rules.';
  loading.value = false;
}

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

function tuneLabelVisibility(map) {
  const style = map.getStyle();
  const labelLayers = (style.layers || []).filter(
    (layer) =>
      layer.type === 'symbol' &&
      typeof layer.id === 'string' &&
      /(label|place|road|street)/i.test(layer.id),
  );

  for (const layer of labelLayers) {
    try {
      map.setLayerZoomRange(layer.id, 5, 24);
      map.setLayoutProperty(layer.id, 'text-size', [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 11,
        8, 13,
        11, 15,
        14, 18,
      ]);
      map.setPaintProperty(layer.id, 'text-color', '#e9f2ff');
      map.setPaintProperty(layer.id, 'text-halo-color', 'rgba(0,0,0,0.88)');
      map.setPaintProperty(layer.id, 'text-halo-width', 1.4);
    } catch (_) {
      // Some symbol layers may not support all properties.
    }
  }
}

function initMap() {
  if (!mapRoot.value || mapInstance.value) return;

  const map = new maplibregl.Map({
    container: mapRoot.value,
    style: MAP_STYLE_URL,
    center: [16.3738, 48.2082],
    zoom: 11,
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  map.on('load', () => {
    mapIsLoaded.value = true;
    tuneLabelVisibility(map);
    renderMarkers();
  });

  mapInstance.value = map;
}

function stabilizeMapLayout() {
  if (!mapInstance.value || !mapRoot.value) return;

  if (mapRoot.value.clientHeight < 120) {
    mapRoot.value.style.minHeight = '420px';
  }

  requestAnimationFrame(() => mapInstance.value?.resize());
  setTimeout(() => mapInstance.value?.resize(), 100);
  setTimeout(() => mapInstance.value?.resize(), 400);
}

function renderMarkers() {
  if (!mapInstance.value || !mapIsLoaded.value) return;

  const map = mapInstance.value;
  const features = groupedSpots.value.map((spot) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [spot.lng, spot.lat],
    },
    properties: {
      key: spot.key,
      title: spot.title,
      count: spot.count,
      primaryType: spot.items.plan.length ? 'plan' : 'memo',
      isSelected: selectedSpotKey.value === spot.key,
    },
  }));

  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  const existingSource = map.getSource(SPOT_SOURCE_ID);
  if (existingSource) {
    existingSource.setData(geojson);
  } else {
    map.addSource(SPOT_SOURCE_ID, {
      type: 'geojson',
      data: geojson,
    });

    map.addLayer({
      id: SPOT_GLOW_LAYER_ID,
      type: 'circle',
      source: SPOT_SOURCE_ID,
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'isSelected'], true],
          18,
          14,
        ],
        'circle-color': [
          'match',
          ['get', 'primaryType'],
          'memo',
          '#20e3ff',
          'plan',
          '#3ef06d',
          '#df6eff',
        ],
        'circle-opacity': [
          'case',
          ['==', ['get', 'isSelected'], true],
          0.42,
          0.24,
        ],
        'circle-blur': 0.9,
      },
    });

    map.addLayer({
      id: SPOT_LAYER_ID,
      type: 'circle',
      source: SPOT_SOURCE_ID,
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'isSelected'], true],
          11,
          8,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-color': [
          'case',
          ['==', ['get', 'isSelected'], true],
          '#ffd166',
          [
            'match',
            ['get', 'primaryType'],
            'memo',
            '#20e3ff',
            'plan',
            '#3ef06d',
            '#df6eff',
          ],
        ],
      },
    });

    map.on('click', SPOT_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      const key = feature?.properties?.key;
      if (!key) return;
      selectedSpotKey.value = key;
      renderMarkers();
    });

    map.on('mouseenter', SPOT_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', SPOT_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });
  }

  if (!features.length) return;

  const bounds = new maplibregl.LngLatBounds();
  for (const feature of features) {
    bounds.extend(feature.geometry.coordinates);
  }

  if (features.length === 1) {
    map.easeTo({ center: features[0].geometry.coordinates, zoom: 12 });
  } else {
    map.fitBounds(bounds, { padding: 30, duration: 500 });
  }

  if (!selectedSpotKey.value) {
    selectedSpotKey.value = groupedSpots.value[0].key;
    renderMarkers();
  }
}

async function ensureMapReady() {
  await nextTick();
  initMap();
  if (!mapInstance.value) return;

  if (resizeObserver && mapRoot.value) {
    resizeObserver.observe(mapRoot.value);
  }

  stabilizeMapLayout();
  renderMarkers();
}

onMounted(() => {
  const db = getFirestore();

  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'memos')),
      (snapshot) => {
        memos.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        markListenerReady('memos');
      },
      (error) => handleSnapshotError(error, 'memos'),
    ),
  );

  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'plans')),
      (snapshot) => {
        plans.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        markListenerReady('plans');
      },
      (error) => handleSnapshotError(error, 'plans'),
    ),
  );

  try {
    resizeObserver = new ResizeObserver(() => stabilizeMapLayout());
    if (mapRoot.value) resizeObserver.observe(mapRoot.value);
    window.addEventListener('resize', stabilizeMapLayout, { passive: true });
  } catch (error) {
    console.error('Map init failed:', error);
    mapLoadError.value = 'Map failed to initialize.';
  }
});

watch(
  loading,
  async (isLoading) => {
    if (isLoading) return;
    try {
      await ensureMapReady();
    } catch (error) {
      console.error('Map init failed:', error);
      mapLoadError.value = 'Map failed to initialize.';
    }
  },
  { immediate: true },
);

watch(groupedSpots, () => {
  if (!mapInstance.value) {
    ensureMapReady();
    return;
  }
  stabilizeMapLayout();
  renderMarkers();
});

watch(selectedSpotKey, () => {
  if (!mapInstance.value || !mapIsLoaded.value) return;
  renderMarkers();
});

onUnmounted(() => {
  unsubscribers.forEach((fn) => {
    if (typeof fn === 'function') fn();
  });

  if (mapInstance.value) {
    mapIsLoaded.value = false;
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

:deep(.maplibregl-canvas) {
  outline: none;
}

:deep(.maplibregl-ctrl-group) {
  background: rgba(11, 16, 32, 0.85);
  border: 1px solid rgba(64, 255, 255, 0.25);
}

:deep(.maplibregl-ctrl-group button span) {
  filter: invert(1) hue-rotate(165deg);
}

:deep(.maplibregl-ctrl-attrib) {
  font-size: 10px;
  background: rgba(4, 9, 18, 0.75);
  color: #9fb3c8;
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