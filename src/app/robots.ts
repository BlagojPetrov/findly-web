import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizePath, PROTECTED_PREFIXES } from "@/lib/auth-routes";
import { env } from "@/lib/env";

// Crawlers may read every public page; signed-in areas (the proxy's protected
// routes, in every locale) and API routes are disallowed. Sign-in pages are
// crawlable but carry `noindex`.
export default function robots(): MetadataRoute.Robots {
  const disallow = routing.locales.flatMap((locale) => [
    ...PROTECTED_PREFIXES.map((prefix) => localizePath(prefix, locale)),
    localizePath("/items/*/edit", locale),
  ]);
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", ...disallow] },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
