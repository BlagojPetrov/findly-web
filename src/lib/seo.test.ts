import { describe, expect, it } from "vitest";
import { localeAlternates, metaDescription, openGraphBase } from "./seo";

describe("localeAlternates", () => {
  it("links both locales, canonical in the page's locale", () => {
    expect(localeAlternates("/items/abc", "mk")).toEqual({
      canonical: "/items/abc",
      languages: {
        mk: "/items/abc",
        en: "/en/items/abc",
        "x-default": "/items/abc",
      },
    });
    expect(localeAlternates("/items/abc", "en").canonical).toBe(
      "/en/items/abc",
    );
  });

  it("maps the home page to / and /en", () => {
    expect(localeAlternates("/", "en")).toEqual({
      canonical: "/en",
      languages: { mk: "/", en: "/en", "x-default": "/" },
    });
  });

  it("keeps the query on every URL", () => {
    expect(localeAlternates("/items", "mk", "type=lost&page=2")).toEqual({
      canonical: "/items?type=lost&page=2",
      languages: {
        mk: "/items?type=lost&page=2",
        en: "/en/items?type=lost&page=2",
        "x-default": "/items?type=lost&page=2",
      },
    });
  });
});

describe("openGraphBase", () => {
  it("names the site and the locales", () => {
    expect(openGraphBase("mk")).toEqual({
      siteName: "Findly",
      locale: "mk_MK",
      alternateLocale: ["en_US"],
    });
    expect(openGraphBase("en").alternateLocale).toEqual(["mk_MK"]);
  });
});

describe("metaDescription", () => {
  it("collapses whitespace and keeps short text", () => {
    expect(metaDescription("  Црн\n\nпаричник   со  документи ")).toBe(
      "Црн паричник со документи",
    );
  });

  it("keeps text of exactly the maximum length", () => {
    const text = "a".repeat(160);
    expect(metaDescription(text)).toBe(text);
  });

  it("cuts long text at a word boundary with an ellipsis", () => {
    const text = `${"збор ".repeat(40)}крај`;
    const result = metaDescription(text);
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith("збор…")).toBe(true);
  });

  it("drops punctuation before the ellipsis", () => {
    expect(metaDescription("Првиот дел, вториот дел", 14)).toBe("Првиот дел…");
  });

  it("cuts a single long word", () => {
    expect(metaDescription("x".repeat(200), 10)).toBe(`${"x".repeat(9)}…`);
  });
});
