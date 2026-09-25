import { describe, expect, it } from "vitest";
import { z } from "zod";
import { profileSchema } from "./profile";

function fieldErrors(input: unknown) {
  const result = profileSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("profileSchema", () => {
  it("accepts a valid profile and trims the name", () => {
    expect(
      profileSchema.parse({ displayName: "  Ана  ", preferredLocale: "en" }),
    ).toEqual({ displayName: "Ана", preferredLocale: "en" });
  });

  it.each([
    [null, "required"],
    ["   ", "required"],
    ["A", "displayNameTooShort"],
    ["x".repeat(51), "displayNameTooLong"],
  ])("rejects the name %j", (displayName, message) => {
    // Forms show the first message.
    expect(
      fieldErrors({ displayName, preferredLocale: "mk" }).displayName?.[0],
    ).toBe(message);
  });

  it.each([null, "", "de", "MK"])("rejects the language %j", (locale) => {
    expect(
      fieldErrors({ displayName: "Ana", preferredLocale: locale }),
    ).toEqual({ preferredLocale: ["localeInvalid"] });
  });
});
