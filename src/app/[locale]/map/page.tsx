import { List } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapExplorer } from "@/components/map/map-explorer";
import { LinkPendingMarker } from "@/components/search/pending-marker";
import { buttonVariants } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { localeAlternates, openGraphBase } from "@/lib/seo";
import { cn } from "@/lib/utils";
import {
  type MapFilters,
  mapQuery,
  parseMapParams,
} from "@/lib/validation/map";
import { requestQuery, searchQuery } from "@/lib/validation/search";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/map">): Promise<Metadata> {
  const { locale } = await params;
  const [raw, t] = await Promise.all([
    searchParams,
    getTranslations({ locale: locale as Locale, namespace: "MapPage" }),
  ]);
  const alternates = localeAlternates(
    "/map",
    locale,
    new URLSearchParams(mapQuery(parseMapParams(raw))).toString(),
  );
  return {
    title: t("title"),
    description: t("description"),
    alternates,
    openGraph: {
      ...openGraphBase(locale),
      type: "website",
      title: t("title"),
      description: t("description"),
      url: alternates.canonical,
    },
  };
}

const typeDots = { lost: "bg-lost", found: "bg-found" } as const;

// Public map of the active reports. The map loads the visible area in the
// browser (items_in_bounds, §13); the type filter is in the URL, and changing
// it keeps the map where it is (the map component stays mounted).
export default async function MapPage({
  params,
  searchParams,
}: PageProps<"/[locale]/map">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const raw = await searchParams;
  const filters = parseMapParams(raw);
  const query = mapQuery(filters);
  if (new URLSearchParams(query).toString() !== requestQuery(raw)) {
    redirect({ href: { pathname: "/map", query }, locale });
  }
  const [t, tSearch] = await Promise.all([
    getTranslations("MapPage"),
    getTranslations("Search"),
  ]);
  const types: MapFilters["type"][] = [null, "lost", "found"];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Link
          href={{
            pathname: "/items",
            query: searchQuery({ type: filters.type }),
          }}
          className={buttonVariants({ variant: "outline" })}
        >
          <List aria-hidden />
          {t("asList")}
        </Link>
      </div>

      <nav aria-label={t("typeFilter")} className="mt-6 flex flex-wrap gap-1.5">
        {types.map((type) => {
          const current = filters.type === type;
          return (
            <Link
              key={type ?? "all"}
              href={{ pathname: "/map", query: mapQuery({ type }) }}
              scroll={false}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                current && "border-primary bg-primary/5 font-medium",
              )}
            >
              {type && (
                <span
                  className={cn("size-2.5 rounded-full", typeDots[type])}
                  aria-hidden
                />
              )}
              {tSearch(`types.${type ?? "all"}`)}
              <LinkPendingMarker />
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        <noscript>
          <p className="mb-2 text-sm text-muted-foreground">{t("noScript")}</p>
        </noscript>
        <MapExplorer type={filters.type} />
      </div>
    </div>
  );
}
