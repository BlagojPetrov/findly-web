import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { localeAlternates } from "@/lib/seo";
import { createPublicClient } from "@/lib/supabase/public";

// Regenerated at most once an hour.
export const revalidate = 3600;

// PostgREST returns at most 1000 rows per request.
const BATCH = 1000;
// A sitemap holds at most 50,000 URLs; every item has one per locale.
const MAX_ITEMS = Math.floor(50_000 / routing.locales.length) - 2;

// Every active item as read by a signed-out visitor (RLS as anon), newest
// change first.
async function activeItems() {
  const supabase = createPublicClient();
  const items: { id: string; updated_at: string }[] = [];
  while (items.length < MAX_ITEMS) {
    const { data, error } = await supabase
      .from("items")
      .select("id, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .order("id")
      .range(items.length, Math.min(items.length + BATCH, MAX_ITEMS) - 1);
    if (error) throw new Error(`Failed to load items: ${error.message}`);
    items.push(...data);
    if (data.length < BATCH) break;
  }
  return items;
}

// One entry per page and locale, each listing all language versions.
function entries(
  path: string,
  extra: Omit<MetadataRoute.Sitemap[number], "url" | "alternates"> = {},
): MetadataRoute.Sitemap {
  const absolute = (url: string) => `${env.NEXT_PUBLIC_SITE_URL}${url}`;
  const { languages } = localeAlternates(path, routing.defaultLocale);
  const alternates = {
    languages: Object.fromEntries(
      routing.locales.map((l) => [l, absolute(languages[l])]),
    ),
  };
  return routing.locales.map((locale) => ({
    url: absolute(languages[locale]),
    alternates,
    ...extra,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await activeItems();
  return [
    ...entries("/", { changeFrequency: "daily", priority: 1 }),
    ...entries("/items", {
      lastModified: items[0]?.updated_at,
      changeFrequency: "hourly",
      priority: 0.9,
    }),
    ...entries("/map", { changeFrequency: "daily", priority: 0.7 }),
    ...items.flatMap((item) =>
      entries(`/items/${item.id}`, { lastModified: item.updated_at }),
    ),
  ];
}
