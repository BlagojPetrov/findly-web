import { describe, expect, it } from "vitest";
import {
  getAuthRedirect,
  isGuestOnlyPath,
  isProtectedPath,
  localizePath,
  splitLocale,
} from "./auth-routes";

const base = "https://findly.test";
const redirectFor = (path: string, signedIn: boolean) => {
  const target = getAuthRedirect(`${base}${path}`, signedIn);
  return target && `${target.pathname}${target.search}`;
};

describe("splitLocale / localizePath", () => {
  it.each([
    ["/profile", "mk", "/profile"],
    ["/en/profile", "en", "/profile"],
    ["/en", "en", "/"],
    ["/", "mk", "/"],
    ["/english", "mk", "/english"],
  ])("splits %s", (pathname, locale, path) => {
    expect(splitLocale(pathname)).toEqual({ locale, path });
  });

  it("adds a prefix only for non-default locales", () => {
    expect(localizePath("/login", "mk")).toBe("/login");
    expect(localizePath("/login", "en")).toBe("/en/login");
    expect(localizePath("/", "en")).toBe("/en");
  });
});

describe("route rules", () => {
  it.each([
    "/dashboard",
    "/profile",
    "/items/new",
    "/items/0b0e2a5c-1111-4222-8333-444455556666/edit",
    "/messages",
    "/messages/abc",
    "/favorites",
    "/notifications",
    "/admin/reports",
  ])("%s is protected", (path) => {
    expect(isProtectedPath(path)).toBe(true);
  });

  it.each([
    "/",
    "/items",
    "/items/0b0e2a5c-1111-4222-8333-444455556666",
    "/map",
    "/login",
    "/profiles",
    "/administrator",
  ])("%s is public", (path) => {
    expect(isProtectedPath(path)).toBe(false);
  });

  it("login and register are guest-only", () => {
    expect(isGuestOnlyPath("/login")).toBe(true);
    expect(isGuestOnlyPath("/register")).toBe(true);
    expect(isGuestOnlyPath("/forgot-password")).toBe(false);
  });
});

describe("getAuthRedirect", () => {
  it("sends guests from protected pages to login with next", () => {
    expect(redirectFor("/profile", false)).toBe("/login?next=%2Fprofile");
    expect(redirectFor("/en/profile", false)).toBe("/en/login?next=%2Fprofile");
    expect(redirectFor("/items/new?type=lost", false)).toBe(
      "/login?next=%2Fitems%2Fnew%3Ftype%3Dlost",
    );
  });

  it("checks the decoded path", () => {
    expect(redirectFor("/%70rofile", false)).toBe("/login?next=%2Fprofile");
  });

  it("lets guests open public pages", () => {
    expect(redirectFor("/", false)).toBeNull();
    expect(redirectFor("/en/items", false)).toBeNull();
    expect(redirectFor("/login", false)).toBeNull();
  });

  it("lets signed-in users open protected pages", () => {
    expect(redirectFor("/profile", true)).toBeNull();
    expect(redirectFor("/en/admin", true)).toBeNull();
  });

  it("sends signed-in users away from login/register", () => {
    expect(redirectFor("/login", true)).toBe("/");
    expect(redirectFor("/en/register", true)).toBe("/en");
    expect(redirectFor("/login?next=%2Fprofile", true)).toBe("/profile");
    expect(redirectFor("/en/login?next=%2Fprofile", true)).toBe("/en/profile");
  });

  it("never redirects signed-in users to another site", () => {
    expect(redirectFor("/login?next=https%3A%2F%2Fevil.com", true)).toBe("/");
    expect(redirectFor("/login?next=%2F%2Fevil.com", true)).toBe("/");
  });

  it("does not double the locale when next already has one", () => {
    expect(redirectFor("/en/login?next=%2Fen%2Fprofile", true)).toBe(
      "/en/profile",
    );
  });
});
