import { describe, expect, it } from "vitest";
import {
  groupMatches,
  type MatchRow,
  matchReasons,
  matchStrength,
  parseBreakdown,
  toMatchViews,
} from "./matches";

const viewer = "00000000-0000-4000-8000-00000000000a";
const other = "00000000-0000-4000-8000-00000000000b";
const stranger = "00000000-0000-4000-8000-00000000000c";

type Item = {
  id: string;
  user_id: string;
  status: "active" | "resolved" | "hidden";
};

function item(id: string, userId: string, status: Item["status"] = "active") {
  return { id, user_id: userId, status };
}

function row(
  id: string,
  lost: Item | null,
  found: Item | null,
  overrides: Partial<MatchRow<Item>> = {},
): MatchRow<Item> {
  return {
    id,
    status: "suggested",
    score: 0.8,
    breakdown: { version: "v1", category: 1 },
    created_at: "2026-09-30T10:00:00Z",
    updated_at: "2026-09-30T10:00:00Z",
    lost,
    found,
    ...overrides,
  };
}

describe("parseBreakdown", () => {
  it("reads the stored breakdown", () => {
    expect(
      parseBreakdown({
        version: "v1",
        category: 1,
        distance: 0.819,
        date: 0.931,
        text: 0.857,
        distance_km: 1,
        days_between: 1,
        shared_words: ["crn", "kluca"],
      }),
    ).toEqual({
      category: 1,
      distance_km: 1,
      days_between: 1,
      text: 0.857,
      shared_words: ["crn", "kluca"],
    });
  });

  it("drops malformed fields and tolerates non-objects", () => {
    expect(
      parseBreakdown({
        category: "same",
        distance_km: -1,
        days_between: 1.5,
        text: 2,
        shared_words: [1, 2],
      }),
    ).toEqual({});
    expect(parseBreakdown(null)).toEqual({});
    expect(parseBreakdown([1, 2])).toEqual({});
  });
});

describe("matchReasons", () => {
  it("lists category, distance, date and shared words in order", () => {
    expect(
      matchReasons({
        category: 1,
        distance_km: 1.2,
        days_between: 3,
        text: 0.9,
        shared_words: ["crn", "kluca"],
      }),
    ).toEqual([
      { kind: "category", same: true },
      { kind: "distance", meters: 1200 },
      { kind: "date", days: 3 },
      { kind: "words", words: ["crn", "kluca"], more: 0 },
    ]);
  });

  it("marks the 'other' category as related, not the same", () => {
    expect(matchReasons({ category: 0.5 })).toEqual([
      { kind: "category", same: false },
    ]);
  });

  it("shows at most five shared words and counts the rest", () => {
    const words = ["a1", "a2", "a3", "a4", "a5", "a6", "a7"];
    expect(matchReasons({ shared_words: words })).toEqual([
      { kind: "words", words: words.slice(0, 5), more: 2 },
    ]);
  });

  it("falls back to text similarity without shared words", () => {
    expect(matchReasons({ text: 0.35, shared_words: [] })).toEqual([
      { kind: "text", similar: true },
    ]);
    expect(matchReasons({ text: 0.08 })).toEqual([
      { kind: "text", similar: false },
    ]);
  });

  it("gives nothing for an empty breakdown", () => {
    expect(matchReasons({})).toEqual([]);
  });
});

describe("matchStrength", () => {
  it("names the score", () => {
    expect(matchStrength(0.905)).toBe("strong");
    expect(matchStrength(0.8)).toBe("strong");
    expect(matchStrength(0.79)).toBe("good");
    expect(matchStrength(0.7)).toBe("good");
    expect(matchStrength(0.69)).toBe("possible");
    expect(matchStrength(0.55)).toBe("possible");
  });
});

