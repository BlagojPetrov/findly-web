import { describe, expect, it } from "vitest";
import { REPORT_DETAILS_MAX_LENGTH, reportItemSchema } from "./reports";

const itemId = "47000000-0000-4000-8000-000000000001";

describe("reportItemSchema", () => {
  it("accepts every reason without details", () => {
    for (const reason of [
      "spam",
      "inappropriate",
      "fraud",
      "duplicate",
      "other",
    ]) {
      expect(reportItemSchema.parse({ itemId, reason })).toEqual({
        itemId,
        reason,
        details: null,
      });
    }
  });

  it("stores empty and whitespace-only details as null", () => {
    for (const details of ["", "  \r\n\t "]) {
      expect(
        reportItemSchema.parse({ itemId, reason: "spam", details }).details,
      ).toBeNull();
    }
  });

  it("trims details and normalizes line breaks", () => {
    expect(
      reportItemSchema.parse({
        itemId,
        reason: "other",
        details: "  first\r\nsecond\rthird \n",
      }).details,
    ).toBe("first\nsecond\nthird");
  });

  it("counts a line break once at the limit", () => {
    const details = `${"a".repeat(REPORT_DETAILS_MAX_LENGTH - 2)}\r\nb`;
    expect(
      reportItemSchema.parse({ itemId, reason: "fraud", details }).details,
    ).toHaveLength(REPORT_DETAILS_MAX_LENGTH);
  });

  it("rejects details over the limit", () => {
    const result = reportItemSchema.safeParse({
      itemId,
      reason: "fraud",
      details: "a".repeat(REPORT_DETAILS_MAX_LENGTH + 1),
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["details"],
      message: "reportDetailsTooLong",
    });
  });

  it.each([[undefined], [null], [""], ["abuse"]])(
    "rejects the reason %j",
    (reason) => {
      const result = reportItemSchema.safeParse({ itemId, reason });
      expect(result.error?.issues[0]).toMatchObject({
        path: ["reason"],
        message: "reportReasonInvalid",
      });
    },
  );

  it("rejects an invalid item id", () => {
    const result = reportItemSchema.safeParse({
      itemId: "nope",
      reason: "spam",
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["itemId"],
      message: "invalidValue",
    });
  });
});
