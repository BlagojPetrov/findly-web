import "server-only";
import { createClient } from "@/lib/supabase/server";

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
