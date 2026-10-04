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
import { favoriteSchema } from "@/lib/validation/favorites";

// Saves a report to the user's favorites. Saving it twice changes nothing.
// RLS allows only a report the user can see that is not hidden, and blocks
// banned users.
export async function addFavorite(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = favoriteSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return validationError(parsed.error);

  const { itemId } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: user.id, item_id: itemId });
  // 23505: already saved (another tab or device).
  if (error && error.code !== "23505") {
    // RLS "with check": the report is hidden, deleted or not visible, or
    // the user is banned.
    if (error.code === "42501") return fail("favorite_unavailable");
    console.error(`Saving item ${itemId} failed: ${error.message}`);
    return fail("database");
  }
  // The response carries the re-rendered page, so the button's optimistic
  // state hands over to the stored one.
  refresh();
  return ok();
}

// Removes a report from the user's favorites (RLS: own rows only). Removing
// one that is not saved changes nothing.
export async function removeFavorite(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = favoriteSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return validationError(parsed.error);

  const { itemId } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("item_id", itemId);
  if (error) {
    console.error(`Removing favorite ${itemId} failed: ${error.message}`);
    return fail("database");
  }
  refresh();
  return ok();
}
