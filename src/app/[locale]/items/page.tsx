import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemCard } from "@/components/items/item-card";
import { SearchFilters } from "@/components/search/search-filters";
import { getPathname, redirect } from "@/i18n/navigation";
import { todayInAppTimeZone } from "@/lib/dates";
import { categoryName, getCategories } from "@/lib/queries/categories";
import { searchItems } from "@/lib/queries/items";
import {
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
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
            className="text-sm text-muted-foreground"
          >
            {t("resultCount", { count: total })}
          </h2>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
              <SearchX className="size-10 text-muted-foreground" aria-hidden />
              <p className="font-medium">
                {t(canonical ? "emptyTitle" : "emptyFeed")}
              </p>
              {canonical && (
                <p className="text-sm text-muted-foreground">
                  {t("emptyDescription")}
                </p>
              )}
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <li key={item.id} className="grid">
                  <ItemCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
