export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

interface OpenMeteoGeocodeItem {
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function scoreMatch(item: OpenMeteoGeocodeItem, state: string, country: string): number {
  let score = 0;
  const itemCountry = normalize(item.country ?? '');
  const itemState = normalize(item.admin1 ?? '');
  const wantCountry = normalize(country);
  const wantState = normalize(state);
  if (wantCountry && itemCountry && (itemCountry.includes(wantCountry) || wantCountry.includes(itemCountry))) score += 2;
  if (wantState && itemState && (itemState.includes(wantState) || wantState.includes(itemState))) score += 1;
  return score;
}

// Best-effort city lookup (NF0019 pattern): any failure or lack of match returns
// null rather than throwing, so callers can degrade gracefully (no forecast)
// without blocking project creation/update.
export async function geocodeCity(city: string, state: string, country: string): Promise<GeocodeResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=pt&format=json`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: OpenMeteoGeocodeItem[] };
    const results = data.results ?? [];
    if (results.length === 0) return null;

    let best = results[0];
    let bestScore = -1;
    for (const item of results) {
      const s = scoreMatch(item, state, country);
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    }
    return { latitude: best.latitude, longitude: best.longitude };
  } catch {
    return null;
  }
}
