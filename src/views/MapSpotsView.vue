<template>
  <section class="map-spots-view">
    <header class="map-spots-header">
      <h1>Shared Map</h1>
    </header>

    <div v-if="loading" class="ds-state">
      <p class="ds-state-copy">Loading map spots...</p>
    </div>

    <div v-else class="map-spots-stack">
      <div>
        <div ref="mapRoot" class="map-canvas"></div>

        <p v-if="mapLoadError" class="map-error ds-alert ds-alert--danger ds-alert--compact">
          {{ mapLoadError }}
        </p>

        <p v-else-if="!groupedSpots.length" class="map-empty-note">
          No mapped spots yet. Add a memo/plan location to drop your first pin.
        </p>
      </div>

      <aside class="spot-sidebar ds-card">
        <h2 class="ds-script-title">Locations</h2>

        <template v-if="cityGroups.length">
          <ul class="spot-location-list">
            <li
              v-for="spot in cityGroups"
              :key="spot.key"
              class="spot-location-item"
              :ref="(el) => registerLocationItemRef(spot.key, el)"
              :class="{
                'spot-location-item--active': selectedCityKey === spot.key,
                'spot-location-item--expanded': isSpotExpanded(spot.key),
              }"
            >
              <button
                type="button"
                class="spot-location-toggle"
                :aria-expanded="isSpotExpanded(spot.key)"
                @click="toggleSpot(spot)"
              >
                <span class="spot-location-meta">
                  <span class="spot-location-title">{{ spot.title }}</span>
                  <span class="spot-location-count">{{ spot.count }} item(s)</span>
                </span>
                <span
                  class="spot-location-chevron"
                  :class="{ 'spot-location-chevron--open': isSpotExpanded(spot.key) }"
                >
                  ▾
                </span>
              </button>

              <Transition name="spot-expand">
                <div v-if="isSpotExpanded(spot.key)" class="spot-location-dropdown">
                  <section v-if="spot.items.memo.length" class="spot-location-block">
                    <h3>Memos</h3>
                    <ul>
                      <li v-for="item in spot.items.memo" :key="item.id">
                        <button
                          type="button"
                          class="spot-link-button"
                          @click.stop="navigateToLinkedItem('memo', item.id)"
                        >
                          {{ item.label }}
                        </button>
                      </li>
                    </ul>
                  </section>

                  <section v-if="spot.items.plan.length" class="spot-location-block">
                    <h3>Plans</h3>
                    <ul>
                      <li v-for="item in spot.items.plan" :key="item.id">
                        <button
                          type="button"
                          class="spot-link-button"
                          @click.stop="navigateToLinkedItem('plan', item.id)"
                        >
                          {{ item.label }}
                        </button>
                      </li>
                    </ul>
                  </section>
                </div>
              </Transition>
            </li>
          </ul>
        </template>

        <p v-else class="spot-empty-copy">No mapped locations yet.</p>
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
const SPOT_COUNT_LAYER_ID = 'spot-layer-count';
const MAP_POPUP_CLASS = 'map-spot-popup';

const mapRoot = ref(null);
const loading = ref(true);
const selectedSpotKey = ref('');
const expandedSpotKeys = ref([]);
const memos = ref([]);
const plans = ref([]);
const mapLoadError = ref('');
const isTouchDevice = ref(false);

const mapInstance = ref(null);
const mapIsLoaded = ref(false);
const locationItemRefs = ref(new Map());
const listenerStatus = ref({
  memos: false,
  plans: false,
});

let resizeObserver = null;
const unsubscribers = [];
let hoverPopup = null;
let hoverCloseTimeout = null;
let isPointerInsidePopup = false;

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

