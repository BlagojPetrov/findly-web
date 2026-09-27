import type { ActionResult } from "@/lib/action-result";
import type { ValidationMessage } from "@/lib/validation/messages";

type DatabaseError = { code?: string; message: string };

function fieldError(
  field: string,
  message: ValidationMessage,
): ActionResult<never> {
  return {
    ok: false,
    error: "validation",
    fieldErrors: { [field]: [message] },
  };
}

// Maps errors from writing items (create_item, updates) to action results.
// The triggers and create_item() raise these (migration *_items.sql); the
// Zod schema catches most of them first, so they appear only in edge cases
// (e.g. midnight between validation and insert, or a deleted category).
export function itemWriteFailure(error: DatabaseError): ActionResult<never> {
  switch (error.code) {
    case "FL429": // daily_item_limit
      return { ok: false, error: "rate_limited" };
    case "23514": // check_violation
      if (error.message.includes("occurred_on_in_future")) {
        return fieldError("occurredOn", "dateInFuture");
      }
      if (error.message.includes("too_many_images")) {
        return fieldError("imagePaths", "tooManyImages");
      }
      break;
    case "23503": // foreign_key_violation: the category no longer exists
      return fieldError("categoryId", "categoryInvalid");
    case "42501": // RLS: banned user, or not the owner
      return { ok: false, error: "forbidden" };
    case "P0002": // no_data_found: update_item() found no editable item
      return { ok: false, error: "not_found" };
  }
  console.error(`Item write failed: ${error.code}: ${error.message}`);
  return { ok: false, error: "database" };
}
