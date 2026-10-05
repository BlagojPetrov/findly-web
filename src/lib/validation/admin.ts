import { z } from "zod";
import { msg } from "./messages";

// Flags handled in one action (one item's open flags in the queue).
export const MAX_REPORTS_PER_ACTION = 100;

const itemId = z.uuid({ error: msg("invalidValue") });

// The flags the admin saw in the queue: only these are closed, so a flag
// filed after the page loaded stays open for review.
const reportIds = z
  .array(z.uuid({ error: msg("invalidValue") }))
  .max(MAX_REPORTS_PER_ACTION, msg("invalidValue"));

// Restore a hidden report.
export const moderateItemSchema = z.object({ itemId });

// Hide a report and resolve the flags shown with it (none when it is
// hidden from elsewhere).
export const hideItemSchema = z.object({ itemId, reportIds });

// Close the flags of one report: "resolved" (acted on) or "dismissed" (no
// violation).
export const closeReportsSchema = z.object({
  itemId,
  reportIds: reportIds.min(1, msg("required")),
  outcome: z.enum(["resolved", "dismissed"], { error: msg("invalidValue") }),
});

// Ban or unban a user (admin_set_banned). The form sends "true" / "false".
export const setBannedSchema = z.object({
  userId: z.uuid({ error: msg("invalidValue") }),
  banned: z
    .enum(["true", "false"], { error: msg("invalidValue") })
    .transform((value) => value === "true"),
});

// Longest search term on /admin/users; longer input is cut.
export const USER_SEARCH_MAX_LENGTH = 100;

export type UserListFilters = { q: string; bannedOnly: boolean };

// The query of /admin/users: `q` (trimmed, inner whitespace collapsed, cut to
// the limit), `banned=1` for banned users only. Anything else is dropped;
// the page redirects to the canonical query.
export function parseUserFilters(
  raw: Record<string, string | string[] | undefined>,
): UserListFilters {
  const q = typeof raw.q === "string" ? raw.q : "";
  return {
    q: q.replace(/\s+/g, " ").trim().slice(0, USER_SEARCH_MAX_LENGTH).trim(),
    bannedOnly: raw.banned === "1",
  };
}

// Canonical query string for the filters and page (keys in a fixed order).
export function userListQuery(filters: UserListFilters, page = 1) {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.bannedOnly) query.set("banned", "1");
  if (page > 1) query.set("page", String(page));
  return query.toString();
}
