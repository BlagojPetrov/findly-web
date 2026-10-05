import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from "./categories";

const { requireAdmin, refresh, run, rpc } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  refresh: vi.fn(),
  run: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("next/cache", () => ({ refresh }));

// A query builder that records every call; awaiting it (or maybeSingle())
// resolves to run(table, calls)'s result.
type Call = [string, ...unknown[]];
function query(table: string) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop === "then") {
          const result = Promise.resolve(run(table, calls));
          return result.then.bind(result);
        }
        return (...args: unknown[]) => {
          calls.push([prop, ...args]);
          return prop === "maybeSingle"
            ? Promise.resolve(run(table, calls))
            : builder;
        };
      },
    },
  );
  return builder;
}
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => query(table),
    rpc: async (name: string, args: object) => rpc(name, args),
  }),
}));

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
}

const fields = { nameMk: "Велосипеди", nameEn: "Bikes", icon: "bike" };
const done = { data: [{ id: 9 }], error: null };
const dbError = (code: string) => ({
  data: null,
  error: { code, message: code },
});

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue({ id: "admin" });
  refresh.mockReset();
  run.mockReset();
  rpc.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createCategory", () => {
  it("adds the category after the last one", async () => {
    run
      .mockResolvedValueOnce({ data: { sort_order: 80 }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const result = await createCategory(form({ slug: "Bikes", ...fields }));
    expect(result).toEqual({ ok: true, data: undefined });
    expect(requireAdmin).toHaveBeenCalled();
    expect(run.mock.calls[1]).toEqual([
      "categories",
      [
        [
          "insert",
          {
            slug: "bikes",
            name_mk: "Велосипеди",
            name_en: "Bikes",
            icon: "bike",
            sort_order: 90,
          },
        ],
      ],
    ]);
    expect(refresh).toHaveBeenCalled();
  });

  it("starts at 10 without categories and maps a taken slug", async () => {
    run
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce(dbError("23505"));
    expect(await createCategory(form({ slug: "keys", ...fields }))).toEqual({
      ok: false,
      error: "category_slug_taken",
    });
    expect(run.mock.calls[1][1][0][1]).toMatchObject({ sort_order: 10 });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("returns field errors without a write", async () => {
    const result = await createCategory(
      form({ slug: "a b", nameMk: "", nameEn: "Bikes", icon: "rocket" }),
    );
    expect(result).toMatchObject({
      ok: false,
      error: "validation",
      fieldErrors: {
        slug: ["categorySlugInvalid"],
        nameMk: ["required"],
        icon: ["categoryIconInvalid"],
      },
    });
    expect(run).not.toHaveBeenCalled();
  });
});

describe("updateCategory", () => {
  it("changes only the names and the icon", async () => {
    run.mockResolvedValueOnce(done);
    expect(
      await updateCategory(form({ id: "9", slug: "changed", ...fields })),
    ).toEqual({ ok: true, data: undefined });
    expect(run.mock.calls[0]).toEqual([
      "categories",
      [
        ["update", { name_mk: "Велосипеди", name_en: "Bikes", icon: "bike" }],
        ["eq", "id", 9],
        ["select", "id"],
      ],
    ]);
  });

  it("answers not_found and database errors", async () => {
    run.mockResolvedValueOnce({ data: [], error: null });
    expect(await updateCategory(form({ id: "9", ...fields }))).toEqual({
      ok: false,
      error: "not_found",
    });
    run.mockResolvedValueOnce(dbError("XX000"));
    expect(await updateCategory(form({ id: "9", ...fields }))).toEqual({
      ok: false,
      error: "database",
    });
  });
});

describe("deleteCategory", () => {
  it("deletes an unused category", async () => {
    run.mockResolvedValueOnce(done);
    expect(await deleteCategory(form({ id: "9" }))).toEqual({
      ok: true,
      data: undefined,
    });
    expect(run.mock.calls[0][1]).toEqual([
      ["delete"],
      ["eq", "id", 9],
      ["select", "id"],
    ]);
    expect(refresh).toHaveBeenCalled();
  });

  it("maps a category in use, the protected one and a missing one", async () => {
    for (const [result, error] of [
      [dbError("23503"), "category_in_use"],
      [dbError("FL409"), "category_protected"],
      [{ data: [], error: null }, "not_found"],
    ] as const) {
      run.mockResolvedValueOnce(result);
      expect(await deleteCategory(form({ id: "9" }))).toEqual({
        ok: false,
        error,
      });
    }
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("reorderCategories", () => {
  it("saves the full order through the RPC", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await reorderCategories(form({ ids: ["3", "1", "2"] }))).toEqual({
      ok: true,
      data: undefined,
    });
    expect(rpc).toHaveBeenCalledWith("admin_reorder_categories", {
      category_ids: [3, 1, 2],
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("maps a stale list and rejects duplicates", async () => {
    rpc.mockResolvedValue(dbError("22023"));
    expect(await reorderCategories(form({ ids: ["1", "2"] }))).toEqual({
      ok: false,
      error: "category_list_changed",
    });
    expect(await reorderCategories(form({ ids: ["1", "1"] }))).toMatchObject({
      ok: false,
      error: "validation",
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
