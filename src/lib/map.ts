// Map settings shared by the map components and (later) server code; no
// Leaflet import here, so it is safe outside the browser.

export type LatLng = { lat: number; lng: number };

// Skopje city center.
export const DEFAULT_CENTER: LatLng = { lat: 41.9981, lng: 21.4254 };
export const DEFAULT_ZOOM = 13;

// North Macedonia, [[south, west], [north, east]], for "fit the country".
export const MACEDONIA_BOUNDS: [[number, number], [number, number]] = [
  [40.85, 20.45],
  [42.37, 23.04],
];

export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// Required by the OpenStreetMap tile usage policy; must stay visible.
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const OSM_MAX_ZOOM = 19;

// The point on openstreetmap.org (marker at street zoom), e.g. for directions
// or when the embedded map cannot be shown.
export function osmUrl({ lat, lng }: LatLng) {
  const la = lat.toFixed(6);
  const lo = lng.toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=17/${la}/${lo}`;
}

// How to show a distance: meters (rounded to 10) under 1 km, then km with
// one decimal under 10 km, then whole km. Pass to Intl number formatting as
// `{ style: "unit", unit, maximumFractionDigits }`.
export function distanceDisplay(meters: number): {
  value: number;
  unit: "meter" | "kilometer";
  maximumFractionDigits: number;
} {
  const rounded = Math.round(meters / 10) * 10;
  if (rounded < 1000) {
    return { value: rounded, unit: "meter", maximumFractionDigits: 0 };
  }
  const km = meters / 1000;
  return {
    value: km,
    unit: "kilometer",
    maximumFractionDigits: km < 9.95 ? 1 : 0,
  };
}
