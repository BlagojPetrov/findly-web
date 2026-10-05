import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeReports, hideItem, restoreItem, setUserBanned } from "./admin";

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

const itemId = "10000000-0000-4000-8000-000000000001";
const reportIds = [
  "47000000-0000-4000-8000-000000000001",
  "47000000-0000-4000-8000-000000000002",
];

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
}

// Results per query, in order: item read, then writes.
function results(
  ...values: {
    data: unknown;
    error: { code?: string; message: string } | null;
  }[]
) {
  for (const value of values) run.mockResolvedValueOnce(value);
}

const done = { data: [{ id: "x" }], error: null };

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue({ id: "admin" });
  refresh.mockReset();
  run.mockReset();
  rpc.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("hideItem", () => {
  it("hides the report and resolves the flags shown with it", async () => {
    results(
      { data: { id: itemId, status: "active" }, error: null },
      done,
      done,
    );
    const result = await hideItem(form({ itemId, reportIds }));
    expect(result).toEqual({ ok: true, data: undefined });
    expect(requireAdmin).toHaveBeenCalled();
    const [read, hide, resolve] = run.mock.calls;
    expect(read[0]).toBe("items");
    expect(hide).toEqual([
      "items",
      [
        ["update", { status: "hidden" }],
        ["eq", "id", itemId],
        ["neq", "status", "hidden"],
        ["select", "id"],
      ],
    ]);
    expect(resolve).toEqual([
      "reports",
      [
        ["update", { status: "resolved" }],
        ["eq", "item_id", itemId],
        ["eq", "status", "open"],
        ["in", "id", reportIds],
        ["select", "id"],
      ],
    ]);
    expect(refresh).toHaveBeenCalled();
  });

  it("only resolves the flags of a report that is already hidden", async () => {
    results({ data: { id: itemId, status: "hidden" }, error: null }, done);
    await hideItem(form({ itemId, reportIds: reportIds[0] }));
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[1][0]).toBe("reports");
  });

  it("hides a report without flags", async () => {
    results({ data: { id: itemId, status: "resolved" }, error: null }, done);
    expect(await hideItem(form({ itemId }))).toEqual({
      ok: true,
      data: undefined,
    });
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[1][0]).toBe("items");
  });

  it("answers not_found for a deleted report", async () => {
    results({ data: null, error: null });
    expect(await hideItem(form({ itemId, reportIds }))).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("maps database errors and invalid input", async () => {
    results(
      { data: { id: itemId, status: "active" }, error: null },
      { data: null, error: { code: "42501", message: "rls" } },
    );
    expect(await hideItem(form({ itemId, reportIds }))).toEqual({
      ok: false,
      error: "database",
    });
    expect(run).toHaveBeenCalledTimes(2);
    expect(await hideItem(form({ itemId: "x" }))).toMatchObject({
      ok: false,
      error: "validation",
    });
    expect(run).toHaveBeenCalledTimes(2);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("restoreItem", () => {
  it("restores an active report to active", async () => {
    results(
      {
        data: { id: itemId, status: "hidden", resolved_at: null },
        error: null,
      },
      done,
    );
    expect(await restoreItem(form({ itemId }))).toEqual({
      ok: true,
      data: undefined,
    });
    expect(run.mock.calls[1]).toEqual([
      "items",
      [
        ["update", { status: "active" }],
        ["eq", "id", itemId],
        ["eq", "status", "hidden"],
        ["select", "id"],
      ],
    ]);
    expect(refresh).toHaveBeenCalled();
  });

  it("restores a resolved report to resolved", async () => {
    results(
      {
        data: { id: itemId, status: "hidden", resolved_at: "2026-10-01" },
        error: null,
      },
      done,
    );
    await restoreItem(form({ itemId }));
    expect(run.mock.calls[1][1][0]).toEqual(["update", { status: "resolved" }]);
  });

  it("does nothing for a report that is not hidden", async () => {
    results({
      data: { id: itemId, status: "active", resolved_at: null },
      error: null,
    });
    expect(await restoreItem(form({ itemId }))).toEqual({
      ok: true,
      data: undefined,
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("answers not_found and database errors", async () => {
    results({ data: null, error: null });
    expect(await restoreItem(form({ itemId }))).toEqual({
      ok: false,
      error: "not_found",
    });
    results({ data: null, error: { message: "down" } });
    expect(await restoreItem(form({ itemId }))).toEqual({
      ok: false,
      error: "database",
    });
  });
});

describe("closeReports", () => {
  it("dismisses or resolves only the open flags shown", async () => {
    for (const outcome of ["dismissed", "resolved"]) {
      run.mockReset();
      results(done);
      expect(await closeReports(form({ itemId, reportIds, outcome }))).toEqual({
        ok: true,
        data: undefined,
      });
      expect(run.mock.calls[0]).toEqual([
        "reports",
        [
          ["update", { status: outcome }],
          ["eq", "item_id", itemId],
          ["eq", "status", "open"],
          ["in", "id", reportIds],
          ["select", "id"],
        ],
      ]);
    }
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("rejects missing flags or outcomes without a write", async () => {
    expect(
      await closeReports(form({ itemId, outcome: "dismissed" })),
    ).toMatchObject({ ok: false, error: "validation" });
    expect(
      await closeReports(form({ itemId, reportIds, outcome: "open" })),
    ).toMatchObject({ ok: false, error: "validation" });
    expect(run).not.toHaveBeenCalled();
  });

  it("maps database errors", async () => {
    results({ data: null, error: { message: "down" } });
    expect(
      await closeReports(form({ itemId, reportIds, outcome: "resolved" })),
    ).toEqual({ ok: false, error: "database" });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("setUserBanned", () => {
  const userId = "00000000-0000-4000-8000-00000000000b";

  it("bans and unbans through admin_set_banned", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await setUserBanned(form({ userId, banned: "true" }))).toEqual({
      ok: true,
      data: undefined,
    });
    expect(rpc).toHaveBeenCalledWith("admin_set_banned", {
      target_user_id: userId,
      banned: true,
    });
    await setUserBanned(form({ userId, banned: "false" }));
    expect(rpc).toHaveBeenLastCalledWith("admin_set_banned", {
      target_user_id: userId,
      banned: false,
    });
    expect(requireAdmin).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("maps refusals and errors", async () => {
    for (const [code, error] of [
      ["42501", "forbidden"],
      ["P0002", "not_found"],
      ["XX000", "database"],
    ]) {
      rpc.mockResolvedValueOnce({ data: null, error: { code, message: code } });
      expect(await setUserBanned(form({ userId, banned: "true" }))).toEqual({
        ok: false,
        error,
      });
    }
    expect(refresh).not.toHaveBeenCalled();
  });

  it("rejects invalid input without calling the database", async () => {
    expect(
      await setUserBanned(form({ userId: "x", banned: "true" })),
    ).toMatchObject({ ok: false, error: "validation" });
    expect(
      await setUserBanned(form({ userId, banned: "maybe" })),
    ).toMatchObject({ ok: false, error: "validation" });
    expect(rpc).not.toHaveBeenCalled();
  });
});
