// @vitest-environment jsdom
import { Map as LeafletMap } from "leaflet";
import { describe, expect, it } from "vitest";
import "./leaflet-fixes";

type Internals = {
  _animatingZoom: boolean;
  _animateToCenter: unknown;
  _animateToZoom: number;
  _onZoomTransitionEnd(): void;
};

describe("leaflet-fixes", () => {
  it("ignores a zoom animation that ends after the map was removed", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const map = new LeafletMap(container).setView([41.9981, 21.4254], 13);
    const internals = map as unknown as Internals;
    // As if remove() ran during a zoom animation: its timer fires later.
    internals._animatingZoom = true;
    map.remove();
    expect(() => internals._onZoomTransitionEnd()).not.toThrow();
    container.remove();
  });

  it("still ends the animation of a live map", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const map = new LeafletMap(container).setView([41.9981, 21.4254], 13);
    const internals = map as unknown as Internals;
    let moveEnds = 0;
    map.on("moveend", () => moveEnds++);
    internals._animatingZoom = true;
    internals._animateToCenter = map.getCenter();
    internals._animateToZoom = 14;
    internals._onZoomTransitionEnd();
    expect(internals._animatingZoom).toBe(false);
    expect(moveEnds).toBe(1);
    expect(map.getZoom()).toBe(14);
    map.remove();
    container.remove();
  });
});
