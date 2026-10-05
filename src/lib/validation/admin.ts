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
