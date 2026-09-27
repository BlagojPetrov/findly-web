import { z } from "zod";
import { ITEM_TYPES } from "./items";

// Filters of the public feed (/items), kept in the URL (§12 URL contract):
//   ?q=&type=lost|found&category=keys,wallet&status=active|resolved|all
//    &from=YYYY-MM-DD&to=YYYY-MM-DD&sort=newest|relevance&page=2
// Every field falls back to its default when it is missing or invalid, so a
// broken or hand-edited URL still shows a feed. Location (lat, lng, radius,
// sort=nearest) is added in P5.S5.

export const SEARCH_STATUSES = ["active", "resolved", "all"] as const;
export const SEARCH_SORTS = ["newest", "relevance"] as const;
export const SEARCH_LIMITS = {
  queryMax: 100,
  categoriesMax: 20,
  // search_items() caps the page size at 50, so deeper pages than this are
  // never needed for a realistic number of items.
  pageMax: 1000,
} as const;

export type SearchStatus = (typeof SEARCH_STATUSES)[number];
export type SearchSort = (typeof SEARCH_SORTS)[number];

export type SearchFilters = {
  // Trimmed, whitespace collapsed; "" = no text search.
  q: string;
  type: (typeof ITEM_TYPES)[number] | null;
  // Category slugs, without duplicates, in URL order.
  categories: string[];
  status: SearchStatus;
  // Calendar days "YYYY-MM-DD" (occurred on), inclusive.
  from: string | null;
  to: string | null;
  sort: SearchSort;
  page: number;
};

// Search params as Next.js passes them to a page.
export type RawSearchParams = Record<string, string | string[] | undefined>;

// Without a query there is nothing to rank, so the list is newest first;
// with one, the best matches come first.
export function defaultSort(q: string): SearchSort {
  return q ? "relevance" : "newest";
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  q: "",
  type: null,
  categories: [],
  status: "active",
  from: null,
  to: null,
  sort: defaultSort(""),
  page: 1,
};

const slugPattern = /^[a-z0-9-]+$/;

// A repeated parameter (?type=lost&type=found) counts with its first value.
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

function cleanQuery(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_LIMITS.queryMax)
    .trim();
}

// "keys,wallet" or repeated ?category=keys&category=wallet. Invalid slugs
// (and unknown ones, when the known slugs are given) are dropped one by one.
function cleanCategories(value: unknown, known?: readonly string[]) {
  const values = Array.isArray(value) ? value : [value];
  const slugs = values
    .filter((v): v is string => typeof v === "string")
    .flatMap((v) => v.split(","))
    .map((slug) => slug.trim().toLowerCase())
    .filter((slug) => slugPattern.test(slug))
    .filter((slug) => !known || known.includes(slug));
  return [...new Set(slugs)].slice(0, SEARCH_LIMITS.categoriesMax);
}

// Schema for the raw search params. `categorySlugs` (the existing
// categories) lets it drop slugs that match nothing.
export function searchParamsSchema({
  categorySlugs,
}: { categorySlugs?: readonly string[] } = {}) {
  const date = z.preprocess(first, z.iso.date().nullable()).catch(null);
  return z
    .object({
      q: z.preprocess(first, z.string().transform(cleanQuery)).catch(""),
      type: z.preprocess(first, z.enum(ITEM_TYPES).nullable()).catch(null),
      category: z
        .unknown()
        .optional()
        .transform((value) => cleanCategories(value, categorySlugs)),
      status: z.preprocess(first, z.enum(SEARCH_STATUSES)).catch("active"),
      from: date,
      to: date,
      sort: z
        .preprocess(first, z.enum(SEARCH_SORTS).optional())
        .catch(undefined),
      page: z
        .preprocess(
          first,
          z.coerce.number().int().min(1).max(SEARCH_LIMITS.pageMax),
        )
        .catch(1),
    })
    .transform(({ category, from, to, sort, ...rest }): SearchFilters => {
      // A reversed range is most likely the two dates swapped.
      const [start, end] = from && to && from > to ? [to, from] : [from, to];
      return {
        ...rest,
        categories: category,
        from: start,
        to: end,
        // Without a query there is nothing to rank.
        sort: rest.q ? (sort ?? defaultSort(rest.q)) : "newest",
      };
    });
}

// Parses a page's searchParams (or URLSearchParams) into filters. Never
// throws: invalid values become their defaults.
export function parseSearchParams(
  params: RawSearchParams | URLSearchParams,
  options?: { categorySlugs?: readonly string[] },
): SearchFilters {
  const raw: RawSearchParams =
    params instanceof URLSearchParams
      ? Object.fromEntries(
          [...new Set(params.keys())].map((key) => [key, params.getAll(key)]),
        )
      : params;
  return searchParamsSchema(options).parse(raw);
}

// The URL query of the filters, without default values (so "/items" is the
// default feed and every filter set has one canonical URL). Use it as a
// Link's `query` or with new URLSearchParams().
export function searchQuery(
  filters: Partial<SearchFilters>,
): Record<string, string> {
  const f = { ...DEFAULT_SEARCH_FILTERS, ...filters };
  const query: Record<string, string> = {};
  if (f.q) query.q = f.q;
  if (f.type) query.type = f.type;
  if (f.categories.length > 0) query.category = f.categories.join(",");
  if (f.status !== DEFAULT_SEARCH_FILTERS.status) query.status = f.status;
  if (f.from) query.from = f.from;
  if (f.to) query.to = f.to;
  if (f.q && f.sort !== defaultSort(f.q)) query.sort = f.sort;
  if (f.page > 1) query.page = String(f.page);
  return query;
}
