import "server-only";
import {
  coverPath,
  type ItemSummary,
  itemCardColumns,
} from "@/lib/queries/items";
import { createClient } from "@/lib/supabase/server";

// Favorites per page on /favorites.
export const FAVORITES_PAGE_SIZE = 20;

// Whether the user saved the item to their favorites (RLS: own rows only).
export async function isFavorite(itemId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("item_id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Failed to load the favorite state of item ${itemId}: ${error.message}`,
    );
  }
  return data !== null;
}

// Reports a favorites list shows. A favorite stays when its report is hidden
// later, and RLS still returns the user's own hidden reports, so the list
// filters by status itself (§17).
const LISTED_STATUSES = ["active", "resolved"] as const;

// The item is an inner join: favorites whose report is not listed (or not
// visible) are left out of the rows and the count.
const favoriteColumns =
  `created_at, item:items!inner (${itemCardColumns})` as const;

// One page of the signed-in user's favorites (/favorites), the most recently
// saved first, as item cards, with the total number of listed favorites.
export async function getFavoritePage(
  userId: string,
  page: number,
): Promise<{ items: ItemSummary[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * FAVORITES_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("favorites")
    .select(favoriteColumns, { count: "exact" })
    .eq("user_id", userId)
    .in("item.status", LISTED_STATUSES)
    .order("created_at", { ascending: false })
    .order("item_id", { ascending: false })
    .range(from, from + FAVORITES_PAGE_SIZE - 1);
  // A page past the end: PostgREST answers 416 instead of an empty page. The
  // caller needs the total to send the visitor to the last page.
  if (error?.code === "PGRST103") {
    const { count: total, error: countError } = await supabase
      .from("favorites")
      .select("item_id, item:items!inner (status)", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId)
      .in("item.status", LISTED_STATUSES);
    if (countError) {
      throw new Error(`Failed to count favorites: ${countError.message}`);
    }
    return { items: [], total: total ?? 0 };
  }
  if (error) throw new Error(`Failed to load favorites: ${error.message}`);
  return {
    items: data.map(({ item: { images, ...item } }) => ({
      ...item,
      coverPath: coverPath(images),
      isFavorite: true,
    })),
    total: count ?? 0,
  };
}
