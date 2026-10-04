import { beforeEach, describe, expect, it, vi } from "vitest";
import { addFavorite, removeFavorite } from "./favorites";

const { requireUser, run, refresh } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  run: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser }));
vi.mock("next/cache", () => ({ refresh }));
// from(table).insert(values) | .delete().eq(…).eq(…), awaited
// → run(table, operation, values, filters)'s result.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      insert: (values: object) => run(table, "insert", values, []),
      delete: () => {
        const filters: [string, string][] = [];
        const chain = {
          eq: (column: string, value: string) => {
            filters.push([column, value]);
            return chain;
          },
          then: (
            resolve: (value: unknown) => unknown,
            reject: (reason: unknown) => unknown,
          ) =>
            Promise.resolve(run(table, "delete", undefined, filters)).then(
              resolve,
              reject,
            ),
        };
        return chain;
      },
    }),
  }),
}));

const userId = "00000000-0000-4000-8000-00000000000a";
const itemId = "47000000-0000-4000-8000-000000000001";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue({ id: userId });
  refresh.mockReset();
  run.mockReset().mockResolvedValue({ data: null, error: null });
});

describe("addFavorite", () => {
  it("saves the item for the signed-in user and refreshes the page", async () => {
    const result = await addFavorite(form({ itemId, userId: "other" }));
    expect(result).toEqual({ ok: true, data: undefined });
    expect(requireUser).toHaveBeenCalled();
    expect(run).toHaveBeenCalledWith(
      "favorites",
      "insert",
      { user_id: userId, item_id: itemId },
      [],
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("treats an item that is already saved as success", async () => {
    run.mockResolvedValue({ data: null, error: { code: "23505" } });
    expect(await addFavorite(form({ itemId }))).toEqual({
      ok: true,
      data: undefined,
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("maps the RLS check to favorite_unavailable", async () => {
    run.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "row-level security" },
    });
    expect(await addFavorite(form({ itemId }))).toEqual({
      ok: false,
      error: "favorite_unavailable",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports other database errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    run.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "boom" },
    });
    expect(await addFavorite(form({ itemId }))).toEqual({
      ok: false,
      error: "database",
    });
  });

  it.each([[""], ["not-a-uuid"]])("rejects the item id %j", async (value) => {
    const result = await addFavorite(form({ itemId: value }));
    expect(result).toMatchObject({ ok: false, error: "validation" });
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects a form without an item id", async () => {
    const result = await addFavorite(new FormData());
    expect(result).toMatchObject({ ok: false, error: "validation" });
    expect(run).not.toHaveBeenCalled();
  });
});

describe("removeFavorite", () => {
  it("deletes only the user's own row and refreshes the page", async () => {
    const result = await removeFavorite(form({ itemId }));
    expect(result).toEqual({ ok: true, data: undefined });
    expect(run).toHaveBeenCalledWith("favorites", "delete", undefined, [
      ["user_id", userId],
      ["item_id", itemId],
    ]);
    expect(refresh).toHaveBeenCalled();
  });

  it("reports database errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    run.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "boom" },
    });
    expect(await removeFavorite(form({ itemId }))).toEqual({
      ok: false,
      error: "database",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("rejects an invalid item id", async () => {
    const result = await removeFavorite(form({ itemId: "x" }));
    expect(result).toMatchObject({ ok: false, error: "validation" });
    expect(run).not.toHaveBeenCalled();
  });
});
