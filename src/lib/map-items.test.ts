import { describe, expect, it } from "vitest";
import { groupByPoint, type MapItem, resultArea } from "./map-items";

const item = (id: string, lat: number, lng: number, type = "lost") =>
  ({
    id,
    type,
    status: "active",
    title: id,
    occurredOn: "2026-09-01",
    locationName: null,
    lat,
    lng,
    category: { slug: "wallet", icon: "wallet", name_mk: "", name_en: "" },
    coverPath: null,
  }) as MapItem;

describe("groupByPoint", () => {
  it("groups items at the same point, keeping the order", () => {
    const groups = groupByPoint([
      item("a", 41.4332802, 22.0122593),
      item("b", 41.432539, 22.007193),
      item("c", 41.4332802, 22.0122593, "found"),
      item("d", 41.433281, 22.012259),
    ]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([
      ["a", "c", "d"],
      ["b"],
    ]);
    expect(groups[0]).toMatchObject({ lat: 41.4332802, lng: 22.0122593 });
  });

  it("keeps points more than ~1 m apart separate", () => {
    expect(
      groupByPoint([
        item("a", 41.43328, 22.01226),
        item("b", 41.4333, 22.01226),
      ]),
    ).toHaveLength(2);
  });
});

describe("resultArea", () => {
  it("covers every report", () => {
    expect(
      resultArea([
        item("a", 41.5, 21.2),
        item("b", 42, 22.4),
        item("c", 41, 22),
      ]),
    ).toEqual([
      [41, 21.2],
      [42, 22.4],
    ]);
  });

  it("is a point for one report", () => {
    expect(resultArea([item("a", 41.5, 21.2)])).toEqual([
      [41.5, 21.2],
      [41.5, 21.2],
    ]);
  });

  it("is null without reports and without a circle", () => {
    expect(resultArea([])).toBeNull();
    expect(resultArea([], null)).toBeNull();
  });

  it("covers the whole search circle", () => {
    const [[south, west], [north, east]] = resultArea([], {
      center: { lat: 41.9981, lng: 21.4254 },
      radiusKm: 10,
    })!;
    // 10 km ≈ 0.0898° of latitude; of longitude more at this latitude.
    expect(north - 41.9981).toBeCloseTo(0.0898, 3);
    expect(41.9981 - south).toBeCloseTo(0.0898, 3);
    expect(east - 21.4254).toBeCloseTo(0.1208, 3);
    expect(21.4254 - west).toBeCloseTo(0.1208, 3);
  });

  it("joins the circle and the reports", () => {
    const area = resultArea([item("a", 41.95, 21.43)], {
      center: { lat: 41.9981, lng: 21.4254 },
      radiusKm: 1,
    })!;
    expect(area[0][0]).toBe(41.95);
    expect(area[1][0]).toBeCloseTo(41.9981 + 1 / 111.32, 6);
  });
});
