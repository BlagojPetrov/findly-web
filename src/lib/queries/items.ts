import "server-only";
import { cache } from "react";
import { z } from "zod";
import type { Category } from "@/lib/queries/categories";
import { createClient } from "@/lib/supabase/server";
import type { SearchFilters } from "@/lib/validation/search";
import type { Enums } from "@/types/database";

// Columns of an item page (lat/lng are generated from the PostGIS
// location); profiles has column privileges, so only its public columns are
// selected. The owner is named by its foreign key: favorites also links
// items and profiles (many-to-many), so a plain "profiles" is ambiguous.
const itemDetailColumns = `
  id, user_id, type, status, title, description, occurred_on,
  location_name, lat, lng, resolved_at, created_at, updated_at,
  category:categories (id, slug, name_mk, name_en, icon),
  owner:profiles!items_user_id_fkey (id, display_name, avatar_path, created_at),
  images:item_images (id, storage_path, position)
`;

async function fetchItem(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select(itemDetailColumns)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load item ${id}: ${error.message}`);
  if (!data) return null;
  return {
    ...data,
    images: [...data.images].sort((a, b) => a.position - b.position),
  };
}

export type ItemDetail = NonNullable<Awaited<ReturnType<typeof fetchItem>>>;

// One item with its category, owner and photos (cover first), or null when
// it does not exist or the viewer may not see it (RLS: hidden items are
// visible only to their owner and admins). Cached per request, so
// generateMetadata and the page share one query.
export const getItem = cache(async (id: string) => {
  // Not a UUID: Postgres would reject the value, and no item can match.
  if (!z.uuid().safeParse(id).success) return null;
  return fetchItem(id);
});

type ItemStatus = Enums<"item_status">;

// What an item card shows (dashboard, feed).
export type ItemSummary = {
  id: string;
  type: Enums<"item_type">;
  status: ItemStatus;
  title: string;
  occurred_on: string;
  location_name: string | null;
  created_at: string;
  category: Category;
  coverPath: string | null;
  // Meters from the feed's center (only feed searches around a point).
  distance?: number | null;
  // Whether the signed-in user saved it (feed queries; false for visitors).
  isFavorite?: boolean;
};

// Columns of an item card for a table query: the photos only for the cover.
export const itemCardColumns = `
  id, type, status, title, occurred_on, location_name, created_at,
  category:categories (id, slug, name_mk, name_en, icon),
  images:item_images (storage_path, position)
`;

// The signed-in user's own reports, newest first, with every status
// (hidden items are visible to their owner). Filtered by user_id because
// RLS also returns other users' active items.
export async function getOwnItems(userId: string): Promise<ItemSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select(itemCardColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load own items: ${error.message}`);
  return data.map(({ images, ...item }) => ({
    ...item,
    coverPath: coverPath(images),
  }));
}

// Storage path of an item's cover (the photo with the lowest position).
export function coverPath(
  images: { storage_path: string; position: number }[],
): string | null {
  return (
    images.reduce<(typeof images)[number] | null>(
      (cover, image) =>
        !cover || image.position < cover.position ? image : cover,
      null,
    )?.storage_path ?? null
  );
}

// Page size of the public feed.
export const SEARCH_PAGE_SIZE = 20;

// One page of the public feed (search_items(), P4.S2) for the parsed URL
// filters, with the total number of matches. A page past the end has no
// rows and total 0. Other lists (the home page) can ask for fewer rows.
export async function searchItems(
  filters: SearchFilters,
  { pageSize = SEARCH_PAGE_SIZE }: { pageSize?: number } = {},
): Promise<{ items: ItemSummary[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_items", {
    q: filters.q || undefined,
    item_type: filters.type ?? undefined,
    category_slugs:
      filters.categories.length > 0 ? filters.categories : undefined,
    // null = active and resolved (the generated types do not allow null).
    item_status: (filters.status === "all"
      ? null
      : filters.status) as ItemStatus,
    date_from: filters.from ?? undefined,
    date_to: filters.to ?? undefined,
    near_lat: filters.near?.lat,
    near_lng: filters.near?.lng,
    radius_km: filters.radius ?? undefined,
    sort: filters.sort,
    page: filters.page,
    page_size: pageSize,
  });
  if (error) throw new Error(`Failed to search items: ${error.message}`);
  return {
    // The generated types mark every column as non-null; location_name,
    // cover_path and distance_m (without a center) can be null.
    items: data.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      title: row.title,
      occurred_on: row.occurred_on,
      location_name: row.location_name ?? null,
      created_at: row.created_at,
      category: {
        id: row.category_id,
        slug: row.category_slug,
        name_mk: row.category_name_mk,
        name_en: row.category_name_en,
        icon: row.category_icon,
      },
      coverPath: row.cover_path ?? null,
      distance: row.distance_m ?? null,
      isFavorite: row.is_favorite,
    })),
    total: data[0]?.total_count ?? 0,
  };
}
