import type { AuthError } from "@supabase/supabase-js";
import type { ActionResult, ErrorCode } from "@/lib/action-result";

// Maps Supabase Auth errors to our translated error codes.
export function authErrorCode(error: AuthError): ErrorCode {
  // Per-address cooldown between emails ("For security purposes, you can only
  // request this after 42 seconds."). Supabase uses the same code as for the
  // project-wide quota, so the message tells them apart.
  if (/only request this after \d+ seconds?/i.test(error.message)) {
    return "resend_cooldown";
  }

  switch (error.code) {
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "weak_password":
      return "weak_password";
    case "email_address_invalid":
    case "validation_failed":
      return "validation";
    // Too many requests from this client.
    case "over_request_rate_limit":
      return "rate_limited";
    // The project's email quota is used up (with the built-in mailer it is a
    // few emails per hour for the whole project) — not the user's fault.
    case "over_email_send_rate_limit":
      return "email_rate_limited";
    // The built-in Supabase mailer only sends to project team members, and
    // any SMTP failure also lands here.
    case "email_address_not_authorized":
      return "email_send_failed";
    default:
      if (error.status === 429) return "rate_limited";
      if (/sending .*email/i.test(error.message)) return "email_send_failed";
      return "unknown";
  }
}

// Action result for a failed auth call. Supabase rejects some addresses our
// schema accepts (e.g. reserved domains); that error belongs on the email field.
export function authFailure(error: AuthError): ActionResult<never> {
  if (error.code === "email_address_invalid") {
    return {
      ok: false,
      error: "validation",
      fieldErrors: { email: ["emailInvalid"] },
    };
  }
  const code = authErrorCode(error);
  if (operationalErrors.has(code)) {
    // Problems the site owner has to act on (quotas, mail delivery, unknown
    // failures). Logged without the user's email address.
    console.error(
      `Supabase Auth error: ${error.code ?? "no code"} (${error.status ?? "no status"}): ${error.message}`,
    );
  }
  return { ok: false, error: code };
}

const operationalErrors = new Set<ErrorCode>([
  "rate_limited",
  "email_rate_limited",
  "email_send_failed",
  "unknown",
]);
