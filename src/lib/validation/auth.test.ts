import { describe, expect, it } from "vitest";
import { z } from "zod";
import { resetPasswordSchema, signInSchema, signUpSchema } from "./auth";

const fieldErrors = (result: {
  success: boolean;
  error?: z.ZodError;
}): Record<string, string[] | undefined> =>
  result.error ? z.flattenError(result.error).fieldErrors : {};

const validSignUp = {
  displayName: "Ана Петрова",
  email: "ana@example.com",
  password: "tajna-lozinka",
  confirmPassword: "tajna-lozinka",
};

describe("signInSchema", () => {
  it("normalizes the email", () => {
    const result = signInSchema.parse({
      email: "  Ana@Example.COM ",
      password: "x",
    });
    expect(result.email).toBe("ana@example.com");
  });

  it("requires both fields (missing FormData values are null)", () => {
    const result = signInSchema.safeParse({ email: null, password: null });
    expect(fieldErrors(result)).toEqual({
      email: ["required"],
      password: ["required"],
    });
  });

  it("rejects an invalid email", () => {
    const result = signInSchema.safeParse({ email: "ana@", password: "x" });
    expect(fieldErrors(result)).toEqual({ email: ["emailInvalid"] });
  });
});

describe("signUpSchema", () => {
  it("accepts valid input and trims the name", () => {
    const result = signUpSchema.parse({
      ...validSignUp,
      displayName: "  Ана Петрова  ",
    });
    expect(result.displayName).toBe("Ана Петрова");
  });

  it.each([
    [{ displayName: "А" }, "displayName", "displayNameTooShort"],
    [{ displayName: "x".repeat(51) }, "displayName", "displayNameTooLong"],
    [
      { password: "short", confirmPassword: "short" },
      "password",
      "passwordTooShort",
    ],
    [
      { password: "x".repeat(73), confirmPassword: "x".repeat(73) },
      "password",
      "passwordTooLong",
    ],
    [{ confirmPassword: "different" }, "confirmPassword", "passwordsDontMatch"],
  ])("rejects %j", (override, field, message) => {
    const result = signUpSchema.safeParse({ ...validSignUp, ...override });
    expect(fieldErrors(result)).toEqual({ [field]: [message] });
  });

  it("does not trim passwords", () => {
    const result = signUpSchema.parse({
      ...validSignUp,
      password: " spaces ok ",
      confirmPassword: " spaces ok ",
    });
    expect(result.password).toBe(" spaces ok ");
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "nova-lozinka",
      confirmPassword: "nova-lozinka",
    });
    expect(result.success).toBe(true);
  });

  it.each([
    [{ password: "", confirmPassword: "" }, "password", "required"],
    [
      { password: "short", confirmPassword: "short" },
      "password",
      "passwordTooShort",
    ],
    [
      { password: "nova-lozinka", confirmPassword: "druga-lozinka" },
      "confirmPassword",
      "passwordsDontMatch",
    ],
  ])("rejects %j", (input, field, message) => {
    const errors = fieldErrors(resetPasswordSchema.safeParse(input));
    expect(errors[field]?.[0]).toBe(message);
  });
});

describe("empty fields", () => {
  it("reports empty fields as required, not as too short", () => {
    const result = signUpSchema.safeParse({
      displayName: "   ",
      email: "",
      password: "",
      confirmPassword: "",
    });
    const errors = fieldErrors(result);
    expect(errors.displayName?.[0]).toBe("required");
    expect(errors.email?.[0]).toBe("required");
    expect(errors.password?.[0]).toBe("required");
    expect(errors.confirmPassword?.[0]).toBe("required");
  });
});
