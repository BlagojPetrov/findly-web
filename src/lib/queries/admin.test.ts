import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAdminCategories,
  getAdminStats,
  getHiddenItems,
  getReportQueue,
  getUserPage,
  REPORT_QUEUE_MAX_REPORTS,
  REPORT_QUEUE_PAGE_SIZE,
} from "./admin";

const { rpc, run } = vi.hoisted(() => ({ rpc: vi.fn(), run: vi.fn() }));

vi.mock("server-only", () => ({}));
// rpc(name).single() → rpc(name)'s result. from(table) is a query builder
// that records its calls; awaiting it resolves to run(table, calls)'s result.
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
          return builder;
        };
      },
    },
  );
  return builder;
}
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: (name: string, args?: object) => {
      // Awaited directly (admin_list_users) or through single() (admin_stats).
      const result = Promise.resolve().then(() => rpc(name, args));
      return Object.assign(result, { single: async () => rpc(name) });
    },
    from: (table: string) => query(table),
  }),
}));

const stats = {
  users: 12,
  banned_users: 1,
  active_lost_items: 4,
  active_found_items: 3,
  hidden_items: 1,
  matches: 5,
  confirmed_matches: 2,
  open_reports: 3,
  reported_items: 2,
};

beforeEach(() => {
  rpc.mockReset();
  run.mockReset();
});

describe("getAdminStats", () => {
  it("returns the single row of admin_stats()", async () => {
    rpc.mockResolvedValue({ data: stats, error: null });
    expect(await getAdminStats()).toEqual(stats);
    expect(rpc).toHaveBeenCalledWith("admin_stats");
  });

  it("throws for non-admins and other errors", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "admin only" },
    });
    await expect(getAdminStats()).rejects.toThrow(
      "Failed to load the admin stats: admin only",
    );
  });
});

function queueRow(id: number, itemId: number) {
  return {
    id: `report-${id}`,
    reason: "spam",
    details: null,
    created_at: "2026-10-05T10:00:00Z",
    reporter: { id: `user-${id}`, display_name: `User ${id}` },
    item: {
      id: `item-${itemId}`,
      title: `Item ${itemId}`,
      type: "found",
      status: "active",
      owner: { id: "owner", display_name: "Owner" },
    },
  };
}

describe("getReportQueue", () => {
  it("loads the oldest open flags and pages through their items", async () => {
    // 12 items, the first with two flags.
    const rows = [
      queueRow(0, 0),
      ...Array.from({ length: 12 }, (_, i) => queueRow(i + 1, i)),
    ];
    run.mockResolvedValue({ data: rows, error: null });

    const first = await getReportQueue(1);
    const [table, calls] = run.mock.calls[0];
    expect(table).toBe("reports");
    expect(calls).toContainEqual(["eq", "status", "open"]);
    expect(calls).toContainEqual(["order", "created_at", { ascending: true }]);
    expect(calls).toContainEqual(["limit", REPORT_QUEUE_MAX_REPORTS]);
    const select = calls.find((call: Call) => call[0] === "select")[1];
    expect(select).toContain("profiles!reports_reporter_id_fkey");
    expect(select).toContain("profiles!items_user_id_fkey");
    expect(first.total).toBe(12);
    expect(first.reports).toBe(13);
    expect(first.truncated).toBe(false);
    expect(first.groups).toHaveLength(REPORT_QUEUE_PAGE_SIZE);
    expect(first.groups[0].reports.map((report) => report.id)).toEqual([
      "report-0",
      "report-1",
    ]);

    const second = await getReportQueue(2);
    expect(second.groups.map((group) => group.item.id)).toEqual([
      "item-10",
      "item-11",
    ]);
    expect((await getReportQueue(3)).groups).toEqual([]);
  });

  it("says when the limit cut the list and throws on errors", async () => {
    run.mockResolvedValue({
      data: Array.from({ length: REPORT_QUEUE_MAX_REPORTS }, (_, i) =>
        queueRow(i, 0),
      ),
      error: null,
    });
    expect(await getReportQueue(1)).toMatchObject({
      total: 1,
      truncated: true,
    });
    run.mockResolvedValue({ data: null, error: { message: "admin only" } });
    await expect(getReportQueue(1)).rejects.toThrow(
      "Failed to load the report queue: admin only",
    );
  });
});

