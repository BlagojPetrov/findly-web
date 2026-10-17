import { z } from "zod";
import type { LatLng } from "@/lib/map";
import { ITEM_TYPES } from "./items";

// Filters of the public feed (/items), kept in the URL (§12 URL contract):
//   ?q=&type=lost|found&category=keys,wallet&status=active|resolved|all
//    &from=YYYY-MM-DD&to=YYYY-MM-DD&lat=41.9981&lng=21.4254&radius=5
//    &sort=newest|relevance|nearest&page=2&view=map
// Every field falls back to its default when it is missing or invalid, so a
// broken or hand-edited URL still shows a feed.

export const SEARCH_STATUSES = ["active", "resolved", "all"] as const;
export const SEARCH_SORTS = ["newest", "relevance", "nearest"] as const;
// How the results are shown: a paged list (default) or a map (P11.S3).
export const SEARCH_VIEWS = ["list", "map"] as const;
// Radius choices in km (search_items() accepts up to 50).
export const SEARCH_RADII = [1, 2, 5, 10, 25, 50] as const;
// Decimals of the center in the URL (~11 m): enough for a 1 km radius, and a
// device location is not put into links more precisely than needed.
export const CENTER_DECIMALS = 4;
export const SEARCH_LIMITS = {
  queryMax: 100,
  categoriesMax: 20,
  // search_items() caps the page size at 50, so deeper pages than this are
  // never needed for a realistic number of items.
  pageMax: 1000,
} as const;

export type SearchStatus = (typeof SEARCH_STATUSES)[number];
export type SearchSort = (typeof SEARCH_SORTS)[number];
export type SearchRadius = (typeof SEARCH_RADII)[number];
export type SearchView = (typeof SEARCH_VIEWS)[number];

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
  // Center for the distance (lat/lng in the URL, rounded to CENTER_DECIMALS)
  // and the radius in km around it; the radius needs a center.
  near: LatLng | null;
  radius: SearchRadius | null;
  sort: SearchSort;
  // Always 1 in the map view, which has no pages.
  page: number;
  view: SearchView;
};

// Search params as Next.js passes them to a page.
export type RawSearchParams = Record<string, string | string[] | undefined>;

// The query string exactly as requested (keys and values in URL order), to
// compare with a page's canonical query.
export function requestQuery(params: RawSearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value ?? ""]) {
      query.append(key, v);
    }
  }
  return query.toString();
}

// Sorts that make sense for the filters: relevance needs a query, nearest a
// center.
export function availableSorts({
  q,
  near,
}: Pick<SearchFilters, "q" | "near">): SearchSort[] {
  return SEARCH_SORTS.filter(
    (sort) =>
      sort === "newest" ||
      (sort === "relevance" && q !== "") ||
      (sort === "nearest" && near !== null),
  );
}

// With a center the nearest items come first; otherwise with a query the
// best matches; otherwise (nothing to rank) the newest.
export function defaultSort({
  q,
  near,
}: Pick<SearchFilters, "q" | "near">): SearchSort {
  if (near) return "nearest";
  return q ? "relevance" : "newest";
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  q: "",
  type: null,
  categories: [],
  status: "active",
  from: null,
  to: null,
  near: null,
  radius: null,
  sort: "newest",
  page: 1,
  view: "list",
};

const slugPattern = /^[a-z0-9-]+$/;

// A repeated parameter (?type=lost&type=found) counts with its first value.
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const roundCoordinate = (value: number) =>
  Number(value.toFixed(CENTER_DECIMALS));

// A center coordinate as written to the URL ("41.9981", "21.4").
export const centerParam = (value: number) => String(roundCoordinate(value));

// A coordinate in the URL: a plain decimal number (no "", "1e2", "0x1").
function coordinate(max: number) {
  return z
    .preprocess(
      first,
      z
        .string()
        .regex(/^-?\d{1,3}(\.\d+)?$/)
        .transform(Number)
        .pipe(z.number().min(-max).max(max))
        .transform(roundCoordinate)
        .nullable(),
    )
    .catch(null);
}

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
      lat: coordinate(90),
      lng: coordinate(180),
      radius: z
        .preprocess(
          first,
          z.coerce
            .number()
            .refine((value): value is SearchRadius =>
              (SEARCH_RADII as readonly number[]).includes(value),
            )
            .nullable(),
        )
        .catch(null),
      sort: z
        .preprocess(first, z.enum(SEARCH_SORTS).optional())
        .catch(undefined),
      page: z
        .preprocess(
          first,
          z.coerce.number().int().min(1).max(SEARCH_LIMITS.pageMax),
        )
        .catch(1),
      view: z.preprocess(first, z.enum(SEARCH_VIEWS)).catch("list"),
    })
    .transform(
      ({
        category,
        from,
        to,
        lat,
        lng,
        radius,
        sort,
        page,
        ...rest
      }): SearchFilters => {
        // A reversed range is most likely the two dates swapped.
        const [start, end] = from && to && from > to ? [to, from] : [from, to];
        // Both coordinates or no center; a radius only around a center.
        const near = lat !== null && lng !== null ? { lat, lng } : null;
        const available = availableSorts({ q: rest.q, near });
        return {
          ...rest,
          categories: category,
          from: start,
          to: end,
          near,
          radius: near ? radius : null,
          sort:
            sort && available.includes(sort)
              ? sort
              : defaultSort({ q: rest.q, near }),
          page: rest.view === "map" ? 1 : page,
        };
      },
    );
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
// Link's `query` or with new URLSearchParams(). The map view has no page;
// switching views with `{ ...filters, view }` keeps every other criterion.
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
  if (f.near) {
    query.lat = centerParam(f.near.lat);
    query.lng = centerParam(f.near.lng);
    if (f.radius) query.radius = String(f.radius);
  }
  if (f.sort !== defaultSort(f) && availableSorts(f).includes(f.sort)) {
    query.sort = f.sort;
  }
  if (f.view === "map") query.view = f.view;
  else if (f.page > 1) query.page = String(f.page);
  return query;
}

// Query of the feed's map view for a URL of the former /map page (P11.S3):
// its only filter, a valid type, is kept; everything else is dropped.
export function mapRedirectQuery(
  params: RawSearchParams,
): Record<string, string> {
  const { type } = parseSearchParams({ type: params.type });
  return searchQuery({ type, view: "map" });
}
