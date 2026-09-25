import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "./env";

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
