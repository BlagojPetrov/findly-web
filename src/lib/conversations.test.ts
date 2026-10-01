import { describe, expect, it } from "vitest";
import {
  type ConversationRow,
  messagePreview,
  toConversationSummaries,
  unreadConversationCount,
} from "./conversations";

const me = "00000000-0000-4000-8000-00000000000a";
const other = "00000000-0000-4000-8000-00000000000b";

function row(overrides: Partial<Record<keyof ConversationRow, unknown>> = {}) {
  return {
    id: "49000000-0000-4000-8000-000000000001",
    item_id: "47000000-0000-4000-8000-000000000001",
    item_title: "Black wallet",
    item_type: "found",
    item_status: "active",
    item_cover_path: null,
    is_owner: false,
    other_user_id: other,
    other_display_name: "Ana",
    other_avatar_path: null,
    last_message_body: "Hello",
    last_message_sender_id: other,
    last_message_at: "2026-10-01T10:00:00Z",
    unread_count: 2,
    created_at: "2026-10-01T09:00:00Z",
    ...overrides,
  } as ConversationRow;
}

describe("toConversationSummaries", () => {
  it("maps a row with its report, last message and unread count", () => {
    expect(toConversationSummaries([row()], me)).toEqual([
      {
        id: "49000000-0000-4000-8000-000000000001",
        isOwner: false,
        other: { id: other, displayName: "Ana", avatarPath: null },
        item: {
          id: "47000000-0000-4000-8000-000000000001",
          title: "Black wallet",
          type: "found",
          status: "active",
        },
        lastMessage: { preview: "Hello", fromMe: false },
        unreadCount: 2,
        activityAt: "2026-10-01T10:00:00Z",
      },
    ]);
  });

  it("keeps the order of the rows", () => {
    const ids = toConversationSummaries(
      [row({ id: "b" }), row({ id: "a" }), row({ id: "c" })],
      me,
    ).map((summary) => summary.id);
    expect(ids).toEqual(["b", "a", "c"]);
  });

  it("marks the viewer's own last message", () => {
    const [summary] = toConversationSummaries(
      [row({ last_message_sender_id: me })],
      me,
    );
    expect(summary.lastMessage).toEqual({ preview: "Hello", fromMe: true });
  });

  it("has no last message before the first one and uses the start time", () => {
    const [summary] = toConversationSummaries(
      [
        row({
          last_message_body: null,
          last_message_sender_id: null,
          last_message_at: null,
          unread_count: 0,
        }),
      ],
      me,
    );
    expect(summary.lastMessage).toBeNull();
    expect(summary.activityAt).toBe("2026-10-01T09:00:00Z");
  });

  it("has no report when it was deleted", () => {
    const [summary] = toConversationSummaries(
      [row({ item_id: null, item_title: null, item_type: null })],
      me,
    );
    expect(summary.item).toBeNull();
  });

  it("has no report when it is hidden from the viewer", () => {
    const [summary] = toConversationSummaries(
      [row({ item_title: null, item_type: null, item_status: null })],
      me,
    );
    expect(summary.item).toBeNull();
  });

  it("keeps the owner's view of its own hidden report", () => {
    const [summary] = toConversationSummaries(
      [row({ is_owner: true, item_status: "hidden" })],
      me,
    );
    expect(summary.isOwner).toBe(true);
    expect(summary.item?.status).toBe("hidden");
  });

  it("turns a bigint-like unread count into a number", () => {
    const [summary] = toConversationSummaries(
      [row({ unread_count: "31" })],
      me,
    );
    expect(summary.unreadCount).toBe(31);
  });
});

describe("messagePreview", () => {
  it("puts a multi-line message on one line", () => {
    expect(messagePreview("  Hello,\n\nis it\tmine?  ")).toBe(
      "Hello, is it mine?",
    );
  });
});

describe("unreadConversationCount", () => {
  it("counts conversations with unread messages, not messages", () => {
    const summaries = toConversationSummaries(
      [
        row({ unread_count: 5 }),
        row({ unread_count: 0 }),
        row({ unread_count: 1 }),
      ],
      me,
    );
    expect(unreadConversationCount(summaries)).toBe(2);
  });
});
