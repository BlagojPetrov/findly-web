import "server-only";
import { createClient } from "@/lib/supabase/server";

// Unread notifications of the signed-in user, for the header bell's first
// render (the bell keeps it current in the browser). Null if the count
// failed: the bell then loads it itself instead of breaking every page.
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number | null> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) {
    console.error(`Counting notifications failed: ${error.message}`);
    return null;
  }
  return count ?? 0;
}
