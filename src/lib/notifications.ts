import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { MatchStatus } from "@/lib/matches";
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
  // The recipient's own report.
  itemId: string | null;
  // Match notifications: the other report of the pair.
  otherItemId: string | null;
};

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
  };
}

export function toNotificationViews(
  rows: NotificationRow[],
  items: NotificationItem[],
  matches: { id: string; status: MatchStatus }[],
): NotificationView[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const matchById = new Map(matches.map((match) => [match.id, match]));
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
    };
  });
}

// Badge text: nothing for 0, "99+" above the limit.
export function badgeCount(count: number): string | null {
  if (count <= 0) return null;
  return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
}

// Where a notification leads: the recipient's report, at its matches for a
// match. Null when the report is gone.
export function notificationHref(view: NotificationView): string | null {
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

export async function fetchNotifications(
  supabase: Client,
  userId: string,
  limit = NOTIFICATIONS_PANEL_LIMIT,
): Promise<NotificationView[]> {
  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, type, data, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load notifications: ${error.message}`);

  const parsed = rows.map((row) => parseNotificationData(row.data));
  const itemIds = [
    ...new Set(parsed.flatMap((data) => [data.itemId, data.otherItemId])),
  ].filter((id): id is string => id !== null);
  const matchIds = [...new Set(parsed.map((data) => data.matchId))].filter(
    (id): id is string => id !== null,
  );

  // RLS decides what still exists for the viewer: deleted reports, someone
  // else's hidden report and dropped matches are simply not returned.
  const [items, matches] = await Promise.all([
    itemIds.length
      ? supabase
          .from("items")
          .select("id, type, status, title")
          .in("id", itemIds)
      : null,
    matchIds.length
      ? supabase.from("matches").select("id, status").in("id", matchIds)
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
  return toNotificationViews(rows, items?.data ?? [], matches?.data ?? []);
}
