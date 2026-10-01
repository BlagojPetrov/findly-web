import { describe, expect, it, vi } from "vitest";
import {
  badgeCount,
  fetchNotificationPage,
  fetchNotifications,
  fetchUnreadCount,
  type NotificationItem,
  type NotificationRow,
  notificationHref,
  parseNotificationData,
  toNotificationViews,
} from "./notifications";

const user = "00000000-0000-4000-8000-00000000000a";
const own = "10000000-0000-4000-8000-000000000001";
const other = "20000000-0000-4000-8000-000000000001";
const matchId = "30000000-0000-4000-8000-000000000001";

const ownItem: NotificationItem = {
  id: own,
  type: "lost",
  status: "active",
  title: "Изгубени клучеви",
};
const otherItem: NotificationItem = {
  id: other,
  type: "found",
  status: "active",
  title: "Најдени клучеви",
};

function row(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: "40000000-0000-4000-8000-000000000001",
    type: "match",
    data: { match_id: matchId, item_id: own, other_item_id: other },
    read_at: null,
    created_at: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

describe("parseNotificationData", () => {
  it("reads the ids", () => {
    expect(
      parseNotificationData({
        match_id: matchId,
        item_id: own,
        other_item_id: other,
      }),
    ).toEqual({ matchId, itemId: own, otherItemId: other });
  });

  it("drops missing and malformed fields", () => {
    expect(
      parseNotificationData({ match_id: "x", item_id: 5, extra: own }),
    ).toEqual({ matchId: null, itemId: null, otherItemId: null });
    for (const value of [null, undefined, "text", 3, [own], {}]) {
      expect(parseNotificationData(value)).toEqual({
        matchId: null,
        itemId: null,
        otherItemId: null,
      });
    }
  });
});

describe("toNotificationViews", () => {
  it("resolves the reports and the match", () => {
    expect(
      toNotificationViews(
        [row()],
        [ownItem, otherItem],
        [{ id: matchId, status: "suggested" }],
      ),
    ).toEqual([
      {
        id: row().id,
        type: "match",
        read: false,
        createdAt: "2026-10-01T10:00:00Z",
        item: ownItem,
        otherItem,
        matchStatus: "suggested",
      },
    ]);
  });

  it("marks records that no longer exist as null", () => {
    const [view] = toNotificationViews(
      [row({ read_at: "2026-10-01" })],
      [],
      [],
    );
    expect(view).toMatchObject({
      read: true,
      item: null,
      otherItem: null,
      matchStatus: null,
    });
  });

  it("keeps the match status of dismissed and confirmed matches", () => {
    const views = toNotificationViews(
      [row()],
      [ownItem, otherItem],
      [{ id: matchId, status: "dismissed" }],
    );
    expect(views[0].matchStatus).toBe("dismissed");
  });

  it("uses only the item of other notification types", () => {
    const [view] = toNotificationViews(
      [row({ type: "moderation" })],
      [ownItem, otherItem],
      [{ id: matchId, status: "suggested" }],
    );
    expect(view).toMatchObject({
      item: ownItem,
      otherItem: null,
      matchStatus: null,
    });
  });
});

describe("badgeCount", () => {
  it("hides zero and caps large counts", () => {
    expect(badgeCount(0)).toBeNull();
    expect(badgeCount(-1)).toBeNull();
    expect(badgeCount(1)).toBe("1");
    expect(badgeCount(99)).toBe("99");
    expect(badgeCount(100)).toBe("99+");
    expect(badgeCount(12345)).toBe("99+");
  });
});

describe("notificationHref", () => {
  const [view] = toNotificationViews([row()], [ownItem, otherItem], []);

  it("links a match to the matches of the own report", () => {
    expect(notificationHref(view)).toBe(`/items/${own}#matches-item`);
  });

  it("links other types to the report", () => {
    expect(notificationHref({ ...view, type: "moderation" })).toBe(
      `/items/${own}`,
    );
  });

  it("has no link when the own report is gone", () => {
    expect(notificationHref({ ...view, item: null })).toBeNull();
  });
});

// A query builder that records its calls and resolves to the given result.
function builder(result: object, calls: unknown[][]) {
  const chain: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "is",
    "order",
    "limit",
    "in",
    "range",
  ]) {
    chain[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return chain;
    };
  }
  chain.then = (resolve: (value: object) => void) => resolve(result);
  return chain;
}

