import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteNotification,
  markAllNotificationsRead,
  setNotificationRead,
} from "./notifications";

const { requireUser, run, refresh } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  run: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser }));
vi.mock("next/cache", () => ({ refresh }));
// from(table).update(values) | .delete(), then .eq(…).eq(…).select("id")
// → run(table, operation, values, filters)'s result.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const query = (operation: string, values?: object) => {
        const filters: [string, string | null][] = [];
        const chain = {
          eq: (column: string, value: string) => {
            filters.push([column, value]);
            return chain;
          },
          is: (column: string, value: null) => {
            filters.push([column, value]);
            return chain;
          },
          select: async () => run(table, operation, values, filters),
        };
        return chain;
      };
      return {
        update: (values: object) => query("update", values),
        delete: () => query("delete"),
      };
    },
  }),
}));

const userId = "00000000-0000-4000-8000-00000000000a";
const notificationId = "56000000-0000-4000-8000-000000000001";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue({ id: userId });
  refresh.mockReset();
  run
    .mockReset()
    .mockResolvedValue({ data: [{ id: notificationId }], error: null });
});

describe("setNotificationRead", () => {
  it("sets read_at of the user's own notification", async () => {
    const result = await setNotificationRead(
      form({ notificationId, read: "true" }),
    );
    expect(result).toEqual({ ok: true, data: undefined });
    expect(requireUser).toHaveBeenCalled();
    const [table, operation, values, filters] = run.mock.calls[0];
    expect([table, operation]).toEqual(["notifications", "update"]);
    expect(Object.keys(values)).toEqual(["read_at"]);
    expect(Number.isNaN(Date.parse(values.read_at))).toBe(false);
    expect(filters).toEqual([
      ["id", notificationId],
      ["user_id", userId],
    ]);
    // The page and the header's count are rendered again with the response.
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("marks a notification unread", async () => {
    await setNotificationRead(form({ notificationId, read: "false" }));
    expect(run.mock.calls[0][2]).toEqual({ read_at: null });
  });

  it("ignores other fields", async () => {
    await setNotificationRead(
      form({ notificationId, read: "true", data: "{}", user_id: "x" }),
    );
    expect(Object.keys(run.mock.calls[0][2])).toEqual(["read_at"]);
  });

  it("rejects invalid input without a query", async () => {
    const inputs: Record<string, string>[] = [
      { notificationId: "x", read: "true" },
      { notificationId, read: "yes" },
      { notificationId },
    ];
    for (const values of inputs) {
      const result = await setNotificationRead(form(values));
      expect(result).toMatchObject({ ok: false, error: "validation" });
    }
    expect(run).not.toHaveBeenCalled();
  });

  it("reports a notification that is not the user's", async () => {
    run.mockResolvedValue({ data: [], error: null });
    const result = await setNotificationRead(
      form({ notificationId, read: "true" }),
    );
    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports a banned user as forbidden", async () => {
    run.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "row-level security" },
    });
    const result = await setNotificationRead(
      form({ notificationId, read: "true" }),
    );
    expect(result).toEqual({ ok: false, error: "forbidden" });
  });

  it("reports database errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    run.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "x" },
    });
    const result = await setNotificationRead(
      form({ notificationId, read: "true" }),
    );
    expect(result).toEqual({ ok: false, error: "database" });
  });
});

describe("deleteNotification", () => {
  it("deletes the user's own notification", async () => {
    const result = await deleteNotification(form({ notificationId }));
    expect(result).toEqual({ ok: true, data: undefined });
    expect(run).toHaveBeenCalledWith("notifications", "delete", undefined, [
      ["id", notificationId],
      ["user_id", userId],
    ]);
  });

  it("rejects an invalid id", async () => {
    const result = await deleteNotification(form({ notificationId: "1" }));
    expect(result).toMatchObject({ ok: false, error: "validation" });
    expect(run).not.toHaveBeenCalled();
  });

  it("reports a missing notification and database errors", async () => {
    run.mockResolvedValueOnce({ data: [], error: null });
    expect(await deleteNotification(form({ notificationId }))).toEqual({
      ok: false,
      error: "not_found",
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    run.mockResolvedValueOnce({ data: null, error: { message: "x" } });
    expect(await deleteNotification(form({ notificationId }))).toEqual({
      ok: false,
      error: "database",
    });
  });
});

describe("markAllNotificationsRead", () => {
  it("marks only the user's unread notifications read", async () => {
    run.mockResolvedValue({ data: [{ id: "a" }, { id: "b" }], error: null });
    const result = await markAllNotificationsRead();
    expect(result).toEqual({ ok: true, data: { count: 2 } });
    expect(requireUser).toHaveBeenCalled();
    const [table, operation, values, filters] = run.mock.calls[0];
    expect([table, operation]).toEqual(["notifications", "update"]);
    expect(Object.keys(values)).toEqual(["read_at"]);
    expect(filters).toEqual([
      ["user_id", userId],
      ["read_at", null],
    ]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("succeeds with nothing to mark", async () => {
    run.mockResolvedValue({ data: [], error: null });
    expect(await markAllNotificationsRead()).toEqual({
      ok: true,
      data: { count: 0 },
    });
  });

  it("reports a banned user and database errors", async () => {
    run.mockResolvedValueOnce({
      data: null,
      error: { code: "42501", message: "row-level security" },
    });
    expect(await markAllNotificationsRead()).toEqual({
      ok: false,
      error: "forbidden",
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    run.mockResolvedValueOnce({ data: null, error: { message: "x" } });
    expect(await markAllNotificationsRead()).toEqual({
      ok: false,
      error: "database",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
