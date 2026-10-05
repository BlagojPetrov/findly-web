import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type AdminStats =
  Database["public"]["Functions"]["admin_stats"]["Returns"][number];

// Site-wide numbers for the admin dashboard (§18), from one RPC. The
// function raises 42501 for anyone who is not an admin.
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats").single();
  if (error) {
    throw new Error(`Failed to load the admin stats: ${error.message}`);
  }
  return data;
}
