import { describe, expect, it } from "vitest";
import { pageCount, pageItems } from "./pagination";

describe("pageCount", () => {
  it.each([
    [0, 1],
    [1, 1],
    [20, 1],
    [21, 2],
    [40, 2],
    [55, 3],
  ])("%i results → %i pages of 20", (total, pages) => {
    expect(pageCount(total, 20)).toBe(pages);
  });
});

describe("pageItems", () => {
  it("lists every page when they fit", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 3)).toEqual([1, 2, 3]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it.each([
    [1, [1, 2, 3, 4, 5, "gap", 20]],
    [3, [1, 2, 3, 4, 5, "gap", 20]],
    [4, [1, 2, 3, 4, 5, "gap", 20]],
    [5, [1, "gap", 4, 5, 6, "gap", 20]],
    [10, [1, "gap", 9, 10, 11, "gap", 20]],
    [16, [1, "gap", 15, 16, 17, "gap", 20]],
    [17, [1, "gap", 16, 17, 18, 19, 20]],
    [20, [1, "gap", 16, 17, 18, 19, 20]],
  ])("page %i of 20", (current, items) => {
    expect(pageItems(current, 20)).toEqual(items);
  });

  it("never hides a single page behind a gap", () => {
    for (let total = 1; total <= 30; total++) {
      for (let current = 1; current <= total; current++) {
        const items = pageItems(current, total);
        items.forEach((item, i) => {
          if (item !== "gap") return;
          const before = items[i - 1] as number;
          const after = items[i + 1] as number;
          expect(after - before).toBeGreaterThan(2);
        });
        // Always the first, last and current page, in order, same length.
        const pages = items.filter((item) => item !== "gap");
        expect(pages[0]).toBe(1);
        expect(pages.at(-1)).toBe(total);
        expect(pages).toContain(current);
        expect(pages).toEqual([...pages].sort((a, b) => a - b));
        expect(items.length).toBe(Math.min(total, 7));
      }
    }
  });

  it("supports more siblings", () => {
    expect(pageItems(10, 20, 2)).toEqual([
      1,
      "gap",
      8,
      9,
      10,
      11,
      12,
      "gap",
      20,
    ]);
  });

  it("clamps an out-of-range current page", () => {
    expect(pageItems(0, 20)).toEqual(pageItems(1, 20));
    expect(pageItems(99, 20)).toEqual(pageItems(20, 20));
  });
});
