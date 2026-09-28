import { routing } from "@/i18n/routing";
import { localizePath } from "@/lib/auth-routes";

export const SITE_NAME = "Findly";

const openGraphLocales: Record<string, string> = {
  mk: "mk_MK",
  en: "en_US",
};

// Canonical URL of a page in `locale` and its hreflang alternates in every
// locale (x-default: the Macedonian URL without a prefix). `path` has no
// locale prefix; `query` is an already canonical query string (feed filters).
// Relative URLs, completed by the layout's metadataBase.
export function localeAlternates(
  path: string,
  locale: string,
  query = "",
): { canonical: string; languages: Record<string, string> } {
  const url = (l: string) => localizePath(path, l) + (query ? `?${query}` : "");
  return {
    canonical: url(locale),
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, url(l)])),
      "x-default": url(routing.defaultLocale),
    },
  };
}

// Open Graph fields every page shares. A page that sets `openGraph` replaces
// the layout's object (metadata is merged shallowly), so it spreads this in.
export function openGraphBase(locale: string) {
  return {
    siteName: SITE_NAME,
    locale: openGraphLocales[locale],
    alternateLocale: routing.locales
      .filter((l) => l !== locale)
      .map((l) => openGraphLocales[l]),
  };
}

// Text for a meta description: whitespace collapsed and cut at a word
// boundary to at most `max` characters (with an ellipsis when cut).
export function metaDescription(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  // Cut inside a very long word only when there is no earlier space.
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s.,;:–-]+$/, "")}…`;
}
