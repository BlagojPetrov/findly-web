// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/mk.json";
import { MapFrame } from "./index";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// A controllable IntersectionObserver: `intersect()` reports the frame as
// near the viewport.
let observed: Element[] = [];
let callback: IntersectionObserverCallback | null = null;
let options: IntersectionObserverInit | undefined;
class FakeObserver {
  constructor(
    cb: IntersectionObserverCallback,
    init?: IntersectionObserverInit,
  ) {
    callback = cb;
    options = init;
  }
  observe(element: Element) {
    observed.push(element);
  }
  disconnect() {
    observed = [];
  }
}
const intersect = () =>
  act(() =>
    callback?.(
      observed.map(
        (target) =>
          ({ target, isIntersecting: true }) as IntersectionObserverEntry,
      ),
      {} as IntersectionObserver,
    ),
  );

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  observed = [];
  callback = null;
});

function render(deferred?: boolean) {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={messages}>
        <MapFrame label="Локација" deferred={deferred}>
          <p>map</p>
        </MapFrame>
      </NextIntlClientProvider>,
    ),
  );
}

const region = () => container.querySelector('[role="region"]')!;

describe("MapFrame", () => {
  it("renders the map at once by default", () => {
    render();
    expect(region().getAttribute("aria-label")).toBe("Локација");
    expect(region().textContent).toBe("map");
    expect(observed).toEqual([]);
  });

  it("deferred: shows the placeholder until the frame nears the viewport", () => {
    render(true);
    expect(region().textContent).not.toContain("map");
    expect(region().textContent).toBe(messages.Map.loading);
    expect(observed).toEqual([region()]);
    expect(options?.rootMargin).toBe("300px");

    intersect();
    expect(region().textContent).toBe("map");
    // Mounted for good: the observer is gone.
    expect(observed).toEqual([]);
  });
});
