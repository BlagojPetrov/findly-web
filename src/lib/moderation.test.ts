import { describe, expect, it } from "vitest";
import {
  groupReports,
  parseModerationAction,
  type QueueRow,
  restoredStatus,
} from "./moderation";

const itemA = "10000000-0000-4000-8000-000000000001";
const itemB = "10000000-0000-4000-8000-000000000002";

function row(
  id: string,
  itemId: string,
  overrides: Partial<QueueRow> = {},
): QueueRow {
  return {
    id,
    reason: "spam",
    details: null,
    created_at: `2026-10-05T10:00:0${id}Z`,
    reporter: { id: `reporter-${id}`, display_name: `Reporter ${id}` },
    item: {
      id: itemId,
      title: `Item ${itemId.at(-1)}`,
      type: "lost",
      status: "active",
      owner: { id: "owner", display_name: "Owner" },
    },
    ...overrides,
  };
}

describe("groupReports", () => {
  it("groups flags by item in the order of their oldest flag", () => {
    const groups = groupReports([
      row("1", itemA),
      row("2", itemB, { reason: "fraud", details: "Asks for money" }),
      row("3", itemA, { reason: "other" }),
    ]);
    expect(groups).toEqual([
      {
        item: {
          id: itemA,
          title: "Item 1",
          type: "lost",
          status: "active",
          owner: { id: "owner", displayName: "Owner" },
        },
        reports: [
          {
            id: "1",
            reason: "spam",
            details: null,
            createdAt: "2026-10-05T10:00:01Z",
            reporter: { id: "reporter-1", displayName: "Reporter 1" },
          },
          {
            id: "3",
            reason: "other",
            details: null,
            createdAt: "2026-10-05T10:00:03Z",
            reporter: { id: "reporter-3", displayName: "Reporter 3" },
          },
        ],
      },
      {
        item: expect.objectContaining({ id: itemB }),
        reports: [
          expect.objectContaining({
            id: "2",
            reason: "fraud",
            details: "Asks for money",
          }),
        ],
      },
    ]);
  });

  it("returns no groups for no flags", () => {
    expect(groupReports([])).toEqual([]);
  });
});

describe("restoredStatus", () => {
  it("returns resolved reports to resolved, others to active", () => {
    expect(restoredStatus("2026-10-01T10:00:00Z")).toBe("resolved");
    expect(restoredStatus(null)).toBe("active");
  });
});

describe("parseModerationAction", () => {
  it("accepts only known actions", () => {
    expect(parseModerationAction("item_hidden")).toBe("item_hidden");
    expect(parseModerationAction("item_restored")).toBe("item_restored");
    for (const value of [undefined, null, "", "deleted", 1, ["item_hidden"]]) {
      expect(parseModerationAction(value)).toBeNull();
    }
  });
});
