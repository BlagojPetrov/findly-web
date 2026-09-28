import { describe, expect, it } from "vitest";
import { osmUrl } from "./map";

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
