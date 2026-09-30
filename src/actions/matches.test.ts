import { beforeEach, describe, expect, it, vi } from "vitest";
import { setMatchStatus } from "./matches";

const { requireUser, update } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser }));
// from("matches").update(values).eq("id", id).select("id") → update(...)'s result.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      update: (values: object) => ({
        eq: (column: string, value: string) => ({
          select: async () => update(table, values, column, value),
        }),
      }),
    }),
  }),
}));

const matchId = "55000000-0000-4000-8000-000000000001";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue({ id: "user" });
  update.mockReset();
});

describe("setMatchStatus", () => {
  it("updates only the status of the match", async () => {
    update.mockResolvedValue({ data: [{ id: matchId }], error: null });
    const result = await setMatchStatus(form({ matchId, status: "confirmed" }));
    expect(result).toEqual({ ok: true, data: undefined });
    expect(requireUser).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      "matches",
      { status: "confirmed" },
      "id",
      matchId,
    );
  });

  it("ignores other fields in the form", async () => {
    update.mockResolvedValue({ data: [{ id: matchId }], error: null });
    const data = form({ matchId, status: "dismissed", score: "1" });
    await setMatchStatus(data);
    expect(update).toHaveBeenCalledWith(
      "matches",
      { status: "dismissed" },
      "id",
      matchId,
    );
  });

  it("rejects invalid input without a query", async () => {
    const result = await setMatchStatus(form({ matchId, status: "deleted" }));
    expect(result).toMatchObject({ ok: false, error: "validation" });
    expect(update).not.toHaveBeenCalled();
  });

  it("reports a match the user cannot change as not found", async () => {
    // RLS: another user's match updates no rows.
    update.mockResolvedValue({ data: [], error: null });
    const result = await setMatchStatus(form({ matchId, status: "confirmed" }));
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("maps an RLS rejection (banned user) to forbidden", async () => {
    update.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "new row violates row-level security" },
    });
    const result = await setMatchStatus(form({ matchId, status: "confirmed" }));
    expect(result).toEqual({ ok: false, error: "forbidden" });
  });

  it("maps other errors to database", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    update.mockResolvedValue({
      data: null,
      error: { code: "08006", message: "connection failure" },
    });
    const result = await setMatchStatus(form({ matchId, status: "confirmed" }));
    expect(result).toEqual({ ok: false, error: "database" });
  });
});
