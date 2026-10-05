import { describe, expect, it, vi } from "vitest";
import {
  badgeCount,
  fetchNotificationPage,
  fetchNotifications,
  fetchUnreadCount,
  isConversationPath,
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
const conversationId = "50000000-0000-4000-8000-000000000001";
const sender = "00000000-0000-4000-8000-00000000000b";

function messageRow(data: object = {}): NotificationRow {
  return row({
    type: "message",
    data: {
      conversation_id: conversationId,
      item_id: own,
      sender_id: sender,
      ...data,
    },
  });
}

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
    ).toEqual({
      matchId,
      itemId: own,
      otherItemId: other,
      conversationId: null,
      senderId: null,
      moderationAction: null,
    });
    expect(parseNotificationData(messageRow().data)).toEqual({
      matchId: null,
      itemId: own,
      otherItemId: null,
      conversationId,
      senderId: sender,
      moderationAction: null,
    });
  });

  it("drops missing and malformed fields", () => {
    expect(
      parseNotificationData({ match_id: "x", item_id: 5, extra: own }),
    ).toMatchObject({ matchId: null, itemId: null, otherItemId: null });
    expect(
      parseNotificationData({ conversation_id: "x", sender_id: [sender] }),
    ).toMatchObject({ conversationId: null, senderId: null });
    for (const value of [null, undefined, "text", 3, [own], {}]) {
      expect(parseNotificationData(value)).toEqual({
        matchId: null,
        itemId: null,
        otherItemId: null,
        conversationId: null,
        senderId: null,
        moderationAction: null,
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
        conversationId: null,
        sender: null,
        moderationAction: null,
      },
    ]);
  });

  it("resolves a message notification's conversation, report and sender", () => {
    const [view] = toNotificationViews(
      [messageRow()],
      [ownItem],
      [],
      [{ id: sender, displayName: "Ана" }],
    );
    expect(view).toMatchObject({
      type: "message",
      item: ownItem,
      otherItem: null,
      matchStatus: null,
      conversationId,
      sender: { id: sender, displayName: "Ана" },
    });
  });

  it("keeps a message notification whose report or sender is gone", () => {
    const [view] = toNotificationViews(
      [messageRow({ item_id: undefined })],
      [],
      [],
    );
    expect(view).toMatchObject({ item: null, conversationId, sender: null });
  });

  it("reads conversation and sender only for message notifications", () => {
    const [view] = toNotificationViews(
      [row({ data: { conversation_id: conversationId, sender_id: sender } })],
      [],
      [],
      [{ id: sender, displayName: "Ана" }],
    );
    expect(view).toMatchObject({ conversationId: null, sender: null });
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

  it("reads the action of moderation notifications", () => {
    const views = toNotificationViews(
      [
        row({
          type: "moderation",
          data: { item_id: own, action: "item_hidden" },
        }),
        row({
          type: "moderation",
          data: { item_id: own, action: "item_restored" },
        }),
        row({ type: "moderation", data: { item_id: own, action: "deleted" } }),
        row({ data: { item_id: own, action: "item_hidden" } }),
      ],
      [ownItem],
      [],
    );
    expect(views.map((view) => view.moderationAction)).toEqual([
      "item_hidden",
      "item_restored",
      null,
      null,
    ]);
    expect(views[0].item).toEqual(ownItem);
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

  it("links a message to its conversation, also without the report", () => {
    const [message] = toNotificationViews([messageRow()], [ownItem], []);
    expect(notificationHref(message)).toBe(`/messages/${conversationId}`);
    expect(notificationHref({ ...message, item: null })).toBe(
      `/messages/${conversationId}`,
    );
    expect(notificationHref({ ...message, conversationId: null })).toBeNull();
  });
});

describe("isConversationPath", () => {
  it("recognizes the chat of the conversation in both locales", () => {
    expect(
      isConversationPath(`/messages/${conversationId}`, conversationId),
    ).toBe(true);
    expect(
      isConversationPath(`/en/messages/${conversationId}`, conversationId),
    ).toBe(true);
    expect(
      isConversationPath(`/messages/${conversationId}/`, conversationId),
    ).toBe(true);
  });

  it("rejects other pages, conversations and invalid ids", () => {
    const another = "50000000-0000-4000-8000-000000000002";
    expect(isConversationPath(`/messages/${another}`, conversationId)).toBe(
      false,
    );
    expect(isConversationPath("/messages", conversationId)).toBe(false);
    expect(isConversationPath(`/items/${conversationId}`, conversationId)).toBe(
      false,
    );
    expect(
      isConversationPath(`/messages/${conversationId}/x`, conversationId),
    ).toBe(false);
    expect(isConversationPath("/messages/.*", ".*")).toBe(false);
    expect(isConversationPath(`/messages/${conversationId}`, undefined)).toBe(
      false,
    );
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

  it("loads the senders of message notifications (public columns)", async () => {
    const { client, calls } = fakeClient({
      notifications: { data: [messageRow()], error: null },
      items: { data: [ownItem], error: null },
      profiles: { data: [{ id: sender, display_name: "Ана" }], error: null },
    });
    const [view] = await fetchNotifications(client, user);
    expect(calls.profiles).toEqual([
      ["select", "id, display_name"],
      ["in", "id", [sender]],
    ]);
    expect(calls.matches).toBeUndefined();
    expect(view).toMatchObject({
      item: ownItem,
      sender: { id: sender, displayName: "Ана" },
    });
  });

  it("throws when the senders cannot be loaded", async () => {
    const { client } = fakeClient({
      notifications: { data: [messageRow()], error: null },
      items: { data: [], error: null },
      profiles: { data: null, error: { message: "profiles down" } },
    });
    await expect(fetchNotifications(client, user)).rejects.toThrow(
      "profiles down",
    );
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
