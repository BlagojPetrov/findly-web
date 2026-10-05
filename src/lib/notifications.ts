import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { MatchStatus } from "@/lib/matches";
import { type ModerationAction, parseModerationAction } from "@/lib/moderation";
import type { Database, Enums } from "@/types/database";

// Client-safe helpers for notifications (§15): reading the ids-only payload,
// loading the reports and matches it refers to, and the unread count. Used
// by the header bell in the browser (RLS: only the viewer's own rows).

export type NotificationType = Enums<"notification_type">;

// Notifications shown in the header panel, newest first.
export const NOTIFICATIONS_PANEL_LIMIT = 20;
// Above this the badge shows "99+".
export const MAX_BADGE_COUNT = 99;

export type NotificationRow = {
  id: string;
  type: NotificationType;
  data: unknown;
  read_at: string | null;
  created_at: string;
};

// What a notification shows of a report: never coordinates or descriptions.
export type NotificationItem = {
  id: string;
  type: Enums<"item_type">;
  status: Enums<"item_status">;
  title: string;
};

export type NotificationData = {
  matchId: string | null;
  // Match notifications: the recipient's own report. Message notifications:
  // the report the conversation is about.
  itemId: string | null;
  // Match notifications: the other report of the pair.
  otherItemId: string | null;
  // Message notifications: the conversation and who wrote.
  conversationId: string | null;
  senderId: string | null;
  // Moderation notifications: what happened to the recipient's report.
  moderationAction: ModerationAction | null;
};

// The public name of a message notification's sender.
export type NotificationSender = { id: string; displayName: string };

// A related record that is gone (deleted, dropped match) or that the viewer
// may no longer see (someone else's hidden report) is null.
export type NotificationView = {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  item: NotificationItem | null;
  otherItem: NotificationItem | null;
  matchStatus: MatchStatus | null;
  // Message notifications only.
  conversationId: string | null;
  sender: NotificationSender | null;
  // Moderation notifications only (null: unknown action).
  moderationAction: ModerationAction | null;
};

const uuid = z.uuid();

function uuidField(value: unknown): string | null {
  return uuid.safeParse(value).success ? (value as string) : null;
}

// notifications.data is jsonb: every field is checked, a missing or
// malformed one is treated as a record that no longer exists.
export function parseNotificationData(value: unknown): NotificationData {
  const data =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    matchId: uuidField(data.match_id),
    itemId: uuidField(data.item_id),
    otherItemId: uuidField(data.other_item_id),
    conversationId: uuidField(data.conversation_id),
    senderId: uuidField(data.sender_id),
    moderationAction: parseModerationAction(data.action),
  };
}

export function toNotificationViews(
  rows: NotificationRow[],
  items: NotificationItem[],
  matches: { id: string; status: MatchStatus }[],
  senders: NotificationSender[] = [],
): NotificationView[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const senderById = new Map(senders.map((sender) => [sender.id, sender]));
  return rows.map((row) => {
    const data = parseNotificationData(row.data);
    const pick = (id: string | null) => (id && itemById.get(id)) || null;
    return {
      id: row.id,
      type: row.type,
      read: row.read_at !== null,
      createdAt: row.created_at,
      item: pick(data.itemId),
      otherItem: row.type === "match" ? pick(data.otherItemId) : null,
      matchStatus:
        row.type === "match" && data.matchId
          ? (matchById.get(data.matchId)?.status ?? null)
          : null,
      conversationId: row.type === "message" ? data.conversationId : null,
      sender:
        row.type === "message" && data.senderId
          ? (senderById.get(data.senderId) ?? null)
          : null,
      moderationAction:
        row.type === "moderation" ? data.moderationAction : null,
    };
  });
}

// Badge text: nothing for 0, "99+" above the limit.
export function badgeCount(count: number): string | null {
  if (count <= 0) return null;
  return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
}

// Where a notification leads: the conversation for a message; otherwise the
// recipient's report, at its matches for a match (null when it is gone).
export function notificationHref(view: NotificationView): string | null {
  if (view.type === "message") {
    return view.conversationId ? `/messages/${view.conversationId}` : null;
  }
  if (!view.item) return null;
  return view.type === "match"
    ? `/items/${view.item.id}#matches-item`
    : `/items/${view.item.id}`;
}

