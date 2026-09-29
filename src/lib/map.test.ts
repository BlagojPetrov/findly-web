import { describe, expect, it } from "vitest";
import { distanceDisplay, osmUrl } from "./map";

describe("osmUrl", () => {
  it("puts a marker at the point with 6 decimals", () => {
    expect(osmUrl({ lat: 41.997115, lng: 21.43325 })).toBe(
      "https://www.openstreetmap.org/?mlat=41.997115&mlon=21.433250#map=17/41.997115/21.433250",
    );
  });

  it("keeps negative coordinates", () => {
    expect(osmUrl({ lat: -33.8688, lng: -151.2093 })).toBe(
      "https://www.openstreetmap.org/?mlat=-33.868800&mlon=-151.209300#map=17/-33.868800/-151.209300",
    );
  });
});

describe("distanceDisplay", () => {
  it.each([
    [0, 0, "meter", 0],
    [4, 0, "meter", 0],
    [446, 450, "meter", 0],
    [994, 990, "meter", 0],
    [996, 0.996, "kilometer", 1],
    [1499.5, 1.4995, "kilometer", 1],
    [9949, 9.949, "kilometer", 1],
    [9950, 9.95, "kilometer", 0],
    [42_300, 42.3, "kilometer", 0],
  ])("%d m → %d %s", (meters, value, unit, maximumFractionDigits) => {
    const shown = distanceDisplay(meters);
    expect(shown).toMatchObject({ unit, maximumFractionDigits });
    expect(shown.value).toBeCloseTo(value, 6);
  });
});
