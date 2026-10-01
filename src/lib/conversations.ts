import type { Database, Enums } from "@/types/database";

// Client-safe helpers for the conversation list (§16). Rows come from
// rpc("my_conversations"); the generated types claim every column is
// non-null, but the item columns are null when the report is deleted or
// hidden from the viewer, and the last message is null before the first one.

export type ConversationRow =
  Database["public"]["Functions"]["my_conversations"]["Returns"][number];

export type ConversationSummary = {
  id: string;
  // The viewer owns the report (the other person contacted them).
  isOwner: boolean;
  other: { id: string; displayName: string; avatarPath: string | null };
  // Null when the report is deleted or no longer visible to the viewer.
  item: {
    id: string;
    title: string;
    type: Enums<"item_type">;
    status: Enums<"item_status">;
  } | null;
  lastMessage: { preview: string; fromMe: boolean } | null;
  unreadCount: number;
  // Time of the last message, or of the start before the first one.
  activityAt: string;
};

// One line of the message: line breaks and runs of spaces become single
// spaces (the list cuts it with CSS).
export function messagePreview(body: string) {
  return body.replace(/\s+/g, " ").trim();
}

export function toConversationSummaries(
  rows: ConversationRow[],
  viewerId: string,
): ConversationSummary[] {
  return rows.map((row) => {
    const itemTitle = row.item_title as string | null;
    const body = row.last_message_body as string | null;
    return {
      id: row.id,
      isOwner: row.is_owner,
      other: {
        id: row.other_user_id,
        displayName: row.other_display_name,
        avatarPath: row.other_avatar_path as string | null,
      },
      item:
        row.item_id && itemTitle !== null
          ? {
              id: row.item_id,
              title: itemTitle,
              type: row.item_type,
              status: row.item_status,
            }
          : null,
      lastMessage:
        body === null
          ? null
          : {
              preview: messagePreview(body),
              fromMe: row.last_message_sender_id === viewerId,
            },
      unreadCount: Number(row.unread_count),
      activityAt: (row.last_message_at as string | null) ?? row.created_at,
    };
  });
}

// Conversations with unread messages (for the page summary).
export function unreadConversationCount(conversations: ConversationSummary[]) {
  return conversations.filter((conversation) => conversation.unreadCount > 0)
    .length;
}
