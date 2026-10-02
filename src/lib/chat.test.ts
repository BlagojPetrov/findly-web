import { describe, expect, it, vi } from "vitest";
import {
  type ChatMessage,
  fetchMessagesAfter,
  fetchMessagesBefore,
  MESSAGE_PAGE_SIZE,
  mergeMessages,
  fetchUnreadMessageCount,
  realtimeMessage,
  unreadFrom,
} from "./chat";

const conversationId = "49000000-0000-4000-8000-000000000001";

function message(id: string, createdAt: string, body = id): ChatMessage {
  return { id, senderId: "u", body, createdAt, readAt: null };
}

function row(index: number) {
  return {
    id: `m${index}`,
    sender_id: "u",
    body: `body ${index}`,
    created_at: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    read_at: index === 1 ? "2026-10-01T12:00:00+00:00" : null,
  };
}

// from("messages").select(cols).eq(...).lt/gt(...).order(...).limit(n)
function client(result: { data: unknown; error: unknown }) {
  const calls: unknown[][] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
      return query;
    };
  const query = {
    select: record("select"),
    eq: record("eq"),
    lt: record("lt"),
    gt: record("gt"),
    order: record("order"),
    limit: async (...args: unknown[]) => {
      calls.push(["limit", ...args]);
      return result;
    },
  };
  const from = vi.fn(() => query);
  return { supabase: { from } as never, from, calls };
}