function buildSpotKey(locationLabel, lat, lng) {
  return `${locationLabel}|${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function extractCityFromLocation(locationLabel) {
  if (!locationLabel) return 'Unknown city';

  const blockedCountryTokens = new Set([
    'austria',
    'österreich',
    'germany',
    'deutschland',
    'france',
    'italy',
    'spain',
    'united states',
    'usa',
    'uk',
    'united kingdom',
  ]);

  const streetHints =
    /(street|st\.?|road|rd\.?|gasse|straße|strasse|avenue|ave\.?|boulevard|blvd|lane|ln\.?|drive|dr\.?|way|platz)/i;
  const numericOrPostal = /^\d+[a-zA-Z-]*$/;

  const chunks = locationLabel
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const normalized = part.toLowerCase();
      if (blockedCountryTokens.has(normalized)) return false;
      if (numericOrPostal.test(normalized)) return false;
      return true;
    });

  if (!chunks.length) return 'Unknown city';

  for (let index = chunks.length - 1; index >= 0; index -= 1) {
    const candidate = chunks[index];
    if (!streetHints.test(candidate)) return candidate;
  }

  return chunks[chunks.length - 1];
}

const groupedSpots = computed(() => {
  const bucket = new Map();
  const allItems = [
    ...memos.value.map((m) => normalizeItem('memo', m)),
    ...plans.value.map((p) => normalizeItem('plan', p)),
  ].filter(Boolean);

  for (const item of allItems) {
    const key = buildSpotKey(item.locationLabel, item.lat, item.lng);
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

const cityGroups = computed(() => {
  const bucket = new Map();

  for (const spot of groupedSpots.value) {
    const cityTitle = extractCityFromLocation(spot.title);
    const cityKey = cityTitle.toLowerCase();
    if (!bucket.has(cityKey)) {
      bucket.set(cityKey, {
        key: cityKey,
        title: cityTitle,
        count: 0,
        spots: [],
        items: { memo: [], plan: [] },
      });
    }
    const group = bucket.get(cityKey);
    group.count += spot.count;
    group.spots.push(spot);
    group.items.memo.push(...spot.items.memo);
    group.items.plan.push(...spot.items.plan);
  }

  return Array.from(bucket.values()).sort((a, b) => a.title.localeCompare(b.title));
});

const selectedCityKey = computed(() => {
  if (!selectedSpotKey.value) return '';
  const spot = groupedSpots.value.find((entry) => entry.key === selectedSpotKey.value);
  if (!spot) return '';
  return extractCityFromLocation(spot.title).toLowerCase();
});

function isSpotExpanded(key) {
  return expandedSpotKeys.value.includes(key);
}

function registerLocationItemRef(key, element) {
  if (!key) return;
  if (!element) {
    locationItemRefs.value.delete(key);
    return;
  }
  locationItemRefs.value.set(key, element);
}

async function focusExpandedLocation(key) {
  await nextTick();
  const locationElement = locationItemRefs.value.get(key);
  if (!locationElement) return;

  locationElement.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  });

  const toggleButton = locationElement.querySelector('.spot-location-toggle');
  toggleButton?.focus({ preventScroll: true });
}

function toggleSpot(cityGroup) {
  const key = cityGroup.key;
  const isExpanded = isSpotExpanded(key);
  if (isExpanded) {
    expandedSpotKeys.value = expandedSpotKeys.value.filter((spotKey) => spotKey !== key);
  } else {
    expandedSpotKeys.value = [...expandedSpotKeys.value, key];
    focusExpandedLocation(key);
  }

  const firstSpot = cityGroup.spots?.[0];
  if (firstSpot) {
    selectedSpotKey.value = firstSpot.key;
  }

  if (cityGroup.spots?.length && mapInstance.value) {
    if (cityGroup.spots.length === 1) {
      mapInstance.value.easeTo({
        center: [cityGroup.spots[0].lng, cityGroup.spots[0].lat],
        duration: 450,
        zoom: Math.max(mapInstance.value.getZoom(), 11.5),
      });
    } else {
      const bounds = new maplibregl.LngLatBounds();
      for (const spot of cityGroup.spots) {
        bounds.extend([spot.lng, spot.lat]);
      }
      mapInstance.value.fitBounds(bounds, {
        padding: getFitPadding(),
        duration: 500,
        maxZoom: 13.5,
      });
    }
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function encodeForDataAttr(value) {
  return encodeURIComponent(String(value ?? ''));
}

function buildHoverPopupHtml(spot) {
  if (!spot) return '<strong>Pinned place</strong>';

  const memoItems = spot.items.memo
    .map(
      (item) => `
        <li>
          <button
            type="button"
            class="map-spot-popup-link"
            data-item-type="memo"
            data-item-id="${encodeForDataAttr(item.id)}"
          >
            ${escapeHtml(item.label)}
          </button>
        </li>`
    )
    .join('');
  const planItems = spot.items.plan
    .map(
      (item) => `
        <li>
          <button
            type="button"
            class="map-spot-popup-link"
            data-item-type="plan"
            data-item-id="${encodeForDataAttr(item.id)}"
          >
            ${escapeHtml(item.label)}
          </button>
        </li>`
    )
    .join('');

  const memoSection = memoItems
    ? `<div class="map-spot-popup__section"><h4>Memos</h4><ul>${memoItems}</ul></div>`
    : '';
  const planSection = planItems
    ? `<div class="map-spot-popup__section"><h4>Plans</h4><ul>${planItems}</ul></div>`
    : '';
  return `
    <div class="map-spot-popup__content">
      <strong>${escapeHtml(spot.title)}</strong>
      ${memoSection}
      ${planSection}
    </div>
  `;
}

function navigateToLinkedItem(type, id) {
  if (!id) return;
  window.dispatchEvent(
    new CustomEvent('map-spots-open-item', {
      detail: { type, id },
    })
  );
}

function clearHoverPopupCloseTimer() {
  if (!hoverCloseTimeout) return;
  clearTimeout(hoverCloseTimeout);
  hoverCloseTimeout = null;
}

function scheduleHoverPopupClose() {
  clearHoverPopupCloseTimer();
  hoverCloseTimeout = setTimeout(() => {
    if (isPointerInsidePopup) return;
    hoverPopup?.remove();
  }, 180);
}

function handlePopupContainerClick(event) {
  const button = event.target?.closest?.('.map-spot-popup-link');
  if (!button) return;
  const type = button.getAttribute('data-item-type');
  const encodedId = button.getAttribute('data-item-id') || '';
  const id = decodeURIComponent(encodedId);
  if (!type || !id) return;

  event.preventDefault();
  event.stopPropagation();
  navigateToLinkedItem(type, id);
  hoverPopup?.remove();
}

function handlePopupPointerOver(event) {
  if (!event.target?.closest?.('.map-spot-popup')) return;
  isPointerInsidePopup = true;
  clearHoverPopupCloseTimer();
}

function handlePopupPointerOut(event) {
  const fromPopup = event.target?.closest?.('.map-spot-popup');
  if (!fromPopup) return;
  const stillInPopup = event.relatedTarget?.closest?.('.map-spot-popup');
  if (stillInPopup) return;
  isPointerInsidePopup = false;
  scheduleHoverPopupClose();
}

function tuneLabelVisibility(map) {
  const style = map.getStyle();
  const labelLayers = (style.layers || []).filter(
    (layer) =>
      layer.type === 'symbol' &&
      typeof layer.id === 'string' &&
      /(label|place|road|street)/i.test(layer.id)
  );

  for (const layer of labelLayers) {
    try {
      map.setLayerZoomRange(layer.id, 4.5, 24);
      map.setLayoutProperty(layer.id, 'text-size', [
        'interpolate',
        ['linear'],
        ['zoom'],
        4,
        10.5,
        7,
        12.5,
        10,
        14.5,
        13,
        17.5,
      ]);
      map.setPaintProperty(layer.id, 'text-color', '#edf5ff');
      map.setPaintProperty(layer.id, 'text-halo-color', 'rgba(0,0,0,0.9)');
      map.setPaintProperty(layer.id, 'text-halo-width', 1.5);
      map.setPaintProperty(layer.id, 'text-halo-blur', 0.2);
    } catch (_) {
      // Layer may not support every text property
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
    antialias: false,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

  hoverPopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: MAP_POPUP_CLASS,
    offset: 14,
  });

  map.on('load', () => {
    mapIsLoaded.value = true;
    tuneLabelVisibility(map);
    renderMarkers();
  });

  const container = map.getContainer();
  container.addEventListener('click', handlePopupContainerClick);
  container.addEventListener('pointerover', handlePopupPointerOver);
  container.addEventListener('pointerout', handlePopupPointerOut);

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

function getFitPadding() {
  const mobile = window.matchMedia('(max-width: 900px)').matches;
  if (mobile) return 28;
  return { top: 28, bottom: 28, left: 28, right: 28 };
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
      cityKey: extractCityFromLocation(spot.title).toLowerCase(),
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

    // Glow layer
    map.addLayer({
      id: SPOT_GLOW_LAYER_ID,
      type: 'circle',
      source: SPOT_SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 14, 3, 16, 8, 20, 20, 24],
        'circle-color': [
          'match',
          ['get', 'primaryType'],
          'memo',
          '#ff5f7a',
          'plan',
          '#33e6dc',
          '#df6eff',
        ],
        'circle-opacity': ['case', ['==', ['get', 'isSelected'], true], 0.44, 0.2],
        'circle-blur': 1,
      },
    });

    // Main marker layer
    map.addLayer({
      id: SPOT_LAYER_ID,
      type: 'circle',
      source: SPOT_SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 7, 3, 9, 8, 12, 20, 15],
        'circle-stroke-width': ['case', ['==', ['get', 'isSelected'], true], 2.8, 2],
        'circle-stroke-color': '#ffffff',
        'circle-color': [
          'case',
          ['==', ['get', 'isSelected'], true],
          '#ffd166',
          ['match', ['get', 'primaryType'], 'memo', '#ff5f7a', 'plan', '#33e6dc', '#df6eff'],
        ],
      },
    });

    // Count label on marker (only when more than 1 item at that point)
    map.addLayer({
      id: SPOT_COUNT_LAYER_ID,
      type: 'symbol',
      source: SPOT_SOURCE_ID,
      filter: ['>', ['get', 'count'], 1],
      layout: {
        'text-field': ['to-string', ['get', 'count']],
        'text-size': 10,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 0],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0,0,0,0.85)',
        'text-halo-width': 1.2,
      },
    });

    map.on('click', SPOT_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      const key = feature?.properties?.key;
      if (!key) return;
      selectedSpotKey.value = key;
      const cityKey = String(feature?.properties?.cityKey || '').toLowerCase();
      if (cityKey && !expandedSpotKeys.value.includes(cityKey)) {
        expandedSpotKeys.value = [...expandedSpotKeys.value, cityKey];
      }

      const coords = feature.geometry?.coordinates;
      if (Array.isArray(coords)) {
        map.easeTo({ center: coords, duration: 550, zoom: Math.max(map.getZoom(), 11.5) });
        if (isTouchDevice.value) {
          const spot = groupedSpots.value.find((entry) => entry.key === key);
          hoverPopup?.setLngLat(coords).setHTML(buildHoverPopupHtml(spot)).addTo(map);
        }
      }
      renderMarkers();
    });

    if (!isTouchDevice.value) {
      map.on('mouseenter', SPOT_LAYER_ID, (event) => {
        clearHoverPopupCloseTimer();
        map.getCanvas().style.cursor = 'pointer';
        const feature = event.features?.[0];
        if (!feature || !hoverPopup) return;

        const coords = feature.geometry?.coordinates;
        const key = feature.properties?.key;
        const spot = groupedSpots.value.find((entry) => entry.key === key);

        if (Array.isArray(coords)) {
          hoverPopup.setLngLat(coords).setHTML(buildHoverPopupHtml(spot)).addTo(map);
        }
      });

      map.on('mouseleave', SPOT_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
        if (!isPointerInsidePopup) {
          scheduleHoverPopupClose();
        }
      });
    }
  }

  if (!features.length) return;

  const bounds = new maplibregl.LngLatBounds();
  for (const feature of features) {
    bounds.extend(feature.geometry.coordinates);
  }

  if (features.length === 1) {
    map.easeTo({ center: features[0].geometry.coordinates, zoom: 12, duration: 700 });
  } else {
    map.fitBounds(bounds, {
      padding: getFitPadding(),
      duration: 700,
      maxZoom: 14,
    });
  }

  if (!selectedSpotKey.value && groupedSpots.value.length) {
    selectedSpotKey.value = groupedSpots.value[0].key;
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
  isTouchDevice.value =
    window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;

  const db = getFirestore();

  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'memos')),
      (snapshot) => {
        memos.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        markListenerReady('memos');
      },
      (error) => handleSnapshotError(error, 'memos')
    )
  );

  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'plans')),
      (snapshot) => {
        plans.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        markListenerReady('plans');
      },
      (error) => handleSnapshotError(error, 'plans')
    )
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
  { immediate: true }
);

watch(groupedSpots, () => {
  const validKeys = new Set(cityGroups.value.map((spot) => spot.key));
  expandedSpotKeys.value = expandedSpotKeys.value.filter((key) => validKeys.has(key));
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

  hoverPopup?.remove();
  hoverPopup = null;
  clearHoverPopupCloseTimer();
  isPointerInsidePopup = false;

  if (mapInstance.value) {
    const container = mapInstance.value.getContainer();
    container.removeEventListener('click', handlePopupContainerClick);
    container.removeEventListener('pointerover', handlePopupPointerOver);
    container.removeEventListener('pointerout', handlePopupPointerOut);
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
.map-spots-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.map-canvas {
  min-height: 420px;
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(64, 255, 255, 0.4);
  background:
    radial-gradient(circle at 14% 12%, rgba(64, 255, 255, 0.12), transparent 40%),
    radial-gradient(circle at 88% 82%, rgba(255, 0, 255, 0.08), transparent 38%), #0d1117;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 0 36px rgba(0, 0, 0, 0.35),
    0 10px 28px rgba(0, 0, 0, 0.35);
}

:deep(.maplibregl-canvas) {
  outline: none;
}

:deep(.maplibregl-ctrl-group) {
  background: rgba(11, 16, 32, 0.85);
  border: 1px solid rgba(64, 255, 255, 0.25);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

:deep(.maplibregl-ctrl-group button) {
  transition: background-color 0.2s ease;
}

:deep(.maplibregl-ctrl-group button:hover),
:deep(.maplibregl-ctrl-group button:focus-visible) {
  background: rgba(64, 255, 255, 0.16);
  outline: none;
}

:deep(.maplibregl-ctrl-group button span) {
  filter: invert(1) hue-rotate(165deg);
}

:deep(.maplibregl-ctrl-attrib) {
  font-size: 10px;
  background: rgba(4, 9, 18, 0.75);
  color: #9fb3c8;
}

:deep(.maplibregl-ctrl-attrib a) {
  color: #c9e7ff;
}

:deep(.map-spot-popup .maplibregl-popup-content) {
  background: rgba(9, 14, 24, 0.92);
  color: #e7f4ff;
  border: 1px solid rgba(64, 255, 255, 0.28);
  border-radius: 10px;
  font-size: 0.85rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
  max-width: min(340px, calc(100vw - 2rem));
}

:deep(.map-spot-popup .maplibregl-popup-tip) {
  border-top-color: rgba(9, 14, 24, 0.92);
}

:deep(.map-spot-popup__content) {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

:deep(.map-spot-popup__section h4) {
  margin: 0 0 0.2rem;
  color: var(--ds-color-accent-cyan);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

:deep(.map-spot-popup__section ul) {
  margin: 0;
  padding-left: 1rem;
}

:deep(.map-spot-popup__section li) {
  color: var(--ds-color-text-soft);
  font-size: 0.8rem;
}

:deep(.map-spot-popup-link) {
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--ds-color-text-soft);
  cursor: pointer;
  text-align: left;
  font: inherit;
}

:deep(.map-spot-popup-link:hover),
:deep(.map-spot-popup-link:focus-visible) {
  color: var(--ds-color-accent-cyan);
  text-decoration: underline;
  outline: none;
}

.spot-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.spot-sidebar h2 {
  margin: 0;
}

.spot-location-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 0.6rem;
}

.spot-location-item {
  border: 1.4px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background:
    radial-gradient(circle at 16% 18%, rgba(51, 230, 220, 0.18), transparent 64%),
    radial-gradient(circle at 86% 82%, rgba(255, 95, 122, 0.18), transparent 66%),
    rgba(4, 8, 18, 0.8);
  overflow: hidden;
  width: fit-content;
  max-width: 100%;
  min-width: 170px;
  flex: 0 1 220px;
  box-shadow:
    inset 0 0 8px rgba(255, 255, 255, 0.06),
    0 0 12px rgba(3, 220, 255, 0.14);
  transition:
    box-shadow 0.22s ease,
    border-color 0.22s ease,
    transform 0.28s ease,
    border-radius 0.28s ease,
    flex-basis 0.34s ease;
}

.spot-location-item--active {
  border-color: rgba(0, 247, 255, 0.56);
  box-shadow:
    inset 0 0 10px rgba(0, 247, 255, 0.2),
    0 0 16px rgba(0, 247, 255, 0.18);
}

.spot-location-item--expanded {
  border-radius: 18px;
  flex-basis: 100%;
  width: 100%;
}

.spot-location-toggle {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--ds-color-text);
  padding: 0.45rem 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
  gap: 0.65rem;
}

.spot-location-toggle:hover {
  background: rgba(255, 255, 255, 0.06);
}

.spot-location-meta {
  display: flex;
  flex-direction: column;
  gap: 0.06rem;
  min-width: 0;
}

.spot-location-title {
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spot-location-count {
  font-size: 0.61rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ds-color-text-soft);
}

.spot-location-chevron {
  color: var(--ds-color-accent-cyan);
  transition: transform var(--ds-transition-fast);
}

.spot-location-chevron--open {
  transform: rotate(180deg);
}

.spot-location-dropdown {
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  padding: 0.65rem 0.85rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.spot-expand-enter-active,
.spot-expand-leave-active {
  transition:
    max-height 0.34s ease,
    opacity 0.26s ease,
    transform 0.3s ease;
  overflow: hidden;
}

.spot-expand-enter-from,
.spot-expand-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-6px);
}

.spot-expand-enter-to,
.spot-expand-leave-from {
  max-height: 280px;
  opacity: 1;
  transform: translateY(0);
}

.spot-location-block h3 {
  margin: 0 0 var(--ds-space-2);
  color: var(--ds-color-accent-cyan);
  font-size: var(--ds-text-sm);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.spot-location-block ul {
  margin: 0;
  padding-left: 1.1rem;
}

.spot-location-block li {
  color: var(--ds-color-text-soft);
}

.spot-link-button {
  border: 0;
  background: transparent;
  color: var(--ds-color-text-soft);
  padding: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.spot-link-button:hover,
.spot-link-button:focus-visible {
  color: var(--ds-color-accent-cyan);
  text-decoration: underline;
  outline: none;
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
  .map-canvas {
    min-height: 360px;
  }
}
</style>
