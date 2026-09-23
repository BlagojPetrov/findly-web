import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getAuthRedirect } from "@/lib/auth-routes";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  const { userId } = await updateSession(request, response);

  // i18n redirects (e.g. /mk/profile → /profile) go out first; the auth
  // check runs on the follow-up request.
  if (response.headers.has("location")) return response;

  const target = getAuthRedirect(request.url, userId !== null);
  if (!target) return response;

  const redirect = NextResponse.redirect(target);
  // Keep any refreshed session cookies and never cache auth redirects.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}

export const config = {
  // Skip Next.js internals, API routes and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
