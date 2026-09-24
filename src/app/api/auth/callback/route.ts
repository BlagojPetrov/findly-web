import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import {
  AFTER_SIGN_IN_PATH,
  SIGN_IN_PATH,
  localizePath,
  splitLocale,
} from "@/lib/auth-routes";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

// Return URL of Google sign-in (signInWithGoogle in src/actions/auth.ts).
//
//   ?code=…                      success: exchanged for a session (PKCE; the
//                                code verifier cookie was set by the action)
//   ?error=…&error_description=… Google or Supabase refused (access_denied =
//                                the user cancelled on Google's page)
//   &locale=mk|en, &next=/path   set by the action
//
// Failures go back to /login?error=oauth_cancelled|oauth_failed (keeping next).

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const localeParam = params.get("locale");
  const locale = hasLocale(routing.locales, localeParam)
    ? localeParam
    : routing.defaultLocale;
  const next = safeRedirectPath(params.get("next"), AFTER_SIGN_IN_PATH);

  const loginUrl = (error: "oauth_cancelled" | "oauth_failed") => {
    const query = new URLSearchParams({ error });
    if (next !== AFTER_SIGN_IN_PATH) query.set("next", next);
    return `${localizePath(SIGN_IN_PATH, locale)}?${query}`;
  };

  const code = params.get("code");
  if (!code) {
    const reason = params.get("error");
    if (reason === "access_denied") redirect(loginUrl("oauth_cancelled"));
    console.error(
      `Google sign-in failed: ${reason ?? "no code"}: ${params.get("error_description") ?? ""}`,
    );
    redirect(loginUrl("oauth_failed"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error(
      `Google sign-in code exchange failed: ${error.code ?? "no code"} (${error.status ?? "no status"}): ${error.message}`,
    );
    redirect(loginUrl("oauth_failed"));
  }

  redirect(localizePath(splitLocale(next).path, locale));
}
