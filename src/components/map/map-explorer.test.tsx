// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemsMapProps } from "@/components/map/items-map";
import { fetchMapItems, type MapItem } from "@/lib/map-items";
import messages from "../../../messages/mk.json";
import { MAP_LOAD_DEBOUNCE_MS, MapExplorer } from "./map-explorer";

// Leaflet is browser-only: a stand-in that exposes the props it receives.
let mapProps: ItemsMapProps;
vi.mock("./index", () => ({
  MapFrame: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ItemsMap: (props: ItemsMapProps) => {
    mapProps = props;
    return null;
  },
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/map-items", async (original) => ({
  ...(await original<typeof import("@/lib/map-items")>()),
  fetchMapItems: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: (props: object) => <a {...props} />,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const item = (id: string, lat: number, type: "lost" | "found" = "lost") =>
  ({
    id,
    type,
    title: `Title ${id}`,
    occurredOn: "2026-09-01",
    locationName: "Кавадарци",
    lat,
    lng: 22,
    category: {
      slug: "wallet",
      icon: "wallet",
      name_mk: "Паричник",
      name_en: "Wallet",
    },
    coverPath: null,
  }) satisfies MapItem;

const area = { south: 41, west: 21, north: 42, east: 23 };

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.mocked(fetchMapItems).mockReset();
});

function render(type: "lost" | "found" | null = null) {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={messages}>
        <MapExplorer type={type} />
      </NextIntlClientProvider>,
    ),
  );
}
const status = () => container.querySelector('[role="status"]')!.textContent;
// Lets the debounce run and the request resolve.
const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(MAP_LOAD_DEBOUNCE_MS);
  });

describe("MapExplorer", () => {
  it("loads the visible area once the map stops moving", async () => {
    vi.mocked(fetchMapItems).mockResolvedValue({
      items: [item("a", 41.4), item("b", 41.4, "found"), item("c", 41.5)],
      total: 3,
    });
    render();
    expect(status()).toBe("Се вчитуваат пријавите…");
    expect(mapProps.initialBounds).toEqual([
      [40.85, 20.45],
      [42.37, 23.04],
    ]);

    // Three moves in a row → one request, for the last area.
    act(() => {
      mapProps.onBoundsChange({ ...area, south: 30 });
      mapProps.onBoundsChange({ ...area, south: 35 });
      mapProps.onBoundsChange(area);
    });
    await settle();
    expect(fetchMapItems).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchMapItems).mock.calls[0][1]).toEqual(area);
    expect(vi.mocked(fetchMapItems).mock.calls[0][2]).toMatchObject({
      type: null,
    });
    expect(status()).toBe("3 пријави во ова подрачје.");

    // Items at one point share a marker.
    expect(mapProps.groups.map((g) => g.items.map((i) => i.id))).toEqual([
      ["a", "b"],
      ["c"],
    ]);
    expect(mapProps.groupLabel(mapProps.groups[0])).toBe(
      "2 пријави на ова место",
    );
    expect(mapProps.groupLabel(mapProps.groups[1])).toBe("Title c");
  });

  it("reloads with the type filter, keeping the area", async () => {
    vi.mocked(fetchMapItems).mockResolvedValue({ items: [], total: 0 });
    render();
    act(() => mapProps.onBoundsChange(area));
    await settle();
    expect(status()).toBe("Нема пријави во ова подрачје.");
    render("found");
    await settle();
    expect(fetchMapItems).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchMapItems).mock.calls[1][1]).toEqual(area);
    expect(vi.mocked(fetchMapItems).mock.calls[1][2]).toMatchObject({
      type: "found",
    });
  });

  it("says when only the newest items are shown", async () => {
    vi.mocked(fetchMapItems).mockResolvedValue({
      items: [item("a", 41.4)],
      total: 540,
    });
    render();
    act(() => mapProps.onBoundsChange(area));
    await settle();
    expect(status()).toBe(
      "Прикажани се најновите 1 од 540 пријави во ова подрачје. Зумирајте за да ги видите сите.",
    );
  });

  it("shows a failure with a retry", async () => {
    vi.mocked(fetchMapItems)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ items: [item("a", 41.4)], total: 1 });
    render();
    act(() => mapProps.onBoundsChange(area));
    await settle();
    expect(status()).toBe("Пријавите не можеа да се вчитаат.");
    const retry = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Обиди се повторно",
    )!;
    act(() => retry.click());
    await settle();
    expect(fetchMapItems).toHaveBeenCalledTimes(2);
    expect(status()).toBe("1 пријава во ова подрачје.");
    expect(container.querySelector("button")).toBeNull();
  });

  it("cancels the request of an area the map has left", async () => {
    let firstSignal: AbortSignal | undefined;
    vi.mocked(fetchMapItems).mockImplementation(
      async (_client, _bounds, options) => {
        firstSignal ??= options?.signal;
        return { items: [], total: 0 };
      },
    );
    render();
    act(() => mapProps.onBoundsChange(area));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAP_LOAD_DEBOUNCE_MS);
    });
    act(() => mapProps.onBoundsChange({ ...area, north: 41.5 }));
    expect(firstSignal?.aborted).toBe(true);
  });

  it("lists a marker's items with links in the popup", () => {
    vi.mocked(fetchMapItems).mockResolvedValue({ items: [], total: 0 });
    render();
    const popup = document.createElement("div");
    document.body.append(popup);
    const popupRoot = createRoot(popup);
    act(() =>
      popupRoot.render(
        <NextIntlClientProvider locale="mk" messages={messages}>
          {mapProps.renderPopup({
            key: "k",
            lat: 41.4,
            lng: 22,
            items: [item("a", 41.4), item("b", 41.4, "found")],
          })}
        </NextIntlClientProvider>,
      ),
    );
    const links = [...popup.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/items/a",
      "/items/b",
    ]);
    expect(links[0].textContent).toBe("Title a");
    expect(popup.textContent).toContain("Изгубено");
    expect(popup.textContent).toContain("Пронајдено");
    expect(popup.textContent).toContain("Паричник");
    expect(popup.textContent).toContain("Кавадарци");
    // Worded by a message, not Intl (F-30).
    expect(popup.textContent).toContain("1.9.2026");
    expect(popup.querySelector("ul")!.getAttribute("aria-label")).toBe(
      "2 пријави на ова место",
    );
    act(() => popupRoot.unmount());
    popup.remove();
  });
});
