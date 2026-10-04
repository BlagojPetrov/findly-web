import { beforeEach, describe, expect, it, vi } from "vitest";
import { FAVORITES_PAGE_SIZE, getFavoritePage, isFavorite } from "./favorites";

const { run } = vi.hoisted(() => ({ run: vi.fn() }));

vi.mock("server-only", () => ({}));
// from(table).select(columns, options) followed by any chain of filters,
// orders and range, awaited (or ended with maybeSingle()) → run(call)'s
// result, where `call` records the whole chain.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: (columns: string, options?: object) => {
        const call = {
          table,
          columns,
          options,
          steps: [] as [string, ...unknown[]][],
        };
        const chain = {
          eq: (...args: unknown[]) => (call.steps.push(["eq", ...args]), chain),
          in: (...args: unknown[]) => (call.steps.push(["in", ...args]), chain),
          order: (...args: unknown[]) => (
            call.steps.push(["order", ...args]),
            chain
          ),
          range: (...args: unknown[]) => (
            call.steps.push(["range", ...args]),
            chain
          ),
          maybeSingle: async () => run(call),
          then: (
            resolve: (value: unknown) => unknown,
            reject: (reason: unknown) => unknown,
          ) => Promise.resolve(run(call)).then(resolve, reject),
        };
        return chain;
      },
    }),
  }),
}));

const userId = "00000000-0000-4000-8000-00000000000a";
const itemId = "47000000-0000-4000-8000-000000000001";

function favoriteRow(id: string, overrides: object = {}) {
  return {
    created_at: "2026-10-04T10:00:00+00:00",
    item: {
      id,
      type: "found",
      status: "active",
      title: "Клучеви",
      occurred_on: "2026-10-02",
      location_name: null,
      created_at: "2026-10-02T08:00:00+00:00",
      category: {
        id: 4,
        slug: "keys",
        name_mk: "Клучеви",
        name_en: "Keys",
        icon: "key",
      },
      images: [
        { storage_path: `owner/${id}-b.webp`, position: 1 },
        { storage_path: `owner/${id}-a.webp`, position: 0 },
      ],
      ...overrides,
    },
  };
}

beforeEach(() => {
  run.mockReset();
});

describe("getFavoritePage", () => {
  it("loads the user's listed favorites, most recently saved first", async () => {
    run.mockResolvedValue({
      data: [favoriteRow(itemId), favoriteRow("other", { images: [] })],
      error: null,
      count: 2,
    });
    const { items, total } = await getFavoritePage(userId, 1);

    expect(run).toHaveBeenCalledTimes(1);
    const call = run.mock.calls[0][0];
    expect(call.table).toBe("favorites");
    // Inner join: favorites of unlisted reports are left out, also from the count.
    expect(call.columns).toMatch(/item:items!inner\s*\(/);
    expect(call.columns).toContain("category:categories");
    expect(call.options).toEqual({ count: "exact" });
    expect(call.steps).toEqual([
      ["eq", "user_id", userId],
      ["in", "item.status", ["active", "resolved"]],
      ["order", "created_at", { ascending: false }],
      ["order", "item_id", { ascending: false }],
      ["range", 0, FAVORITES_PAGE_SIZE - 1],
    ]);

    expect(total).toBe(2);
    expect(items.map((item) => item.id)).toEqual([itemId, "other"]);
    expect(items[0]).toMatchObject({
      type: "found",
      status: "active",
      title: "Клучеви",
      category: { slug: "keys" },
      coverPath: `owner/${itemId}-a.webp`,
      isFavorite: true,
    });
    expect(items[0]).not.toHaveProperty("images");
    expect(items[1].coverPath).toBeNull();
  });

  it("asks for the rows of a later page", async () => {
    run.mockResolvedValue({ data: [], error: null, count: 45 });
    await getFavoritePage(userId, 3);
    expect(run.mock.calls[0][0].steps).toContainEqual([
      "range",
      2 * FAVORITES_PAGE_SIZE,
      3 * FAVORITES_PAGE_SIZE - 1,
    ]);
  });

  it("returns the total of listed favorites for a page past the end", async () => {
    run
      .mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST103", message: "Requested range not satisfiable" },
        count: null,
      })
      .mockResolvedValueOnce({ data: null, error: null, count: 21 });
    expect(await getFavoritePage(userId, 9)).toEqual({ items: [], total: 21 });

    const count = run.mock.calls[1][0];
    expect(count.options).toEqual({ count: "exact", head: true });
    expect(count.columns).toMatch(/items!inner/);
    expect(count.steps).toEqual([
      ["eq", "user_id", userId],
      ["in", "item.status", ["active", "resolved"]],
    ]);
  });

  it("throws when the count for a page past the end fails", async () => {
    run
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST103" } })
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(getFavoritePage(userId, 9)).rejects.toThrow(
      "Failed to count favorites: boom",
    );
  });

  it("throws with the database error", async () => {
    run.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "boom" },
      count: null,
    });
    await expect(getFavoritePage(userId, 1)).rejects.toThrow(
      "Failed to load favorites: boom",
    );
  });
});

describe("isFavorite", () => {
  it("is true when the user's row exists", async () => {
    run.mockResolvedValue({ data: { item_id: itemId }, error: null });
    expect(await isFavorite(itemId, userId)).toBe(true);
    expect(run.mock.calls[0][0].steps).toEqual([
      ["eq", "item_id", itemId],
      ["eq", "user_id", userId],
    ]);
  });

  it("is false without a row", async () => {
    run.mockResolvedValue({ data: null, error: null });
    expect(await isFavorite(itemId, userId)).toBe(false);
  });
});
