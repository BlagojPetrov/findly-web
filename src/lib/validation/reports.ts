import { z } from "zod";
import { msg } from "./messages";
import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  type ReportReason,
} from "./report-reasons";

export { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS, type ReportReason };

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
