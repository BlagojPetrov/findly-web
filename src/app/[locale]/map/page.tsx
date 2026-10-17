import type { Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { permanentRedirect } from "@/i18n/navigation";
import { mapRedirectQuery } from "@/lib/validation/search";

// The former map page (P5.S6). Since P11.S3 the map is a view of the feed:
// old links and bookmarks go there permanently (308), keeping a valid type
// filter (the only filter /map had).
export default async function MapPage({
  params,
  searchParams,
}: PageProps<"/[locale]/map">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  permanentRedirect({
    href: { pathname: "/items", query: mapRedirectQuery(await searchParams) },
    locale,
  });
}