describe("getHiddenItems", () => {
  it("maps hidden reports with the total", async () => {
    run.mockResolvedValue({
      data: [
        {
          id: "item-1",
          title: "Item 1",
          type: "lost",
          status: "hidden",
          resolved_at: null,
          updated_at: "2026-10-05T10:00:00Z",
          owner: { id: "owner", display_name: "Owner" },
        },
      ],
      error: null,
      count: 21,
    });
    expect(await getHiddenItems(2)).toEqual({
      items: [
        {
          id: "item-1",
          title: "Item 1",
          type: "lost",
          status: "hidden",
          resolvedAt: null,
          updatedAt: "2026-10-05T10:00:00Z",
          owner: { id: "owner", displayName: "Owner" },
        },
      ],
      total: 21,
    });
    const [table, calls] = run.mock.calls[0];
    expect(table).toBe("items");
    expect(calls).toContainEqual(["eq", "status", "hidden"]);
    expect(calls).toContainEqual(["range", 20, 39]);
  });

  it("counts the hidden reports for a page past the end", async () => {
    run
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST103" } })
      .mockResolvedValueOnce({ data: null, error: null, count: 3 });
    expect(await getHiddenItems(9)).toEqual({ items: [], total: 3 });
  });
});

function userRow(n: number, total: number) {
  return {
    id: `user-${n}`,
    display_name: `User ${n}`,
    avatar_path: null,
    email: n === 2 ? null : `user${n}@example.com`,
    role: "user",
    is_banned: n === 1,
    created_at: "2026-10-05T10:00:00Z",
    last_sign_in_at: null,
    item_count: n,
    open_report_count: 0,
    total_count: total,
  };
}

describe("getUserPage", () => {
  it("maps a page of admin_list_users() with the total", async () => {
    rpc.mockResolvedValue({
      data: [userRow(1, 41), userRow(2, 41)],
      error: null,
    });
    const result = await getUserPage({ q: "ana", bannedOnly: true }, 3);
    expect(rpc).toHaveBeenCalledWith("admin_list_users", {
      search: "ana",
      banned_only: true,
      page_size: 20,
      page_offset: 40,
    });
    expect(result.total).toBe(41);
    expect(result.users[0]).toEqual({
      id: "user-1",
      displayName: "User 1",
      avatarPath: null,
      email: "user1@example.com",
      role: "user",
      isBanned: true,
      createdAt: "2026-10-05T10:00:00Z",
      lastSignInAt: null,
      itemCount: 1,
      openReportCount: 0,
    });
    expect(result.users[1].email).toBeNull();
  });

  it("sends no search for an empty one and counts an empty page", async () => {
    rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [userRow(1, 7)], error: null });
    expect(await getUserPage({ q: "", bannedOnly: false }, 5)).toEqual({
      users: [],
      total: 7,
    });
    expect(rpc.mock.calls[0][1]).toMatchObject({ search: undefined });
    expect(rpc.mock.calls[1][1]).toMatchObject({
      page_size: 1,
      page_offset: 0,
    });
  });

  it("returns an empty first page and throws on errors", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    expect(await getUserPage({ q: "x", bannedOnly: false }, 1)).toEqual({
      users: [],
      total: 0,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    rpc.mockResolvedValueOnce({ data: null, error: { message: "admin only" } });
    await expect(getUserPage({ q: "", bannedOnly: false }, 1)).rejects.toThrow(
      "Failed to load users: admin only",
    );
  });
});

describe("getAdminCategories", () => {
  it("adds the item counts to the categories in display order", async () => {
    run.mockResolvedValue({
      data: [
        {
          id: 2,
          slug: "keys",
          name_mk: "Клучеви",
          name_en: "Keys",
          icon: "key-round",
        },
        {
          id: 8,
          slug: "other",
          name_mk: "Друго",
          name_en: "Other",
          icon: "package",
        },
      ],
      error: null,
    });
    rpc.mockResolvedValue({
      data: [{ category_id: 2, item_count: 5 }],
      error: null,
    });
    expect(await getAdminCategories()).toEqual([
      {
        id: 2,
        slug: "keys",
        nameMk: "Клучеви",
        nameEn: "Keys",
        icon: "key-round",
        itemCount: 5,
      },
      {
        id: 8,
        slug: "other",
        nameMk: "Друго",
        nameEn: "Other",
        icon: "package",
        itemCount: 0,
      },
    ]);
    const [table, calls] = run.mock.calls[0];
    expect(table).toBe("categories");
    expect(calls).toContainEqual(["order", "sort_order"]);
    expect(rpc).toHaveBeenCalledWith("admin_category_item_counts", undefined);
  });

  it("throws when either query fails", async () => {
    run.mockResolvedValue({ data: [], error: null });
    rpc.mockResolvedValue({ data: null, error: { message: "admin only" } });
    await expect(getAdminCategories()).rejects.toThrow(
      "Failed to count category items: admin only",
    );
    run.mockResolvedValue({ data: null, error: { message: "down" } });
    await expect(getAdminCategories()).rejects.toThrow(
      "Failed to load categories: down",
    );
  });
});
