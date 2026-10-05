import { describe, expect, it } from "vitest";
import {
  closeReportsSchema,
  hideItemSchema,
  MAX_REPORTS_PER_ACTION,
  parseUserFilters,
  setBannedSchema,
  USER_SEARCH_MAX_LENGTH,
  userListQuery,
} from "./admin";

const itemId = "10000000-0000-4000-8000-000000000001";
const reportId = "47000000-0000-4000-8000-000000000001";

describe("hideItemSchema", () => {
  it("accepts an item with or without flags", () => {
    expect(hideItemSchema.parse({ itemId, reportIds: [] })).toEqual({
      itemId,
      reportIds: [],
    });
    expect(hideItemSchema.parse({ itemId, reportIds: [reportId] })).toEqual({
      itemId,
      reportIds: [reportId],
    });
  });

  it("rejects invalid ids and too many flags", () => {
    expect(
      hideItemSchema.safeParse({ itemId: "x", reportIds: [] }).success,
    ).toBe(false);
    expect(hideItemSchema.safeParse({ itemId, reportIds: ["x"] }).success).toBe(
      false,
    );
    expect(
      hideItemSchema.safeParse({
        itemId,
        reportIds: Array(MAX_REPORTS_PER_ACTION + 1).fill(reportId),
      }).success,
    ).toBe(false);
  });
});

describe("closeReportsSchema", () => {
  it("accepts resolving and dismissing flags", () => {
    for (const outcome of ["resolved", "dismissed"]) {
      expect(
        closeReportsSchema.parse({ itemId, reportIds: [reportId], outcome }),
      ).toEqual({ itemId, reportIds: [reportId], outcome });
    }
  });

  it("needs flags and a known outcome", () => {
    expect(
      closeReportsSchema.safeParse({
        itemId,
        reportIds: [],
        outcome: "resolved",
      }).success,
    ).toBe(false);
    for (const outcome of ["open", "", null]) {
      expect(
        closeReportsSchema.safeParse({ itemId, reportIds: [reportId], outcome })
          .success,
      ).toBe(false);
    }
  });
});

describe("setBannedSchema", () => {
  it("reads the ban flag", () => {
    const userId = "00000000-0000-4000-8000-00000000000a";
    expect(setBannedSchema.parse({ userId, banned: "true" })).toEqual({
      userId,
      banned: true,
    });
    expect(setBannedSchema.parse({ userId, banned: "false" })).toEqual({
      userId,
      banned: false,
    });
    for (const banned of ["1", "", null, "yes"]) {
      expect(setBannedSchema.safeParse({ userId, banned }).success).toBe(false);
    }
    expect(
      setBannedSchema.safeParse({ userId: "x", banned: "true" }).success,
    ).toBe(false);
  });
});

describe("parseUserFilters / userListQuery", () => {
  it("normalizes the search and the banned filter", () => {
    expect(parseUserFilters({})).toEqual({ q: "", bannedOnly: false });
    expect(parseUserFilters({ q: "  Ана   Петрова ", banned: "1" })).toEqual({
      q: "Ана Петрова",
      bannedOnly: true,
    });
    expect(parseUserFilters({ q: ["a", "b"], banned: "true" })).toEqual({
      q: "",
      bannedOnly: false,
    });
    expect(
      parseUserFilters({ q: "x".repeat(USER_SEARCH_MAX_LENGTH + 5) }).q,
    ).toHaveLength(USER_SEARCH_MAX_LENGTH);
  });

  it("builds the canonical query", () => {
    expect(userListQuery({ q: "", bannedOnly: false })).toBe("");
    expect(userListQuery({ q: "", bannedOnly: false }, 1)).toBe("");
    expect(userListQuery({ q: "ана b", bannedOnly: true }, 3)).toBe(
      "q=%D0%B0%D0%BD%D0%B0+b&banned=1&page=3",
    );
  });
});
