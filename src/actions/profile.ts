"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  type ActionResult,
  fail,
  ok,
  validationError,
} from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { AVATAR_BUCKET, isOwnAvatarPath } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation/profile";
import type { TablesUpdate } from "@/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Updates the signed-in user's own profile row. RLS allows only the own row
// and rejects banned users (42501).
async function updateOwnProfile(
  supabase: SupabaseClient,
  userId: string,
  values: TablesUpdate<"profiles">,
): Promise<ActionResult> {
  const { data, error } = await supabase
    .from("profiles")
    .update(values)
    .eq("id", userId)
    .select("id");
  if (error) return profileWriteFailure(error);
  if (data.length === 0) return fail("forbidden");
  return ok();
}

function profileWriteFailure(error: PostgrestError): ActionResult<never> {
  if (error.code === "42501") return fail("forbidden");
  console.error(`Profile update failed: ${error.code}: ${error.message}`);
  return fail("database");
}

// Deletes a previous picture. A leftover file only wastes space, so a
// failure is logged and not reported to the user.
async function removeAvatarFile(supabase: SupabaseClient, path: string) {
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) console.error(`Removing avatar ${path} failed: ${error.message}`);
}

// Name and header avatar appear on every page (header, later item pages).
function revalidateProfile() {
  revalidatePath("/", "layout");
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const user = await requireUser("/profile");
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    preferredLocale: formData.get("preferredLocale"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { displayName, preferredLocale } = parsed.data;
  const supabase = await createClient();
  const result = await updateOwnProfile(supabase, user.id, {
    display_name: displayName,
    preferred_locale: preferredLocale,
  });
  if (!result.ok) return result;

  // Auth email templates read the language from the user's metadata (set at
  // sign-up), so keep it in sync with the profile (F-18).
  if (preferredLocale !== user.profile.preferred_locale) {
    const { error } = await supabase.auth.updateUser({
      data: { locale: preferredLocale },
    });
    if (error) {
      console.error(`Updating the email language failed: ${error.message}`);
    }
  }

  revalidateProfile();
  return ok();
}

// Called after the browser has uploaded the resized picture to
// avatars/<uid>/<uuid>.<ext> (the storage policies allow only the own
// folder). Points the profile to it and deletes the previous picture.
export async function updateAvatar(formData: FormData): Promise<ActionResult> {
  const user = await requireUser("/profile");
  const path = formData.get("path");
  if (typeof path !== "string" || !isOwnAvatarPath(path, user.id)) {
    return fail("validation");
  }

  const supabase = await createClient();
  // false (with an error) when the file is missing or not in the user's
  // folder; other failures throw.
  const { data: exists } = await supabase.storage
    .from(AVATAR_BUCKET)
    .exists(path);
  if (!exists) return fail("not_found");

  const result = await updateOwnProfile(supabase, user.id, {
    avatar_path: path,
  });
  if (!result.ok) return result;

  const previous = user.profile.avatar_path;
  if (previous && previous !== path) await removeAvatarFile(supabase, previous);

  revalidateProfile();
  return ok();
}

export async function removeAvatar(): Promise<ActionResult> {
  const user = await requireUser("/profile");
  const previous = user.profile.avatar_path;
  if (!previous) return ok();

  const supabase = await createClient();
  const result = await updateOwnProfile(supabase, user.id, {
    avatar_path: null,
  });
  if (!result.ok) return result;

  await removeAvatarFile(supabase, previous);
  revalidateProfile();
  return ok();
}
