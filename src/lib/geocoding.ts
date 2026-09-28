import type { LatLng } from "@/lib/map";
import { ITEM_LIMITS } from "@/lib/validation/items";

// Address search and reverse geocoding with OpenStreetMap Nominatim, called
// from the browser (AD-13). Usage policy: at most 1 request per second, cache
// results, no bulk use, attribution (shown on every map). Browsers send the
// site as `Referer`, which identifies the application.

export const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
// Policy limit is 1 s; the margin covers network jitter, so requests also
// arrive at least a second apart.
export const MIN_REQUEST_INTERVAL_MS = 1100;
// Wait this long after the last keystroke before searching.
export const SEARCH_DEBOUNCE_MS = 500;
export const SEARCH_MIN_LENGTH = 3;
const SEARCH_LIMIT = 5;
const CACHE_SIZE = 50;

export type GeocodeResult = LatLng & { label: string };

export class GeocodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeocodingError";
  }
}

// Resolves when a request may start: at least `intervalMs` after the previous
// one started. A caller aborted while waiting does not use up a slot.
export function createThrottle(intervalMs: number) {
  let lastStart = -Infinity;
  return async function throttle(signal?: AbortSignal) {
    for (;;) {
      signal?.throwIfAborted();
      const wait = lastStart + intervalMs - Date.now();
      if (wait <= 0) {
        lastStart = Date.now();
        return;
      }
      await sleep(wait, signal);
    }
  };
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

// One throttle for every Nominatim request of the page.
const throttle = createThrottle(MIN_REQUEST_INTERVAL_MS);
const cache = new Map<string, unknown>();

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  if (cache.has(url)) return cache.get(url);
  await throttle(signal);
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new GeocodingError(`Nominatim responded ${response.status}`);
  }
  const data: unknown = await response.json();
  if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
  cache.set(url, data);
  return data;
}

// Only for tests.
export function clearGeocodingCache() {
  cache.clear();
}

type NominatimPlace = {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
};

// Short, readable label ("Name, Street 12, Suburb, City") instead of
// Nominatim's long `display_name` with municipality, region, postcode and
// country. Fits `items.location_name`.
export function formatPlace(place: NominatimPlace): string {
  const address = place.address ?? {};
  const street = [address.road ?? address.pedestrian, address.house_number]
    .filter(Boolean)
    .join(" ");
  const area =
    address.suburb ??
    address.neighbourhood ??
    address.quarter ??
    address.city_district;
  const locality =
    address.city ?? address.town ?? address.village ?? address.municipality;
  const parts: string[] = [];
  for (const part of [place.name, street, area, locality]) {
    const value = part?.trim();
    if (value && !parts.includes(value)) parts.push(value);
  }
  const label = parts.length
    ? parts.join(", ")
    : (place.display_name ?? "").trim();
  return label.slice(0, ITEM_LIMITS.locationNameMax);
}

function toResult(place: NominatimPlace): GeocodeResult | null {
  const lat = Number(place.lat);
  const lng = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const label = formatPlace(place);
  return label ? { lat, lng, label } : null;
}

export function searchUrl(query: string, locale: string) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "mk",
    limit: String(SEARCH_LIMIT),
    "accept-language": locale,
  });
  return `${NOMINATIM_URL}/search?${params}`;
}

export function reverseUrl({ lat, lng }: LatLng, locale: string) {
  const params = new URLSearchParams({
    // 6 decimals (~0.1 m) so nearby clicks share cache entries.
    lat: lat.toFixed(6),
    lon: lng.toFixed(6),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18",
    "accept-language": locale,
  });
  return `${NOMINATIM_URL}/reverse?${params}`;
}

// Places in North Macedonia matching `query`; [] for queries shorter than
// SEARCH_MIN_LENGTH (without a request).
export async function searchAddress(
  query: string,
  { locale, signal }: { locale: string; signal?: AbortSignal },
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < SEARCH_MIN_LENGTH) return [];
  const data = await fetchJson(searchUrl(trimmed, locale), signal);
  if (!Array.isArray(data)) throw new GeocodingError("Unexpected response");
  return (data as NominatimPlace[])
    .map(toResult)
    .filter((result) => result !== null);
}

// Address label of a point, or null when Nominatim knows none (e.g. at sea).
export async function reverseGeocode(
  point: LatLng,
  { locale, signal }: { locale: string; signal?: AbortSignal },
): Promise<string | null> {
  const data = await fetchJson(reverseUrl(point, locale), signal);
  if (!data || typeof data !== "object" || "error" in data) return null;
  return toResult(data as NominatimPlace)?.label ?? null;
}
