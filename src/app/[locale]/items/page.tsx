import {
  FilePlus2,
  LoaderCircle,
  PackageSearch,
  SearchX,
  X,
} from "lucide-react";
import type { Metadata } from "next";
import { type Locale, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemCard } from "@/components/items/item-card";
import { Pagination } from "@/components/search/pagination";
import { SearchFilters } from "@/components/search/search-filters";
import { buttonVariants } from "@/components/ui/button";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import { todayInAppTimeZone } from "@/lib/dates";
import { pageCount } from "@/lib/pagination";
import { categoryName, getCategories } from "@/lib/queries/categories";
import { SEARCH_PAGE_SIZE, searchItems } from "@/lib/queries/items";
import { cn } from "@/lib/utils";
import {
  type SearchFilters as Filters,
  parseSearchParams,
  type RawSearchParams,
  searchQuery,
} from "@/lib/validation/search";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/items">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Search",
  });
  return { title: t("title"), description: t("description") };
}

// The query string exactly as requested (keys and values in URL order).
function requestQuery(params: RawSearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value ?? ""]) {
      query.append(key, v);
    }
  }
  return query.toString();
}

// Public feed of lost and found items with search and filters in the URL
// (§12). Every filter set has one canonical URL: anything else (a submitted
// form with empty fields, invalid values, unknown parameters) redirects to it.
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

  const [{ items, total }, t] = await Promise.all([
    searchItems(filters),
    getTranslations("Search"),
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

  // Rendered in full on the server (no Suspense fallback), so the results
  // and redirects work without JavaScript. While a page link or the filter
  // form is loading the next URL, their pending markers dim the results.
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
          <h2
            id="search-results"
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            {totalPages > 1
              ? t("resultRange", {
                  from: first,
                  to: first + items.length - 1,
                  count: total,
                })
              : t("resultCount", { count: total })}
            <span className="hidden items-center gap-1.5 group-has-[[data-pending]]/feed:inline-flex">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              {t("loading")}
            </span>
          </h2>

          <div className="grid gap-4 transition-opacity group-has-[[data-pending]]/feed:pointer-events-none group-has-[[data-pending]]/feed:opacity-50">
            {items.length === 0 ? (
              <EmptyResults filtered={canonical !== ""} />
            ) : (
              <>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <li key={item.id} className="grid">
                      <ItemCard item={item} />
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
          </div>
        </section>
      </div>
    </div>
  );
}

function feedHref(filters: Filters, page: number) {
  return { pathname: "/items", query: searchQuery({ ...filters, page }) };
}

// No results for the filters (with a way back to the whole feed), or no
// reports at all yet (with links to report one).
function EmptyResults({ filtered }: { filtered: boolean }) {
  const t = useTranslations("Search");

  if (filtered) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
        <SearchX className="size-10 text-muted-foreground" aria-hidden />
        <p className="font-medium">{t("emptyTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
        <Link
          href="/items"
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