describe("toMatchViews", () => {
  it("puts the viewer's report first on either side", () => {
    const views = toMatchViews(
      [
        row("m1", item("l1", viewer), item("f1", other)),
        row("m2", item("l2", other), item("f2", viewer)),
      ],
      viewer,
    );
    expect(views.map((v) => [v.id, v.own.id, v.other.id])).toEqual([
      ["m1", "l1", "f1"],
      ["m2", "f2", "l2"],
    ]);
    expect(views[0].breakdown).toEqual({ category: 1 });
  });

  it("drops matches that do not involve the viewer's reports", () => {
    expect(
      toMatchViews(
        [
          row("m1", item("l1", other), item("f1", stranger)),
          // Both reports the viewer's own (cannot happen, never shown).
          row("m2", item("l2", viewer), item("f2", viewer)),
        ],
        viewer,
      ),
    ).toEqual([]);
  });

  it("drops matches with an item the viewer cannot see", () => {
    expect(
      toMatchViews(
        [
          row("m1", item("l1", viewer), null),
          row("m2", null, item("f2", viewer)),
        ],
        viewer,
      ),
    ).toEqual([]);
  });

  it("shows suggested and dismissed matches only between active reports", () => {
    const views = toMatchViews(
      [
        row("m1", item("l1", viewer, "resolved"), item("f1", other)),
        row("m2", item("l2", viewer), item("f2", other, "resolved"), {
          status: "dismissed",
        }),
        row("m3", item("l3", viewer), item("f3", other, "hidden")),
        row("m4", item("l4", viewer), item("f4", other), {
          status: "dismissed",
        }),
      ],
      viewer,
    );
    expect(views.map((v) => v.id)).toEqual(["m4"]);
  });

  it("keeps a confirmed match after a report is resolved, not when hidden", () => {
    const confirmed = { status: "confirmed" as const };
    const views = toMatchViews(
      [
        row("m1", item("l1", viewer, "resolved"), item("f1", other), confirmed),
        row("m2", item("l2", viewer), item("f2", other, "resolved"), confirmed),
        row("m3", item("l3", viewer, "hidden"), item("f3", other), confirmed),
        row("m4", item("l4", viewer), item("f4", other, "hidden"), confirmed),
      ],
      viewer,
    );
    expect(views.map((v) => v.id)).toEqual(["m1", "m2"]);
  });
});

describe("groupMatches", () => {
  it("splits by status, suggested best first, others newest first", () => {
    const views = toMatchViews(
      [
        row("m1", item("l1", viewer), item("f1", other), { score: 0.6 }),
        row("m2", item("l1", viewer), item("f2", other), { score: 0.9 }),
        row("m3", item("l1", viewer), item("f3", other), {
          status: "confirmed",
          updated_at: "2026-09-30T09:00:00Z",
        }),
        row("m4", item("l1", viewer), item("f4", other), {
          status: "confirmed",
          updated_at: "2026-09-30T11:00:00Z",
        }),
        row("m5", item("l1", viewer), item("f5", other), {
          status: "dismissed",
        }),
      ],
      viewer,
    );
    const groups = groupMatches(views);
    expect(groups.suggested.map((v) => v.id)).toEqual(["m2", "m1"]);
    expect(groups.confirmed.map((v) => v.id)).toEqual(["m4", "m3"]);
    expect(groups.dismissed.map((v) => v.id)).toEqual(["m5"]);
  });

  it("keeps the 10 best suggested matches per own report", () => {
    const rows = [
      ...Array.from({ length: 12 }, (_, i) =>
        row(
          `a${String(i).padStart(2, "0")}`,
          item("l1", viewer),
          item(`f${i}`, other),
          {
            score: 0.6 + i * 0.01,
          },
        ),
      ),
      row("b1", item("l2", viewer), item("g1", other), { score: 0.56 }),
    ];
    const { suggested } = groupMatches(toMatchViews(rows, viewer));
    expect(suggested.filter((v) => v.own.id === "l1")).toHaveLength(10);
    expect(suggested.map((v) => v.id)).not.toContain("a00");
    expect(suggested.map((v) => v.id)).not.toContain("a01");
    expect(suggested.at(-1)?.id).toBe("b1");
  });
});
