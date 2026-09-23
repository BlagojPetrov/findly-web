// Validates a user-supplied redirect target (for example ?next=/items/new) so
// it can only point to a page on this site, never to another origin.
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next || !next.startsWith("/")) return fallback;

  // "//host" and "/\host" are treated by browsers as other origins.
  // Control characters and backslashes have no place in our paths.
  if (next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) {
    return fallback;
  }

  const base = "http://localhost";
  const url = new URL(next, base);
  if (url.origin !== base) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
