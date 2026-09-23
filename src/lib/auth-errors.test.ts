import { AuthError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { authErrorCode, authFailure } from "./auth-errors";

describe("authErrorCode", () => {
  it.each([
    ["invalid_credentials", 400, "invalid_credentials"],
    ["email_not_confirmed", 400, "email_not_confirmed"],
    ["weak_password", 422, "weak_password"],
    ["over_email_send_rate_limit", 429, "rate_limited"],
    ["email_address_not_authorized", 400, "email_send_failed"],
    ["something_new", 429, "rate_limited"],
    ["something_new", 500, "unknown"],
  ] as const)("maps %s (%i) to %s", (code, status, expected) => {
    expect(authErrorCode(new AuthError("x", status, code))).toBe(expected);
  });

  it("recognizes email sending failures without a code", () => {
    const error = new AuthError("Error sending confirmation email", 500);
    expect(authErrorCode(error)).toBe("email_send_failed");
  });
});

describe("authFailure", () => {
  it("puts an address rejected by Supabase on the email field", () => {
    const error = new AuthError(
      "Email address is invalid",
      400,
      "email_address_invalid",
    );
    expect(authFailure(error)).toEqual({
      ok: false,
      error: "validation",
      fieldErrors: { email: ["emailInvalid"] },
    });
  });

  it("returns the mapped code for other errors", () => {
    const error = new AuthError("x", 400, "invalid_credentials");
    expect(authFailure(error)).toEqual({
      ok: false,
      error: "invalid_credentials",
    });
  });
});
