// @vitest-environment jsdom
import { Marker } from "leaflet";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Marker as MapMarker } from "react-leaflet";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import BaseMap from "./base-map";
import LocationPickerMap from "./location-picker-map";
import { markerIcon } from "./marker-icon";

// Vitest (Vite) turns image imports into URL strings, like Turbopack does
// on Vercel; code that expects webpack's `{ src }` objects fails here.

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const markerImage = () =>
  container.querySelector<HTMLImageElement>("img.leaflet-marker-icon");

describe("markerIcon", () => {
  it("has the bundled image URLs", () => {
    expect(markerIcon.options.iconUrl).toMatch(/marker-icon\.png/);
    expect(markerIcon.options.iconRetinaUrl).toMatch(/marker-icon-2x\.png/);
    expect(markerIcon.options.shadowUrl).toMatch(/marker-shadow\.png/);
  });

  it("creates its image (Leaflet throws without iconUrl)", () => {
    const image = markerIcon.createIcon() as HTMLImageElement;
    expect(image.getAttribute("src")).toMatch(/marker-icon\.png/);
  });

  it("is the default icon of every marker", () => {
    expect(Marker.prototype.options.icon).toBe(markerIcon);
  });
});

describe("maps", () => {
  it("BaseMap shows a plain marker with the icon", () => {
    act(() =>
      root.render(
        <BaseMap>
          <MapMarker position={{ lat: 41.9981, lng: 21.4254 }} />
        </BaseMap>,
      ),
    );
    expect(markerImage()?.getAttribute("src")).toMatch(/marker-icon\.png/);
  });

  it("LocationPickerMap shows a draggable, labelled pin", () => {
    const point = { lat: 41.9981, lng: 21.4254 };
    act(() =>
      root.render(
        <LocationPickerMap
          point={point}
          view={{ center: point, zoom: 17 }}
          onPick={() => {}}
          pinLabel="Избрана локација"
        />,
      ),
    );
    const image = markerImage();
    expect(image?.getAttribute("src")).toMatch(/marker-icon\.png/);
    expect(image?.alt).toBe("Избрана локација");
    expect(image?.classList.contains("leaflet-marker-draggable")).toBe(true);
  });

  it("LocationPickerMap adds the pin when a point is chosen", () => {
    const view = { center: { lat: 41.9981, lng: 21.4254 }, zoom: 13 };
    const render = (point: { lat: number; lng: number } | null) =>
      act(() =>
        root.render(
          <LocationPickerMap
            point={point}
            view={view}
            onPick={() => {}}
            pinLabel="Избрана локација"
          />,
        ),
      );
    render(null);
    expect(markerImage()).toBeNull();
    render({ lat: 41.99, lng: 21.43 });
    expect(markerImage()?.getAttribute("src")).toMatch(/marker-icon\.png/);
  });
});
