import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_FILTERS,
  parseSearchParams,
  type SearchFilters,
  searchQuery,
} from "./search";

const categorySlugs = ["electronics", "wallet", "keys", "other"];
const parse = (params: Record<string, string | string[] | undefined>) =>
  parseSearchParams(params, { categorySlugs });

describe("parseSearchParams", () => {
  it("returns the defaults for an empty URL", () => {
    expect(parse({})).toEqual(DEFAULT_SEARCH_FILTERS);
    expect(DEFAULT_SEARCH_FILTERS).toMatchObject({
      status: "active",
      sort: "newest",
      page: 1,
    });
  });

  it("parses every filter", () => {
    expect(
      parse({
        q: "  црн   паричник ",
        type: "lost",
        category: "wallet,keys",
        status: "resolved",
        from: "2026-09-01",
        to: "2026-09-20",
        sort: "newest",
        page: "3",
      }),
    ).toEqual({
      q: "црн паричник",
      type: "lost",
      categories: ["wallet", "keys"],
      status: "resolved",
      from: "2026-09-01",
      to: "2026-09-20",
      sort: "newest",
      page: 3,
    } satisfies SearchFilters);
  });

  it.each([
    ["type", "stolen", { type: null }],
    ["type", "", { type: null }],
    ["status", "hidden", { status: "active" }],
    ["status", "ACTIVE", { status: "active" }],
    ["from", "2026-13-01", { from: null }],
    ["from", "2026-02-30", { from: null }],
    ["to", "yesterday", { to: null }],
    ["to", "2026-09-20T10:00:00Z", { to: null }],
    ["sort", "nearest", { sort: "newest" }],
    ["page", "0", { page: 1 }],
    ["page", "-2", { page: 1 }],
    ["page", "2.5", { page: 1 }],
    ["page", "abc", { page: 1 }],
    ["page", "", { page: 1 }],
    ["page", "1001", { page: 1 }],
  ])("invalid %s=%j falls back to the default", (key, value, expected) => {
    expect(parse({ [key]: value })).toEqual({
      ...DEFAULT_SEARCH_FILTERS,
      ...expected,
    });
  });

  it("keeps valid fields when others are invalid", () => {
    expect(
      parse({ type: "found", status: "bogus", page: "2", from: "x" }),
    ).toEqual({ ...DEFAULT_SEARCH_FILTERS, type: "found", page: 2 });
  });

  it("uses the first value of a repeated parameter", () => {
    expect(parse({ type: ["found", "lost"], page: ["4", "5"] })).toMatchObject({
      type: "found",
      page: 4,
    });
  });

  it("cleans the query", () => {
    expect(parse({ q: "   " }).q).toBe("");
    expect(parse({ q: "a\n\tb" }).q).toBe("a b");
    expect(parse({ q: "x".repeat(150) }).q).toHaveLength(100);
  });

  it("sorts by relevance by default when there is a query", () => {
    expect(parse({ q: "keys" }).sort).toBe("relevance");
    expect(parse({ q: "keys", sort: "newest" }).sort).toBe("newest");
    expect(parse({ q: "keys", sort: "bogus" }).sort).toBe("relevance");
    expect(parse({ q: "  " }).sort).toBe("newest");
    expect(parse({ sort: "relevance" }).sort).toBe("newest");
  });

  describe("categories", () => {
    it.each([
      ["wallet", ["wallet"]],
      [" Wallet , KEYS ", ["wallet", "keys"]],
      ["wallet,,keys,", ["wallet", "keys"]],
      ["wallet,wallet", ["wallet"]],
      ["wallet,unknown,keys", ["wallet", "keys"]],
      ["wal let,<script>", []],
      ["", []],
    ])("%j → %j", (value, expected) => {
      expect(parse({ category: value }).categories).toEqual(expected);
    });

    it("accepts repeated parameters", () => {
      expect(parse({ category: ["wallet", "keys,other"] }).categories).toEqual([
        "wallet",
        "keys",
        "other",
      ]);
    });

    it("checks only the format without the known slugs", () => {
      expect(
        parseSearchParams({ category: "new-slug,Bad Slug" }).categories,
      ).toEqual(["new-slug"]);
    });

    it("keeps at most 20", () => {
      const many = Array.from({ length: 30 }, (_, i) => `c${i}`).join(",");
      expect(parseSearchParams({ category: many }).categories).toHaveLength(20);
    });
  });

  it("swaps a reversed date range", () => {
    expect(parse({ from: "2026-09-20", to: "2026-09-01" })).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-20",
    });
    expect(parse({ from: "2026-09-20" })).toMatchObject({
      from: "2026-09-20",
      to: null,
    });
  });

  it("accepts URLSearchParams", () => {
    const params = new URLSearchParams(
      "q=keys&category=wallet&category=keys&page=2",
    );
    expect(parseSearchParams(params, { categorySlugs })).toEqual({
      ...DEFAULT_SEARCH_FILTERS,
      q: "keys",
      categories: ["wallet", "keys"],
      sort: "relevance",
      page: 2,
    });
  });
});

