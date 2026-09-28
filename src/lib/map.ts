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
