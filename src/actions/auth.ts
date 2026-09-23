"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { type ActionResult, validationError } from "@/lib/action-result";
import { authFailure } from "@/lib/auth-errors";
import { AFTER_SIGN_IN_PATH, splitLocale } from "@/lib/auth-routes";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

// Success always ends in a redirect, so these actions only ever return errors.

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return authFailure(error);

  const next = safeRedirectPath(
    formData.get("next")?.toString(),
    AFTER_SIGN_IN_PATH,
  );
  return redirect({ href: splitLocale(next).path, locale: await getLocale() });
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { displayName, email, password } = parsed.data;
  const locale = await getLocale();
  const supabase = await createClient();

  // With email confirmation on, signing up with an address that already has
  // an account returns no error (Supabase hides which emails exist), so both
  // cases show the same "check your email" page.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the handle_new_user() trigger to create the profile.
    options: { data: { display_name: displayName, locale } },
  });
  if (error) return authFailure(error);

  return redirect({
    href: { pathname: "/verify-email", query: { email } },
    locale,
  });
}

export async function signOut() {
  const supabase = await createClient();
  // "local" signs out this browser only, not the user's other devices.
  await supabase.auth.signOut({ scope: "local" });
  redirect({ href: "/", locale: await getLocale() });
}
