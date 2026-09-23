import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/items/new?type=lost", "/items/new?type=lost"],
    ["/en/items#top", "/en/items#top"],
    ["/items/../profile", "/profile"],
  ])("keeps the relative path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "dashboard",
    "https://evil.com",
    "//evil.com",
    "//evil.com/path",
    "/\\evil.com",
    "/\\/evil.com",
    "\\\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "javascript:alert(1)",
  ])("rejects %j", (input) => {
    expect(safeRedirectPath(input)).toBe("/");
  });

  it("uses the given fallback", () => {
    expect(safeRedirectPath("https://evil.com", "/dashboard")).toBe(
      "/dashboard",
    );
  });
});