describe("searchQuery", () => {
  it("is empty for the defaults", () => {
    expect(searchQuery(DEFAULT_SEARCH_FILTERS)).toEqual({});
    expect(searchQuery({})).toEqual({});
  });

  it("writes only non-default values", () => {
    expect(
      searchQuery({
        q: "keys",
        type: "found",
        categories: ["wallet", "keys"],
        status: "all",
        from: "2026-09-01",
        to: "2026-09-20",
        sort: "newest",
        page: 2,
      }),
    ).toEqual({
      q: "keys",
      type: "found",
      category: "wallet,keys",
      status: "all",
      from: "2026-09-01",
      to: "2026-09-20",
      sort: "newest",
      page: "2",
    });
  });

  it("omits the default sort, and any sort without a query", () => {
    expect(searchQuery({ q: "keys", sort: "relevance" })).toEqual({
      q: "keys",
    });
    expect(searchQuery({ sort: "relevance" })).toEqual({});
  });

  it("omits page 1 and status active", () => {
    expect(searchQuery({ page: 1, status: "active" })).toEqual({});
  });
});

describe("round trip", () => {
  const cases: SearchFilters[] = [
    DEFAULT_SEARCH_FILTERS,
    { ...DEFAULT_SEARCH_FILTERS, q: "црн паричник", sort: "relevance" },
    { ...DEFAULT_SEARCH_FILTERS, q: "keys", sort: "newest", page: 3 },
    {
      q: "Samsung telefon",
      type: "lost",
      categories: ["electronics", "other"],
      status: "all",
      from: "2026-01-31",
      to: "2026-02-28",
      sort: "relevance",
      page: 7,
    },
    { ...DEFAULT_SEARCH_FILTERS, type: "found", status: "resolved" },
  ];

  it.each(cases)("parse(serialize(%j)) returns the same filters", (filters) => {
    const url = new URLSearchParams(searchQuery(filters));
    expect(parseSearchParams(url, { categorySlugs })).toEqual(filters);
  });

  it.each([
    "q=%20keys%20%20ring&sort=relevance&page=1&status=active",
    "category=Keys,wallet,keys&type=lost&from=2026-09-20&to=2026-09-01",
    "status=bogus&page=x&q=",
    "sort=relevance&q=",
  ])("serialize(parse(%s)) is canonical", (search) => {
    const once = searchQuery(
      parseSearchParams(new URLSearchParams(search), { categorySlugs }),
    );
    const twice = searchQuery(
      parseSearchParams(new URLSearchParams(once), { categorySlugs }),
    );
    expect(twice).toEqual(once);
  });

  it("canonical URL of a messy one", () => {
    expect(
      searchQuery(
        parseSearchParams(
          new URLSearchParams(
            "q=%20keys%20%20ring&sort=relevance&page=1&status=active&category=Keys,wallet,keys",
          ),
          { categorySlugs },
        ),
      ),
    ).toEqual({ q: "keys ring", category: "keys,wallet" });
  });
});
