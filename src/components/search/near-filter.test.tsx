// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocationPickerMapProps } from "@/components/map/location-picker-map";
import type { LatLng } from "@/lib/map";
import type { SearchRadius } from "@/lib/validation/search";
import messages from "../../../messages/mk.json";
import { NearFilter } from "./near-filter";

// Leaflet is browser-only: a stand-in map with a button that picks a point
// and the circle radius it was given.
vi.mock("@/components/map", () => ({
  MapFrame: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LocationPickerMap: ({ onPick, radius }: LocationPickerMapProps) => (
    <button
      type="button"
      data-testid="map"
      data-radius={radius ?? ""}
      onClick={() => onPick({ lat: 41.123456, lng: 21.4 })}
    />
  ),
}));

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
  vi.unstubAllGlobals();
});

function render(
  defaultNear: LatLng | null = null,
  defaultRadius: SearchRadius | null = null,
) {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={messages}>
        <form>
          <NearFilter defaultNear={defaultNear} defaultRadius={defaultRadius} />
        </form>
      </NextIntlClientProvider>,
    ),
  );
  const form = container.querySelector("form")!;
  const button = (name: string) =>
    [...form.querySelectorAll("button")].find((b) =>
      b.textContent?.includes(name),
    );
  const select = form.querySelector("select")!;
  const posted = () => Object.fromEntries(new FormData(form));
  return { form, button, select, posted };
}

function stubGeolocation(
  getCurrentPosition: (
    success: PositionCallback,
    failure: PositionErrorCallback,
  ) => void,
) {
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: { getCurrentPosition },
  });
}

describe("NearFilter", () => {
  it("posts nothing and disables the radius without a center", () => {
    const { select, posted, button } = render();
    expect(select.disabled).toBe(true);
    expect(posted()).toEqual({});
    expect(button("Отстрани")).toBeUndefined();
    expect(container.textContent).toContain("Насекаде");
  });

  it("posts the URL's center and radius", () => {
    const { select, posted } = render({ lat: 41.9981, lng: 21.4 }, 10);
    expect(select.disabled).toBe(false);
    expect(select.value).toBe("10");
    expect(posted()).toEqual({ lat: "41.9981", lng: "21.4", radius: "10" });
    expect(container.textContent).toContain("41.9981, 21.4000");
  });

  it("lists the radius choices", () => {
    const { select } = render({ lat: 41.9981, lng: 21.4 });
    expect([...select.options].map((o) => o.value)).toEqual([
      "",
      "1",
      "2",
      "5",
      "10",
      "25",
      "50",
    ]);
    expect(select.value).toBe("");
  });

  it("uses the device location with a default radius of 5 km", () => {
    stubGeolocation((success) =>
      success({
        coords: { latitude: 41.99814, longitude: 21.42545 },
      } as GeolocationPosition),
    );
    const { button, posted } = render();
    act(() => button("Близу мене")!.click());
    expect(posted()).toEqual({ lat: "41.9981", lng: "21.4255", radius: "5" });
  });

  it("keeps a chosen radius when the center changes", () => {
    stubGeolocation((success) =>
      success({
        coords: { latitude: 42, longitude: 21 },
      } as GeolocationPosition),
    );
    const { button, posted } = render({ lat: 41.9981, lng: 21.4 }, 25);
    act(() => button("Близу мене")!.click());
    expect(posted()).toEqual({ lat: "42", lng: "21", radius: "25" });
  });

  it("shows why the location is not available", () => {
    stubGeolocation((_, failure) =>
      failure({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    );
    const { button, posted } = render();
    act(() => button("Близу мене")!.click());
    expect(container.textContent).toContain("Пристапот до локацијата е одбиен");
    expect(posted()).toEqual({});
  });

  it("picks a point on the map and draws the radius", () => {
    const { button, posted, select } = render();
    expect(container.querySelector("[data-testid=map]")).toBeNull();
    const toggle = button("На картата")!;
    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const map = container.querySelector<HTMLElement>("[data-testid=map]")!;
    expect(map.dataset.radius).toBe("");
    act(() => map.click());
    expect(posted()).toEqual({ lat: "41.1235", lng: "21.4", radius: "5" });
    expect(map.dataset.radius).toBe("5000");

    act(() => {
      select.value = "50";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(posted().radius).toBe("50");
    expect(map.dataset.radius).toBe("50000");
  });

  it("removes the center", () => {
    const { button, posted, select } = render({ lat: 41.9981, lng: 21.4 }, 5);
    act(() => button("Отстрани")!.click());
    expect(posted()).toEqual({});
    expect(select.disabled).toBe(true);
  });
});
