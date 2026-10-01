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
import {
  notificationIdSchema,
  notificationReadSchema,
} from "@/lib/validation/notifications";

// Marks one of the user's notifications read (read_at = now) or unread
// (read_at = null). Only read_at can change (column privilege); RLS limits
// the update to the user's own rows and blocks banned users.
export async function setNotificationRead(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = notificationReadSchema.safeParse({
    notificationId: formData.get("notificationId"),
    read: formData.get("read"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { notificationId, read } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: read === "true" ? new Date().toISOString() : null })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    // RLS "with check": a banned user.
    if (error.code === "42501") return fail("forbidden");
    console.error(
      `Updating notification ${notificationId} failed: ${error.message}`,
    );
    return fail("database");
  }
  // Not one of the user's notifications (or it no longer exists).
  if (data.length === 0) return fail("not_found");
  // The response carries the re-rendered page: the header's unread count and
  // /notifications show the change without a second request.
  refresh();
  return ok();
}

// Deletes one of the user's notifications (RLS: own rows only).
export async function deleteNotification(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = notificationIdSchema.safeParse({
    notificationId: formData.get("notificationId"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { notificationId } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    console.error(
      `Deleting notification ${notificationId} failed: ${error.message}`,
    );
    return fail("database");
  }
  if (data.length === 0) return fail("not_found");
  refresh();
  return ok();
}

// Marks all of the user's unread notifications read; returns how many.
export async function markAllNotificationsRead(): Promise<
  ActionResult<{ count: number }>
> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null)
    .select("id");
  if (error) {
    if (error.code === "42501") return fail("forbidden");
    console.error(`Marking all notifications read failed: ${error.message}`);
    return fail("database");
  }
  refresh();
  return ok({ count: data.length });
}