describe("mergeMessages", () => {
  it("keeps each message once, oldest first", () => {
    const a = message("a", "2026-10-01T10:00:00.000001+00:00");
    const b = message("b", "2026-10-01T10:01:00+00:00");
    const c = message("c", "2026-10-01T09:00:00+00:00");
    expect(mergeMessages([a, b], [b, c]).map((m) => m.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("orders equal times by id and lets later copies win", () => {
    const time = "2026-10-01T10:00:00Z";
    const merged = mergeMessages(
      [message("b", time), message("a", time, "old")],
      [message("a", time, "new")],
    );
    expect(merged.map((m) => [m.id, m.body])).toEqual([
      ["a", "new"],
      ["b", "b"],
    ]);
  });

  it("compares times with different offsets", () => {
    const merged = mergeMessages([
      message("later", "2026-10-01T12:30:00+02:00"),
      message("earlier", "2026-10-01T10:20:00Z"),
    ]);
    expect(merged.map((m) => m.id)).toEqual(["earlier", "later"]);
  });
});

describe("realtimeMessage", () => {
  const payload = {
    id: "m1",
    conversation_id: conversationId,
    sender_id: "u",
    body: "Hello",
    read_at: null,
    created_at: "2026-10-01T10:00:00.123456+00:00",
  };

  it("maps a message of this conversation", () => {
    expect(realtimeMessage(payload, conversationId)).toEqual({
      id: "m1",
      senderId: "u",
      body: "Hello",
      createdAt: "2026-10-01T10:00:00.123456+00:00",
      readAt: null,
    });
  });

  it("reads a time without an offset as UTC", () => {
    expect(
      realtimeMessage(
        { ...payload, created_at: "2026-10-01T10:00:00.123456" },
        conversationId,
      )?.createdAt,
    ).toBe("2026-10-01T10:00:00.123456Z");
  });

  it.each([
    ["another conversation", { ...payload, conversation_id: "other" }],
    ["a missing body", { ...payload, body: undefined }],
    ["a missing id", { ...payload, id: null }],
    ["no row", undefined],
  ])("ignores %s", (_, value) => {
    expect(realtimeMessage(value, conversationId)).toBeNull();
  });
});

describe("fetchMessagesBefore", () => {
  it("loads the newest page and returns it oldest first", async () => {
    const rows = [3, 2, 1].map(row);
    const { supabase, from, calls } = client({ data: rows, error: null });
    const page = await fetchMessagesBefore(supabase, conversationId);
    expect(from).toHaveBeenCalledWith("messages");
    expect(calls).toEqual([
      ["select", "id, sender_id, body, created_at, read_at"],
      ["eq", "conversation_id", conversationId],
      ["order", "created_at", { ascending: false }],
      ["limit", MESSAGE_PAGE_SIZE + 1],
    ]);
    expect(page.hasMore).toBe(false);
    expect(page.messages.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    expect(page.messages[0]).toEqual({
      id: "m1",
      senderId: "u",
      body: "body 1",
      createdAt: rows[2].created_at,
      readAt: "2026-10-01T12:00:00+00:00",
    });
  });

  it("loads the page before a time and tells whether more exist", async () => {
    const rows = Array.from({ length: MESSAGE_PAGE_SIZE + 1 }, (_, i) =>
      row(100 - i),
    );
    const { supabase, calls } = client({ data: rows, error: null });
    const before = "2026-10-01T10:00:00Z";
    const page = await fetchMessagesBefore(supabase, conversationId, before);
    expect(calls).toContainEqual(["lt", "created_at", before]);
    expect(page.hasMore).toBe(true);
    expect(page.messages).toHaveLength(MESSAGE_PAGE_SIZE);
    // The extra (oldest) row only tells that more exist.
    expect(page.messages[0].id).toBe(`m${100 - MESSAGE_PAGE_SIZE + 1}`);
    expect(page.messages.at(-1)!.id).toBe("m100");
  });

  it("throws on errors", async () => {
    const { supabase } = client({ data: null, error: { message: "boom" } });
    await expect(fetchMessagesBefore(supabase, conversationId)).rejects.toThrow(
      "boom",
    );
  });
});

describe("fetchMessagesAfter", () => {
  it("loads newer messages oldest first", async () => {
    const { supabase, calls } = client({ data: [row(1), row(2)], error: null });
    const after = "2026-10-01T00:00:30Z";
    const messages = await fetchMessagesAfter(supabase, conversationId, after);
    expect(calls).toEqual([
      ["select", "id, sender_id, body, created_at, read_at"],
      ["eq", "conversation_id", conversationId],
      ["gt", "created_at", after],
      ["order", "created_at", { ascending: true }],
      ["limit", 200],
    ]);
    expect(messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("throws on errors", async () => {
    const { supabase } = client({ data: null, error: { message: "boom" } });
    await expect(
      fetchMessagesAfter(supabase, conversationId, "x"),
    ).rejects.toThrow("boom");
  });
});

describe("unreadFrom", () => {
  it("keeps the other participant's unread messages only", () => {
    const messages: ChatMessage[] = [
      { ...message("own", "2026-10-01T10:00:00Z"), senderId: "me" },
      message("read", "2026-10-01T10:01:00Z"),
      message("unread", "2026-10-01T10:02:00Z"),
    ];
    messages[1].readAt = "2026-10-01T10:05:00Z";
    expect(unreadFrom(messages, "me").map((m) => m.id)).toEqual(["unread"]);
  });
});

describe("realtimeMessage read state", () => {
  it("keeps read_at and treats anything else as unread", () => {
    const base = {
      id: "m1",
      conversation_id: conversationId,
      sender_id: "u",
      body: "Hi",
      created_at: "2026-10-01T10:00:00+00:00",
    };
    expect(
      realtimeMessage(
        { ...base, read_at: "2026-10-01T10:01:00+00:00" },
        conversationId,
      )?.readAt,
    ).toBe("2026-10-01T10:01:00+00:00");
    expect(realtimeMessage(base, conversationId)?.readAt).toBeNull();
  });
});

describe("fetchUnreadMessageCount", () => {
  function countClient(result: { count: number | null; error: unknown }) {
    const calls: unknown[][] = [];
    const query = {
      select: (...args: unknown[]) => {
        calls.push(["select", ...args]);
        return query;
      },
      neq: (...args: unknown[]) => {
        calls.push(["neq", ...args]);
        return query;
      },
      is: async (...args: unknown[]) => {
        calls.push(["is", ...args]);
        return result;
      },
    };
    const from = vi.fn(() => query);
    return { supabase: { from } as never, from, calls };
  }

  it("counts others' unread messages without loading them", async () => {
    const { supabase, from, calls } = countClient({ count: 7, error: null });
    expect(await fetchUnreadMessageCount(supabase, "me")).toBe(7);
    expect(from).toHaveBeenCalledWith("messages");
    expect(calls).toEqual([
      ["select", "id", { count: "exact", head: true }],
      ["neq", "sender_id", "me"],
      ["is", "read_at", null],
    ]);
  });

  it("treats a missing count as 0 and throws on errors", async () => {
    expect(
      await fetchUnreadMessageCount(
        countClient({ count: null, error: null }).supabase,
        "me",
      ),
    ).toBe(0);
    await expect(
      fetchUnreadMessageCount(
        countClient({ count: null, error: { message: "boom" } }).supabase,
        "me",
      ),
    ).rejects.toThrow("boom");
  });
});
