import type { AuthError, EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import {
  AFTER_SIGN_IN_PATH,
  localizePath,
  splitLocale,
} from "@/lib/auth-routes";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

// Target of the links in Supabase auth emails.
//
//   ?token_hash=…&type=email   our email template (works in any browser)
//   ?code=…                    Supabase's default template (PKCE; only works in
//                              the browser that started the sign-up)
//   &locale=mk|en              language of the page to land on
//   &next=/path                where to go after success (relative paths only)
//
// On success the user is signed in (session cookies are set) and redirected.
// Invalid, expired or reused links go to ?error=link_invalid on
// /forgot-password (password reset links) or /verify-email (all others).

const otpTypes: EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "email_change",
];

function isOtpType(value: string | null): value is EmailOtpType {
  return otpTypes.includes(value as EmailOtpType);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const localeParam = params.get("locale");
  const locale = hasLocale(routing.locales, localeParam)
    ? localeParam
    : routing.defaultLocale;
  const next = safeRedirectPath(params.get("next"), AFTER_SIGN_IN_PATH);

  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  // The default template's PKCE link has no type; its next tells us instead.
  const isRecovery =
    type === "recovery" || splitLocale(next).path.startsWith("/reset-password");
  const failureUrl = `${localizePath(
    isRecovery ? "/forgot-password" : "/verify-email",
    locale,
  )}?error=link_invalid`;

  const supabase = await createClient();
  let error: AuthError | null;
  if (tokenHash && isOtpType(type)) {
    ({ error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    // Supabase reports failures of its own verify step in the URL fragment,
    // which never reaches the server, so we simply see no token here.
    redirect(failureUrl);
  }

  if (error) {
    console.error(
      `Email link verification failed: ${error.code ?? "no code"} (${error.status ?? "no status"}): ${error.message}`,
    );
    redirect(failureUrl);
  }

  redirect(localizePath(splitLocale(next).path, locale));
}
