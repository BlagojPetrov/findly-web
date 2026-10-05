"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import {
  type ActionResult,
  fail,
  ok,
  validationError,
} from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth";
import { restoredStatus } from "@/lib/moderation";
import { createClient } from "@/lib/supabase/server";
import {
  closeReportsSchema,
  hideItemSchema,
  moderateItemSchema,
} from "@/lib/validation/admin";

// Moderation actions of the admin area (§18). Each checks requireAdmin()
// itself (a 404 for anyone else); RLS lets only admins hide or restore other
// users' reports and close flags. Hiding or restoring notifies the owner
// (trigger items_notify_moderation, P10.S1).

type Client = Awaited<ReturnType<typeof createClient>>;

function databaseFailure(what: string, error: PostgrestError) {
  console.error(`${what} failed: ${error.message}`);
  return fail("database");
}

// Closes the given open flags of the item. Flags another admin closed
// meanwhile are skipped, so the action is idempotent.
async function closeOpenReports(
  supabase: Client,
  itemId: string,
  reportIds: string[],
  status: "resolved" | "dismissed",
) {
  return supabase
    .from("reports")
    .update({ status })
    .eq("item_id", itemId)
    .eq("status", "open")
    .in("id", reportIds)
    .select("id");
}

// Hides a report from everyone but its owner and the admins, and resolves
// the flags the admin saw with it. Already hidden: only the flags.
export async function hideItem(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = hideItemSchema.safeParse({
    itemId: formData.get("itemId"),
    reportIds: formData.getAll("reportIds"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { itemId, reportIds } = parsed.data;
  const supabase = await createClient();
  const { data: item, error: readError } = await supabase
    .from("items")
    .select("id, status")
    .eq("id", itemId)
    .maybeSingle();
  if (readError) return databaseFailure(`Reading item ${itemId}`, readError);
  if (!item) return fail("not_found");

  if (item.status !== "hidden") {
    // The status filter keeps a second admin's click from notifying twice.
    const { error } = await supabase
      .from("items")
      .update({ status: "hidden" })
      .eq("id", itemId)
      .neq("status", "hidden")
      .select("id");
    if (error) return databaseFailure(`Hiding item ${itemId}`, error);
  }
  if (reportIds.length > 0) {
    const { error } = await closeOpenReports(
      supabase,
      itemId,
      reportIds,
      "resolved",
    );
    if (error) return databaseFailure(`Resolving flags of ${itemId}`, error);
  }
  refresh();
  return ok();
}

// Makes a hidden report visible again, with the status it had before
// (resolved when it was resolved, otherwise active). Not hidden (restored
// by another admin): nothing to do.
export async function restoreItem(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = moderateItemSchema.safeParse({
    itemId: formData.get("itemId"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { itemId } = parsed.data;
  const supabase = await createClient();
  const { data: item, error: readError } = await supabase
    .from("items")
    .select("id, status, resolved_at")
    .eq("id", itemId)
    .maybeSingle();
  if (readError) return databaseFailure(`Reading item ${itemId}`, readError);
  if (!item) return fail("not_found");

  if (item.status === "hidden") {
    const { error } = await supabase
      .from("items")
      .update({ status: restoredStatus(item.resolved_at) })
      .eq("id", itemId)
      .eq("status", "hidden")
      .select("id");
    if (error) return databaseFailure(`Restoring item ${itemId}`, error);
  }
  refresh();
  return ok();
}

// Resolves or dismisses the flags the admin saw about one report, without
// changing the report itself.
export async function closeReports(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = closeReportsSchema.safeParse({
    itemId: formData.get("itemId"),
    reportIds: formData.getAll("reportIds"),
    outcome: formData.get("outcome"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { itemId, reportIds, outcome } = parsed.data;
  const supabase = await createClient();
  const { error } = await closeOpenReports(
    supabase,
    itemId,
    reportIds,
    outcome,
  );
  if (error) return databaseFailure(`Closing flags of ${itemId}`, error);
  refresh();
  return ok();
}
