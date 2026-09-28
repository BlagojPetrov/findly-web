// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/mk.json";
import { MapFrame } from "./index";
import ItemMap from "./item-map";

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
  vi.restoreAllMocks();
});

function render(children: ReactNode) {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={messages}>
        {children}
      </NextIntlClientProvider>,
    ),
  );
}

describe("ItemMap", () => {
  const point = { lat: 41.997115, lng: 21.43325 };

  it("shows a fixed, labelled pin", () => {
    render(<ItemMap point={point} pinLabel="Камен Мост, Скопје" />);
    const pin = container.querySelector<HTMLImageElement>(
      "img.leaflet-marker-icon",
    );
    expect(pin?.getAttribute("src")).toMatch(/marker-icon\.png/);
    expect(pin?.alt).toBe("Камен Мост, Скопје");
    expect(pin?.classList.contains("leaflet-marker-draggable")).toBe(false);
  });

  it("is centered on the stored point", () => {
    // The pin sits at the map's center: layer position (0, 0) in jsdom,
    // where the map has no size (and Leaflet positions with left/top).
    render(<ItemMap point={point} pinLabel="Pin" />);
    const pin = container.querySelector<HTMLElement>(".leaflet-marker-icon");
    expect([pin?.style.left, pin?.style.top]).toEqual(["0px", "0px"]);
  });
});

describe("MapFrame", () => {
  function Broken(): ReactNode {
    throw new Error("Leaflet failed");
  }

  it("replaces a failing map with a message and keeps the page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <MapFrame label="Карта">
          <Broken />
        </MapFrame>
        <p id="after">Опис</p>
      </div>,
    );
    const region = container.querySelector('[role="region"]');
    expect(region?.getAttribute("aria-label")).toBe("Карта");
    expect(region?.textContent).toBe("Картата не може да се прикаже.");
    expect(container.querySelector("#after")?.textContent).toBe("Опис");
  });
});
