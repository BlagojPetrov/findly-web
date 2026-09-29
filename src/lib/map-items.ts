import type { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/types/database";

// Items of the /map page, loaded in the browser for the visible area through
// items_in_bounds() (RLS as the visitor). No Leaflet import, so it can be
// unit tested.

// items_in_bounds() returns at most this many (newest) items per area.
export const MAP_ITEMS_LIMIT = 300;

export type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type MapItem = {
  id: string;
  type: Enums<"item_type">;
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// A Leaflet view can reach past the poles and wrap around the world
// (longitudes beyond ±180); items_in_bounds() takes a plain rectangle. A view
// across the antimeridian also shows the other side's longitudes, so it asks
// for every longitude.
export function clampBounds({
  south,
  west,
  north,
  east,
}: MapBounds): MapBounds {
  const crossesAntimeridian = west < -180 || east > 180;
  return {
    south: clamp(south, -90, 90),
    north: clamp(north, -90, 90),
    west: crossesAntimeridian ? -180 : west,
    east: crossesAntimeridian ? 180 : east,
  };
}

// Groups items by point (~1 m), keeping the order of the list (newest first).
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

// Active items in the area (newest first, at most MAP_ITEMS_LIMIT) and how
// many there are in total.
export async function fetchMapItems(
  supabase: ReturnType<typeof createClient>,
  bounds: MapBounds,
  {
    type,
    signal,
  }: { type?: Enums<"item_type"> | null; signal?: AbortSignal } = {},
): Promise<{ items: MapItem[]; total: number }> {
  const area = clampBounds(bounds);
  let request = supabase.rpc("items_in_bounds", {
    min_lat: area.south,
    min_lng: area.west,
    max_lat: area.north,
    max_lng: area.east,
    item_type: type ?? undefined,
  });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw new Error(`Failed to load map items: ${error.message}`);
  return {
    // The generated types mark every column as non-null; location_name and
    // cover_path can be null.
    items: data.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      occurredOn: row.occurred_on,
      locationName: row.location_name ?? null,
      lat: row.lat,
      lng: row.lng,
      category: {
        slug: row.category_slug,
        icon: row.category_icon,
        name_mk: row.category_name_mk,
        name_en: row.category_name_en,
      },
      coverPath: row.cover_path ?? null,
    })),
    total: data[0]?.total_count ?? 0,
  };
}
