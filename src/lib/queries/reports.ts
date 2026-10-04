import "server-only";
import { createClient } from "@/lib/supabase/server";

// Whether the user has an open report about the item (RLS: users see only
// their own reports). The item page then shows the report as flagged
// instead of the button; a closed report allows a new one.
export async function hasOpenReport(itemId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id")
    .eq("item_id", itemId)
    .eq("reporter_id", userId)
    .eq("status", "open")
    .maybeSingle();
  if (error) {
    throw new Error(
      `Failed to load the report state of item ${itemId}: ${error.message}`,
    );
  }
  return data !== null;
}
