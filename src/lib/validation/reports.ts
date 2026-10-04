import { z } from "zod";
import { msg } from "./messages";

// Reasons a user can give when flagging a report (enum report_reason, §18).
export const REPORT_REASONS = [
  "spam",
  "inappropriate",
  "fraud",
  "duplicate",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

// Same limit as the database check on reports.details.
export const REPORT_DETAILS_MAX_LENGTH = 500;

// A signed-in user flags another user's report for the moderators (§18).
// The reporter comes from the session. Details are optional: line breaks
// are normalized before the length check (form data sends "\r\n", see
// sendMessageSchema), and empty or whitespace-only details are stored as null.
export const reportItemSchema = z.object({
  itemId: z.uuid({ error: msg("invalidValue") }),
  reason: z.enum(REPORT_REASONS, { error: msg("reportReasonInvalid") }),
  details: z
    .string()
    .optional()
    .transform((value) => value?.replace(/\r\n?/g, "\n").trim() || null)
    .refine(
      (value) => value === null || value.length <= REPORT_DETAILS_MAX_LENGTH,
      msg("reportDetailsTooLong"),
    ),
});