function fakeClient(results: Record<string, object>) {
  const calls: Record<string, unknown[][]> = {};
  const from = vi.fn((table: string) => {
    calls[table] = [];
    return builder(results[table], calls[table]);
  });
  return { client: { from } as never, calls, from };
}

describe("fetchUnreadCount", () => {
  it("counts the user's unread notifications", async () => {
    const { client, calls } = fakeClient({
      notifications: { count: 7, error: null },
    });
    await expect(fetchUnreadCount(client, user)).resolves.toBe(7);
    expect(calls.notifications).toContainEqual(["eq", "user_id", user]);
    expect(calls.notifications).toContainEqual(["is", "read_at", null]);
  });

  it("throws on errors", async () => {
    const { client } = fakeClient({
      notifications: { count: null, error: { message: "down" } },
    });
    await expect(fetchUnreadCount(client, user)).rejects.toThrow("down");
  });
});

describe("fetchNotifications", () => {
  it("loads the user's newest notifications and what they refer to", async () => {
    const { client, calls } = fakeClient({
      notifications: { data: [row()], error: null },
      items: { data: [ownItem], error: null },
      matches: { data: [], error: null },
    });
    const views = await fetchNotifications(client, user);
    expect(calls.notifications).toContainEqual(["eq", "user_id", user]);
    expect(calls.notifications).toContainEqual([
      "order",
      "created_at",
      { ascending: false },
    ]);
    expect(calls.notifications).toContainEqual(["limit", 20]);
    expect(calls.items).toContainEqual(["in", "id", [own, other]]);
    expect(calls.matches).toContainEqual(["in", "id", [matchId]]);
    // The other report and the match were not returned (gone or hidden).
    expect(views[0]).toMatchObject({
      item: ownItem,
      otherItem: null,
      matchStatus: null,
    });
  });

  it("skips the related queries without ids", async () => {
    const { client, from } = fakeClient({
      notifications: { data: [row({ data: {} })], error: null },
    });
    await fetchNotifications(client, user);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("throws when a related query fails", async () => {
    const { client } = fakeClient({
      notifications: { data: [row()], error: null },
      items: { data: null, error: { message: "items down" } },
      matches: { data: [], error: null },
    });
    await expect(fetchNotifications(client, user)).rejects.toThrow(
      "items down",
    );
  });
});

describe("fetchNotificationPage", () => {
  it("loads one page of the user's notifications with the total", async () => {
    const { client, calls } = fakeClient({
      notifications: { data: [row()], error: null, count: 45 },
      items: { data: [ownItem, otherItem], error: null },
      matches: { data: [{ id: matchId, status: "confirmed" }], error: null },
    });
    const { views, total } = await fetchNotificationPage(client, user, 3, 20);
    expect(total).toBe(45);
    expect(calls.notifications).toContainEqual([
      "select",
      "id, type, data, read_at, created_at",
      { count: "exact" },
    ]);
    expect(calls.notifications).toContainEqual(["eq", "user_id", user]);
    expect(calls.notifications).toContainEqual(["range", 40, 59]);
    expect(views[0]).toMatchObject({ otherItem, matchStatus: "confirmed" });
  });

  it("returns an empty page with the total past the last page", async () => {
    // The first query asks for the range (416), the second only counts.
    const results = [
      {
        data: null,
        error: { code: "PGRST103", message: "Requested range not satisfiable" },
        count: null,
      },
      { data: null, error: null, count: 23 },
    ];
    const calls: unknown[][] = [];
    const client = {
      from: vi.fn(() => builder(results.shift()!, calls)),
    } as never;
    await expect(fetchNotificationPage(client, user, 9, 20)).resolves.toEqual({
      views: [],
      total: 23,
    });
    expect(calls).toContainEqual([
      "select",
      "id",
      { count: "exact", head: true },
    ]);
  });

  it("throws on errors", async () => {
    const { client } = fakeClient({
      notifications: { data: null, error: { message: "down" }, count: null },
    });
    await expect(fetchNotificationPage(client, user, 1, 20)).rejects.toThrow(
      "down",
    );
  });
});
