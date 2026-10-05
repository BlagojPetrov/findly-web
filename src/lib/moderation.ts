import type { Enums } from "@/types/database";

// Client-safe helpers for the admin moderation pages (§18).

export type ReportReason = Enums<"report_reason">;

// One open flag as the queue shows it.
export type QueueReport = {
  id: string;
  reason: ReportReason;
  details: string | null;
  createdAt: string;
  reporter: { id: string; displayName: string };
};

// The report (item) the flags are about. Admins see hidden items too.
export type QueueItem = {
  id: string;
  title: string;
  type: Enums<"item_type">;
  status: Enums<"item_status">;
  owner: { id: string; displayName: string };
};

// An item with its open flags, oldest first.
export type QueueGroup = { item: QueueItem; reports: QueueReport[] };

// A row of the queue query (open reports with their item and reporter).
export type QueueRow = {
  id: string;
  reason: ReportReason;
  details: string | null;
  created_at: string;
  reporter: { id: string; display_name: string };
  item: {
    id: string;
    title: string;
    type: Enums<"item_type">;
    status: Enums<"item_status">;
    owner: { id: string; display_name: string };
  };
};

// Groups open flags by item. Rows come oldest first, so the groups are in
// the order of their oldest open flag (the one waiting longest comes first)
// and each group's flags stay oldest first.
export function groupReports(rows: QueueRow[]): QueueGroup[] {
  const groups = new Map<string, QueueGroup>();
  for (const row of rows) {
    let group = groups.get(row.item.id);
    if (!group) {
      group = {
        item: {
          id: row.item.id,
          title: row.item.title,
          type: row.item.type,
          status: row.item.status,
          owner: {
            id: row.item.owner.id,
            displayName: row.item.owner.display_name,
          },
        },
        reports: [],
      };
      groups.set(row.item.id, group);
    }
    group.reports.push({
      id: row.id,
      reason: row.reason,
      details: row.details,
      createdAt: row.created_at,
      reporter: {
        id: row.reporter.id,
        displayName: row.reporter.display_name,
      },
    });
  }
  return [...groups.values()];
}

// The status a hidden report returns to: hidden items keep resolved_at
// (P10.S1), so a report that was resolved before it was hidden goes back to
// resolved (keeping its original time), any other to active.
export function restoredStatus(resolvedAt: string | null) {
  return resolvedAt === null ? "active" : "resolved";
}

// What a moderation notification says happened (data.action).
export const MODERATION_ACTIONS = ["item_hidden", "item_restored"] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export function parseModerationAction(value: unknown): ModerationAction | null {
  return MODERATION_ACTIONS.includes(value as ModerationAction)
    ? (value as ModerationAction)
    : null;
}
