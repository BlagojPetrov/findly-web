import { describe, expect, it } from "vitest";
import {
  calendarDay,
  clockTime,
  dayParts,
  elapsedSince,
  previousDay,
  todayInAppTimeZone,
} from "./dates";

describe("clockTime", () => {
  it.each([
    // Summer time (UTC+2) and winter time (UTC+1), 24-hour clock.
    ["2026-09-25T21:59:00Z", "23:59"],
    ["2026-09-25T22:05:00Z", "00:05"],
    ["2026-12-31T12:30:00Z", "13:30"],
  ])("%s is %s in Macedonia", (instant, time) => {
    expect(clockTime(new Date(instant))).toBe(time);
  });
});

describe("previousDay", () => {
  it.each([
    ["2026-10-02", "2026-10-01"],
    ["2026-03-01", "2026-02-28"],
    ["2027-01-01", "2026-12-31"],
    // The day after the switch to summer time.
    ["2026-03-30", "2026-03-29"],
  ])("before %s is %s", (day, previous) => {
    expect(previousDay(day)).toBe(previous);
  });
});

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

describe("dayParts", () => {
  it("splits a day without leading zeros", () => {
    expect(dayParts("2026-09-01")).toEqual({
      day: "1",
      month: "9",
      year: "2026",
    });
    expect(dayParts("2026-12-25")).toEqual({
      day: "25",
      month: "12",
      year: "2026",
    });
  });
});

describe("elapsedSince", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const ago = (ms: number) => elapsedSince(new Date(now.getTime() - ms), now);

  it("counts minutes, hours and days", () => {
    expect(ago(0)).toEqual({ unit: "now" });
    expect(ago(59_000)).toEqual({ unit: "now" });
    expect(ago(60_000)).toEqual({ unit: "minutes", count: 1 });
    expect(ago(59 * 60_000)).toEqual({ unit: "minutes", count: 59 });
    expect(ago(60 * 60_000)).toEqual({ unit: "hours", count: 1 });
    expect(ago(23.9 * 3_600_000)).toEqual({ unit: "hours", count: 23 });
    expect(ago(24 * 3_600_000)).toEqual({ unit: "days", count: 1 });
    expect(ago(6.9 * 86_400_000)).toEqual({ unit: "days", count: 6 });
  });

  it("treats a time in the future as now", () => {
    expect(ago(-5_000)).toEqual({ unit: "now" });
  });

  it("gives the calendar day in Macedonia after a week", () => {
    // 2026-09-23 22:30 UTC is already the 24th in Skopje (UTC+2).
    expect(elapsedSince(new Date("2026-09-23T22:30:00Z"), now)).toEqual({
      unit: "date",
      day: "24",
      month: "9",
      year: "2026",
    });
  });
});
