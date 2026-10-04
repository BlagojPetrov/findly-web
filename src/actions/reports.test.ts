import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportItem } from "./reports";

const { requireUser, insert, refresh } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  insert: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser }));
vi.mock("next/cache", () => ({ refresh }));
// from(table).insert(values), awaited → insert(table, values)'s result.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      insert: (values: object) => insert(table, values),
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
  insert.mockReset().mockResolvedValue({ data: null, error: null });
});

describe("reportItem", () => {
  it("files the report as the signed-in user and refreshes the page", async () => {
    const result = await reportItem(
      form({
        itemId,
        reason: "fraud",
        details: " Asks for money\r\nfirst ",
        reporterId: "other",
      }),
    );
    expect(result).toEqual({ ok: true, data: undefined });
    expect(requireUser).toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith("reports", {
      reporter_id: userId,
      item_id: itemId,
      reason: "fraud",
      details: "Asks for money\nfirst",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("stores missing or blank details as null", async () => {
    await reportItem(form({ itemId, reason: "spam" }));
    await reportItem(form({ itemId, reason: "spam", details: "   " }));
    for (const call of insert.mock.calls) {
      expect(call[1]).toMatchObject({ details: null });
    }
  });

  it("maps an open report of the user to report_duplicate", async () => {
    insert.mockResolvedValue({ data: null, error: { code: "23505" } });
    expect(await reportItem(form({ itemId, reason: "spam" }))).toEqual({
      ok: false,
      error: "report_duplicate",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("maps the RLS check to report_unavailable", async () => {
    insert.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "row-level security" },
    });
    expect(await reportItem(form({ itemId, reason: "spam" }))).toEqual({
      ok: false,
      error: "report_unavailable",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports other database errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    insert.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "boom" },
    });
    expect(await reportItem(form({ itemId, reason: "spam" }))).toEqual({
      ok: false,
      error: "database",
    });
  });

  it("returns field errors without writing", async () => {
    const result = await reportItem(
      form({ itemId: "nope", details: "a".repeat(501) }),
    );
    expect(result).toMatchObject({
      ok: false,
      error: "validation",
      fieldErrors: {
        itemId: ["invalidValue"],
        reason: ["reportReasonInvalid"],
        details: ["reportDetailsTooLong"],
      },
    });
    expect(insert).not.toHaveBeenCalled();
  });
});
