const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export function sanitizeLocationLabel(value) {
  return (value || '').trim();
}

export async function geocodeLocationLabel(locationLabel) {
  const q = sanitizeLocationLabel(locationLabel);
  if (!q) return null;

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      lat,
      lng,
      placeName: first.display_name || q,
      source: 'geocode',
    };
  } catch (error) {
    console.warn('[useLocationGeocoding] geocode failed:', error);
    return null;
  }
}

export async function searchLocationSuggestions(locationLabel, limit = 5) {
  const q = sanitizeLocationLabel(locationLabel);
  if (!q) return [];

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails', '1');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const label = item.display_name || q;
        const [mainText, ...rest] = label.split(',');
        return {
          id: `${lat},${lng},${mainText}`,
          label,
          mainText: mainText.trim(),
          secondaryText: rest.join(',').trim(),
          lat,
          lng,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.warn('[useLocationGeocoding] suggestion fetch failed:', error);
    return [];
  }
}
