import {
  FilePlus2,
  LoaderCircle,
  PackageSearch,
  SearchX,
  X,
} from "lucide-react";
import type { Metadata } from "next";
import { type Locale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemCard } from "@/components/items/item-card";
import { MapResults } from "@/components/search/map-results";
import { Pagination } from "@/components/search/pagination";
import { SearchFilters } from "@/components/search/search-filters";
import { ViewSwitch } from "@/components/search/view-switch";
import { buttonVariants } from "@/components/ui/button";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { todayInAppTimeZone } from "@/lib/dates";
import { pageCount } from "@/lib/pagination";
import {
  type Category,
  categoryName,
  getCategories,
} from "@/lib/queries/categories";
import {
  SEARCH_PAGE_SIZE,
  searchItemLocations,
  searchItems,
} from "@/lib/queries/items";
import { localeAlternates, openGraphBase } from "@/lib/seo";
import { cn } from "@/lib/utils";
import {
  type SearchFilters as Filters,
  parseSearchParams,
  requestQuery,
  type SearchView,
  searchQuery,
} from "@/lib/validation/search";

// Canonical URL with the canonical filter query (the page redirects every
// other URL to it); a map view's canonical URL is the list of the same
// filters. Text and distance searches are not indexed; their links are
// followed.
export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/items">): Promise<Metadata> {
  const { locale } = await params;
  const [raw, categories, t] = await Promise.all([
    searchParams,
    getCategories(),
    getTranslations({ locale: locale as Locale, namespace: "Search" }),
  ]);
  const filters = parseSearchParams(raw, {
    categorySlugs: categories.map((category) => category.slug),
  });
  const alternates = localeAlternates(
    "/items",
    locale,
    new URLSearchParams(searchQuery({ ...filters, view: "list" })).toString(),
  );
  return {
    title: t("title"),
    description: t("description"),
    alternates,
    robots:
      filters.q || filters.near ? { index: false, follow: true } : undefined,
    openGraph: {
      ...openGraphBase(locale),
      type: "website",
      title: t("title"),
      description: t("description"),
      url: alternates.canonical,
    },
  };
}

// Public feed of lost and found items with search and filters in the URL
// (§12). Every filter set has one canonical URL: anything else (a submitted
// form with empty fields, invalid values, unknown parameters) redirects to it.
// `?view=map` shows the same results on a map (P11.S3) instead of the paged
// list; each view runs only its own query.
export default async function ItemsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/items">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const [raw, categories] = await Promise.all([searchParams, getCategories()]);
  const filters = parseSearchParams(raw, {
    categorySlugs: categories.map((category) => category.slug),
  });

  const query = searchQuery(filters);
  const canonical = new URLSearchParams(query).toString();
  if (canonical !== requestQuery(raw)) {
    redirect({ href: { pathname: "/items", query }, locale });
  }

  const t = await getTranslations("Search");
  const layout = { locale, filters, canonical, categories };

  if (filters.view === "map") {
    const { items, total } = await searchItemLocations(filters);
    return (
      <FeedLayout {...layout} heading={t("resultCount", { count: total })}>
        {total === 0 ? (
          <EmptyResults filtered={canonical !== "view=map"} view="map" />
        ) : (
          <MapResults filters={filters} items={items} total={total} />
        )}
      </FeedLayout>
    );
  }

  const [{ items, total }, viewer] = await Promise.all([
    searchItems(filters),
    getCurrentUser(),
  ]);

  // A page past the end (an old link after items were resolved or deleted)
  // returns no rows and no total: go to the last page that has results.
  if (items.length === 0 && filters.page > 1) {
    const { total: all } = await searchItems({ ...filters, page: 1 });
    redirect({
      href: feedHref(filters, pageCount(all, SEARCH_PAGE_SIZE)),
      locale,
    });
  }

  const totalPages = pageCount(total, SEARCH_PAGE_SIZE);
  const first = (filters.page - 1) * SEARCH_PAGE_SIZE + 1;

  return (
    <FeedLayout
      {...layout}
      heading={
        totalPages > 1
          ? t("resultRange", {
              from: first,
              to: first + items.length - 1,
              count: total,
            })
          : t("resultCount", { count: total })
      }
    >
      {items.length === 0 ? (
        <EmptyResults filtered={canonical !== ""} view="list" />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="grid">
                <ItemCard
                  item={item}
                  favorite={{ signedIn: viewer !== null }}
                />
              </li>
            ))}
          </ul>
          <Pagination
            page={filters.page}
            totalPages={totalPages}
            href={(page) => feedHref(filters, page)}
          />
        </>
      )}
    </FeedLayout>
  );
}

// The feed's frame for both views: title, filter form, the count, the
// List/Map switch and the results. Rendered in full on the server (no
// Suspense fallback), so the results and redirects work without JavaScript.
// While a link or the filter form is loading the next URL, their pending
// markers dim the results. The results keep their place in the tree, so the
// map stays mounted across filter changes.
function FeedLayout({
  locale,
  filters,
  canonical,
  categories,
  heading,
  children,
}: {
  locale: Locale;
  filters: Filters;
  canonical: string;
  categories: Category[];
  heading: string;
  children: ReactNode;
}) {
  const t = useTranslations("Search");

  return (
    <div className="group/feed mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        {/* Remounted per URL, so back/forward reset the form's values. */}
        <SearchFilters
          key={canonical}
          action={getPathname({ href: "/items", locale })}
          filters={filters}
          categories={categories.map((category) => ({
            slug: category.slug,
            icon: category.icon,
            name: categoryName(category, locale),
          }))}
          today={todayInAppTimeZone()}
        />

        <section aria-labelledby="search-results" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2
              id="search-results"
              aria-live="polite"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              {heading}
              <span className="hidden items-center gap-1.5 group-has-[[data-pending]]/feed:inline-flex">
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                {t("loading")}
              </span>
            </h2>
            <ViewSwitch filters={filters} />
          </div>

          <div className="grid gap-4 transition-opacity group-has-[[data-pending]]/feed:pointer-events-none group-has-[[data-pending]]/feed:opacity-50">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

function feedHref(filters: Filters, page: number) {
  return { pathname: "/items", query: searchQuery({ ...filters, page }) };
}

// No results for the filters (with a way back to the whole feed in the same
// view), or no reports at all yet (with links to report one).
function EmptyResults({
  filtered,
  view,
}: {
  filtered: boolean;
  view: SearchView;
}) {
  const t = useTranslations("Search");

  if (filtered) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
        <SearchX className="size-10 text-muted-foreground" aria-hidden />
        <p className="font-medium">{t("emptyTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
        <Link
          href={{ pathname: "/items", query: searchQuery({ view }) }}
          className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
        >
          <X aria-hidden />
          {t("clearFilters")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
      <PackageSearch className="size-10 text-muted-foreground" aria-hidden />
      <p className="mt-4 text-lg font-semibold">{t("emptyFeed")}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {t("emptyFeedDescription")}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href={{ pathname: "/items/new", query: { type: "lost" } }}
          className={buttonVariants()}
        >
          <FilePlus2 aria-hidden />
          {t("reportLost")}
        </Link>
        <Link
          href={{ pathname: "/items/new", query: { type: "found" } }}
          className={buttonVariants({ variant: "outline" })}
        >
          <FilePlus2 aria-hidden />
          {t("reportFound")}
        </Link>
      </div>
    </div>
  );
}
