import { describe, expect, it } from "vitest";
import {
  closeReportsSchema,
  hideItemSchema,
  MAX_REPORTS_PER_ACTION,
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
