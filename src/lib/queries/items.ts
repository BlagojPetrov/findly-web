import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Columns of an item page. location (PostGIS) is added in P5.S4; profiles
// has column privileges, so only its public columns are selected.
const itemDetailColumns = `
  id, user_id, type, status, title, description, occurred_on,
  location_name, resolved_at, created_at, updated_at,
  category:categories (id, slug, name_mk, name_en, icon),
  owner:profiles (id, display_name, avatar_path, created_at),
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
