"use server";

import { refresh } from "next/cache";
import {
  type ActionResult,
  fail,
  ok,
  validationError,
} from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reportItemSchema } from "@/lib/validation/reports";

// Flags another user's report for the moderators (§18). RLS allows only a
// visible report of someone else that is not hidden, and blocks banned
// users; the database keeps one open report per user and item.
export async function reportItem(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reportItemSchema.safeParse({
    itemId: formData.get("itemId"),
    reason: formData.get("reason"),
    details: formData.get("details") ?? undefined,
  });
  if (!parsed.success) return validationError(parsed.error);

  const { itemId, reason, details } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: user.id, item_id: itemId, reason, details });
  if (error) {
    // 23505: the user's open report about this item (another tab or device).
    if (error.code === "23505") return fail("report_duplicate");
    // RLS "with check": own, hidden, deleted or invisible report, or a
    // banned user.
    if (error.code === "42501") return fail("report_unavailable");
    console.error(`Reporting item ${itemId} failed: ${error.message}`);
    return fail("database");
  }
  // The re-rendered page shows the report as flagged.
  refresh();
  return ok();
}
