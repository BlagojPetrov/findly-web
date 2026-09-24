"use server";

import { redirect as redirectToUrl } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  type ActionResult,
  fail,
  ok,
  validationError,
} from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth";
import { authFailure } from "@/lib/auth-errors";
import { AFTER_SIGN_IN_PATH, splitLocale } from "@/lib/auth-routes";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resendSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

// Where Supabase sends the user from an auth email when our custom template
// is not used (default template, PKCE code). Must match the redirect URLs
// allowed in Supabase → Authentication → URL Configuration.
function confirmRedirectUrl(locale: string, next?: string) {
  const url = `${env.NEXT_PUBLIC_SITE_URL}/api/auth/confirm?locale=${locale}`;
  return next ? `${url}&next=${encodeURIComponent(next)}` : url;
}

// Where Google (via Supabase) sends the user back after sign-in. Also must be
// allowed in Supabase → Authentication → URL Configuration.
function oauthCallbackUrl(locale: string, next: string) {
  return `${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?locale=${locale}&next=${encodeURIComponent(next)}`;
}

// signIn/signUp end in a redirect on success, so they only ever return errors.

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

// Starts Google sign-in: Supabase returns the Google consent URL and stores
// the PKCE code verifier in a cookie; /api/auth/callback finishes the flow.
// New users get a profile from the handle_new_user() trigger (Google name).
export async function signInWithGoogle(
  formData: FormData,
): Promise<ActionResult> {
  const next = safeRedirectPath(
    formData.get("next")?.toString(),
    AFTER_SIGN_IN_PATH,
  );
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: oauthCallbackUrl(await getLocale(), next) },
  });
  if (error) return authFailure(error);

  return redirectToUrl(data.url);
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
    options: {
      data: { display_name: displayName, locale },
      emailRedirectTo: confirmRedirectUrl(locale),
    },
  });
  if (error) return authFailure(error);

  return redirect({
    href: { pathname: "/verify-email", query: { email } },
    locale,
  });
}

// Always reports success when the request was accepted, whether or not the
// address has an unconfirmed account, so it cannot be used to probe emails.
export async function resendConfirmation(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resendSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: confirmRedirectUrl(await getLocale()) },
  });
  if (error) return authFailure(error);

  return ok();
}

// Like resendConfirmation: reports success whether or not an account exists
// (Supabase also answers unknown addresses with success).
export async function requestPasswordReset(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: confirmRedirectUrl(await getLocale(), "/reset-password") },
  );
  if (error) return authFailure(error);

  return ok();
}

// Sets a new password for the signed-in user. After a reset link the user
// has a session from /api/auth/confirm, so no current password is asked for
// (Supabase allows any session to change its password).
export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationError(parsed.error);

  if (!(await getCurrentUser())) return fail("unauthorized");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return authFailure(error);

  // Whoever knew the old password may still be signed in elsewhere.
  const { error: signOutError } = await supabase.auth.signOut({
    scope: "others",
  });
  if (signOutError) {
    console.error(
      `Signing out other sessions after a password reset failed: ${signOutError.message}`,
    );
  }

  return ok();
}

export async function signOut() {
  const supabase = await createClient();
  // "local" signs out this browser only, not the user's other devices.
  await supabase.auth.signOut({ scope: "local" });
  redirect({ href: "/", locale: await getLocale() });
}
