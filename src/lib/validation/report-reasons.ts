// Flag reasons and limits without Zod, for the report dialog in the browser
// (P11.S5). `./reports` re-exports them with its schema.

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
