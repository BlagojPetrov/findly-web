import { describe, expect, it } from "vitest";
import { parseEnv, resolveSiteUrl } from "./env";

describe("resolveSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    expect(
      resolveSiteUrl({
        siteUrl: "https://findly.example.com",
        vercelProductionHost: "findly.vercel.app",
      }),
    ).toBe("https://findly.example.com");
  });

  it("falls back to the Vercel production domain", () => {
    expect(resolveSiteUrl({ vercelProductionHost: "findly.vercel.app" })).toBe(
      "https://findly.vercel.app",
    );
    expect(
      resolveSiteUrl({
        siteUrl: "",
        vercelProductionHost: "findly.vercel.app",
      }),
    ).toBe("https://findly.vercel.app");
  });

  it("falls back to localhost", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });

  it("removes trailing slashes", () => {
    expect(resolveSiteUrl({ siteUrl: "https://findly.vercel.app/" })).toBe(
      "https://findly.vercel.app",
    );
    expect(resolveSiteUrl({ siteUrl: "https://findly.vercel.app//" })).toBe(
      "https://findly.vercel.app",
    );
  });
});

describe("parseEnv", () => {
  const valid = {
    NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
    NEXT_PUBLIC_SITE_URL: "https://findly.vercel.app",
  };

  it("accepts base URLs and a key", () => {
    expect(parseEnv(valid)).toEqual(valid);
    expect(
      parseEnv({ ...valid, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }),
    ).toEqual({ ...valid, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
  });

  it("rejects a missing or invalid URL", () => {
    expect(() =>
      parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: undefined }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_URL: invalid URL");
    expect(() =>
      parseEnv({ ...valid, NEXT_PUBLIC_SITE_URL: "findly.vercel.app" }),
    ).toThrow("NEXT_PUBLIC_SITE_URL: invalid URL");
  });

  it("rejects URLs with a path", () => {
    expect(() =>
      parseEnv({
        ...valid,
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co/rest/v1",
      }),
    ).toThrow("without /rest/v1");
    expect(() =>
      parseEnv({ ...valid, NEXT_PUBLIC_SITE_URL: "https://x.app/mk" }),
    ).toThrow("without a path");
  });

  it("requires the publishable key", () => {
    expect(() =>
      parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: required");
  });
});
