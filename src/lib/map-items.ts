import type { LatLng } from "@/lib/map";
import type { Enums } from "@/types/database";

// Reports of the feed's map view (P11.S3), loaded on the server through
// search_item_locations() for the URL's filters. No Leaflet import, so it
// can be unit tested and used on the server.

// search_item_locations() returns at most this many reports (the first ones
// of the list for the same filters).
export const MAP_RESULTS_LIMIT = 300;

export type MapItem = {
  id: string;
  type: Enums<"item_type">;
  status: Enums<"item_status">;
  title: string;
  occurredOn: string;
  locationName: string | null;
  lat: number;
  lng: number;
  category: {
    slug: string;
    icon: string;
    name_mk: string;
    name_en: string;
  };
  coverPath: string | null;
};

// Items that share one point (e.g. several reports at the same address):
// one marker with a list instead of pins stacked on top of each other.
export type MapItemGroup = {
  key: string;
  lat: number;
  lng: number;
  items: MapItem[];
};

// South-west and north-east corners, as Leaflet's fitBounds takes them.
export type MapArea = [[number, number], [number, number]];

// Groups items by point (~1 m), keeping the order of the list.
export function groupByPoint(items: MapItem[]): MapItemGroup[] {
  const groups = new Map<string, MapItemGroup>();
  for (const item of items) {
    const key = `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`;
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { key, lat: item.lat, lng: item.lng, items: [item] });
  }
  return [...groups.values()];
}

// Kilometers per degree of latitude (and of longitude at the equator).
const KM_PER_DEGREE = 111.32;

// The area the map fits for a result set: every report, and the whole
// search circle when the filters have a radius. Null when there is nothing
// to show (the caller falls back to a default area).
export function resultArea(
  items: Pick<MapItem, "lat" | "lng">[],
  circle?: { center: LatLng; radiusKm: number } | null,
): MapArea | null {
  const points = items.map(({ lat, lng }) => [lat, lng] as const);
  if (circle) {
    const { center, radiusKm } = circle;
    const dLat = radiusKm / KM_PER_DEGREE;
    const dLng =
      radiusKm / (KM_PER_DEGREE * Math.cos((center.lat * Math.PI) / 180));
    points.push(
      [center.lat - dLat, center.lng - dLng],
      [center.lat + dLat, center.lng + dLng],
    );
  }
  if (points.length === 0) return null;
  const lats = points.map(([lat]) => lat);
  const lngs = points.map(([, lng]) => lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}
