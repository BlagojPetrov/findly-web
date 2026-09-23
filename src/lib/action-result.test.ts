import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fail, ok, validationError } from "./action-result";

describe("action results", () => {
  it("wraps data in a success result", () => {
    expect(ok({ id: "1" })).toEqual({ ok: true, data: { id: "1" } });
    expect(ok()).toEqual({ ok: true, data: undefined });
  });

  it("creates an error result with a code", () => {
    expect(fail("unauthorized")).toEqual({ ok: false, error: "unauthorized" });
  });

  it("maps Zod issues to field errors", () => {
    const schema = z.object({
      email: z.email("emailInvalid"),
      name: z.string().min(2, "nameTooShort"),
    });
    const parsed = schema.safeParse({ email: "x", name: "a" });
    if (parsed.success) throw new Error("expected validation to fail");

    expect(validationError(parsed.error)).toEqual({
      ok: false,
      error: "validation",
      fieldErrors: {
        email: ["emailInvalid"],
        name: ["nameTooShort"],
      },
    });
  });
});
