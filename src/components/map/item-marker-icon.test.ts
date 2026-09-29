// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { itemMarkerIcon } from "./item-marker-icon";

const html = (kind: "lost" | "found" | "mixed", count: number) =>
  itemMarkerIcon(kind, count).options.html as string;

describe("itemMarkerIcon", () => {
  it("uses the type's color", () => {
    expect(html("lost", 1)).toContain("bg-lost");
    expect(html("found", 1)).toContain("bg-found");
    expect(html("mixed", 2)).toContain("bg-primary");
  });

  it("shows the number of items only when there are several", () => {
    expect(html("lost", 1)).toMatch(/"><\/span>$/);
    expect(html("lost", 3)).toMatch(/">3<\/span>$/);
    expect(html("found", 250)).toMatch(/">99\+<\/span>$/);
  });

  it("is centered on the point and reuses icons", () => {
    const icon = itemMarkerIcon("lost", 2);
    expect(icon.options.iconSize).toEqual([28, 28]);
    expect(icon.options.iconAnchor).toEqual([14, 14]);
    expect(icon.options.className).toBe("");
    expect(itemMarkerIcon("lost", 2)).toBe(icon);
  });
});
