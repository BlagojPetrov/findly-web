import { routing } from "@/i18n/routing";
import { safeRedirectPath } from "@/lib/safe-redirect";

// Route rules used by the proxy for optimistic redirects. Pages and actions
// still check authorization themselves (src/lib/auth.ts) and RLS has the
// final word, so these rules are a convenience, not the security boundary.

export const SIGN_IN_PATH = "/login";
// Where signed-in users land when they open /login or /register.
// Becomes "/dashboard" once the dashboard exists (P3.S8).
export const AFTER_SIGN_IN_PATH = "/";

const protectedPrefixes = [
  "/dashboard",
  "/profile",
  "/items/new",
  "/messages",
  "/favorites",
  "/notifications",
  "/admin",
];
const itemEditPath = /^\/items\/[^/]+\/edit$/;
const guestOnlyPaths = ["/login", "/register"];

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

// Splits "/en/profile" into { locale: "en", path: "/profile" }. Paths without
// a locale prefix belong to the default locale.
export function splitLocale(pathname: string) {
  const [, first, ...rest] = pathname.split("/");
  if ((routing.locales as readonly string[]).includes(first)) {
    return { locale: first, path: `/${rest.join("/")}` };
  }
  return { locale: routing.defaultLocale as string, path: pathname };
}

// Adds the locale prefix for non-default locales ("/login" → "/en/login").
export function localizePath(path: string, locale: string) {
  if (locale === routing.defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function isProtectedPath(path: string) {
  return (
    protectedPrefixes.some((prefix) => matchesPrefix(path, prefix)) ||
    itemEditPath.test(path)
  );
}

export function isGuestOnlyPath(path: string) {
  return guestOnlyPaths.some((prefix) => matchesPrefix(path, prefix));
}

// Returns where the request should be redirected, or null to continue.
export function getAuthRedirect(requestUrl: string, signedIn: boolean) {
  const url = new URL(requestUrl);
  let pathname = url.pathname;
  try {
    // Check the decoded path so "/%70rofile" cannot skip the "/profile" rule.
    pathname = decodeURIComponent(pathname);
  } catch {
    // Malformed encoding: check the raw path.
  }
  const { locale, path } = splitLocale(pathname);

  if (!signedIn && isProtectedPath(path)) {
    const target = new URL(localizePath(SIGN_IN_PATH, locale), url);
    target.searchParams.set("next", `${path}${url.search}`);
    return target;
  }

  if (signedIn && isGuestOnlyPath(path)) {
    const next = safeRedirectPath(
      url.searchParams.get("next"),
      AFTER_SIGN_IN_PATH,
    );
    return new URL(localizePath(splitLocale(next).path, locale), url);
  }

  return null;
}