type Client = SupabaseClient<Database>;

// Every query also filters by the expected user: if the browser's session
// belongs to someone else (signed in as another user in another tab), RLS
// and this filter together return nothing instead of the other account's rows.
export async function fetchUnreadCount(
  supabase: Client,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(`Failed to count notifications: ${error.message}`);
  return count ?? 0;
}

const notificationColumns = "id, type, data, read_at, created_at";

// Adds the reports and matches the notifications refer to. RLS decides what
// still exists for the viewer: deleted reports, someone else's hidden report
// and dropped matches are simply not returned.
async function resolveNotifications(
  supabase: Client,
  rows: NotificationRow[],
): Promise<NotificationView[]> {
  const parsed = rows.map((row) => parseNotificationData(row.data));
  const itemIds = [
    ...new Set(parsed.flatMap((data) => [data.itemId, data.otherItemId])),
  ].filter((id): id is string => id !== null);
  const matchIds = [...new Set(parsed.map((data) => data.matchId))].filter(
    (id): id is string => id !== null,
  );
  const senderIds = [...new Set(parsed.map((data) => data.senderId))].filter(
    (id): id is string => id !== null,
  );

  const [items, matches, senders] = await Promise.all([
    itemIds.length
      ? supabase
          .from("items")
          .select("id, type, status, title")
          .in("id", itemIds)
      : null,
    matchIds.length
      ? supabase.from("matches").select("id, status").in("id", matchIds)
      : null,
    // Public profile columns only (column privileges).
    senderIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", senderIds)
      : null,
  ]);
  if (items?.error) {
    throw new Error(
      `Failed to load notification items: ${items.error.message}`,
    );
  }
  if (matches?.error) {
    throw new Error(
      `Failed to load notification matches: ${matches.error.message}`,
    );
  }
  if (senders?.error) {
    throw new Error(
      `Failed to load notification senders: ${senders.error.message}`,
    );
  }
  return toNotificationViews(
    rows,
    items?.data ?? [],
    matches?.data ?? [],
    (senders?.data ?? []).map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
    })),
  );
}

// The newest notifications (header panel).
export async function fetchNotifications(
  supabase: Client,
  userId: string,
  limit = NOTIFICATIONS_PANEL_LIMIT,
): Promise<NotificationView[]> {
  const { data: rows, error } = await supabase
    .from("notifications")
    .select(notificationColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load notifications: ${error.message}`);
  return resolveNotifications(supabase, rows);
}

// One page of all notifications, newest first, with the total (page 1 = the
// newest `pageSize`).
export async function fetchNotificationPage(
  supabase: Client,
  userId: string,
  page: number,
  pageSize: number,
): Promise<{ views: NotificationView[]; total: number }> {
  const from = (page - 1) * pageSize;
  const {
    data: rows,
    error,
    count,
  } = await supabase
    .from("notifications")
    .select(notificationColumns, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + pageSize - 1);
  // A page past the end: PostgREST answers 416 instead of an empty page. The
  // caller needs the total to send the visitor to the last page.
  if (error?.code === "PGRST103") {
    const { count: total, error: countError } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (countError) {
      throw new Error(`Failed to count notifications: ${countError.message}`);
    }
    return { views: [], total: total ?? 0 };
  }
  if (error) throw new Error(`Failed to load notifications: ${error.message}`);
  return {
    views: await resolveNotifications(supabase, rows),
    total: count ?? 0,
  };
}

// Window events between the header bell and /notifications, so neither needs
// a second Realtime subscription: the bell announces new notifications it
// received (the page refreshes), the page announces its own changes (the bell
// reloads its count and list).
export const NOTIFICATIONS_RECEIVED_EVENT = "findly:notifications-received";
export const NOTIFICATIONS_CHANGED_EVENT = "findly:notifications-changed";

// Whether `pathname` (with or without a locale prefix) is the chat of the
// given conversation. The bell shows no toast for a message notification
// about the chat the user is looking at (it is marked read right away).
export function isConversationPath(
  pathname: string,
  conversationId: unknown,
): boolean {
  return (
    typeof conversationId === "string" &&
    uuid.safeParse(conversationId).success &&
    new RegExp(`^(/[a-z]{2})?/messages/${conversationId}/?$`, "i").test(
      pathname,
    )
  );
}
