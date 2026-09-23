import { z } from "zod";
import type messages from "../../messages/mk.json";

// Every error code must have a translation in the "Errors" namespace, so the
// UI can always show a localized message.
export type ErrorCode = keyof (typeof messages)["Errors"];

export type FieldErrors = Record<string, string[] | undefined>;

// Return type of every Server Action. Errors are codes, not text: the UI
// translates them with useTranslations("Errors").
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorCode; fieldErrors?: FieldErrors };

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: ErrorCode): ActionResult<never> {
  return { ok: false, error };
}

// Field messages come from the Zod schemas and are translation keys
// from the "Validation" namespace (see src/lib/validation/messages.ts).
export function validationError(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "validation",
    fieldErrors: z.flattenError(error).fieldErrors as FieldErrors,
  };
}
