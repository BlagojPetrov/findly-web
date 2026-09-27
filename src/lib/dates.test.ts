import { describe, expect, it } from "vitest";
import { calendarDay, todayInAppTimeZone } from "./dates";

describe("todayInAppTimeZone", () => {
  it.each([
    // Summer time (UTC+2): the day starts at 22:00 UTC.
    ["2026-09-25T21:59:00Z", "2026-09-25"],
    ["2026-09-25T22:00:00Z", "2026-09-26"],
    // Winter time (UTC+1): the day starts at 23:00 UTC.
    ["2026-12-31T22:59:00Z", "2026-12-31"],
    ["2026-12-31T23:00:00Z", "2027-01-01"],
  ])("%s is %s in Macedonia", (instant, date) => {
    expect(todayInAppTimeZone(new Date(instant))).toBe(date);
  });
});

describe("calendarDay", () => {
  it("is midnight UTC of that day", () => {
    expect(calendarDay("2026-03-01").toISOString()).toBe(
      "2026-03-01T00:00:00.000Z",
    );
  });
});
