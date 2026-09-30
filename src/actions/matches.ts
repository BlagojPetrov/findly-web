"use server";

import {
  type ActionResult,
  fail,
  ok,
  validationError,
} from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { matchStatusSchema } from "@/lib/validation/matches";

// Confirms, dismisses or restores a match. Only the status can change
// (column privilege); RLS limits the update to matches of the user's own
// reports and blocks banned users.
export async function setMatchStatus(
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const parsed = matchStatusSchema.safeParse({
    matchId: formData.get("matchId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { matchId, status } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ status })
    .eq("id", matchId)
    .select("id");
  if (error) {
    // RLS "with check": a banned user.
    if (error.code === "42501") return fail("forbidden");
    console.error(`Updating match ${matchId} failed: ${error.message}`);
    return fail("database");
  }
  // Not one of the user's matches (or it no longer exists).
  if (data.length === 0) return fail("not_found");
  return ok();
}
