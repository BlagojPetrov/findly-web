// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemsMapProps } from "@/components/map/items-map";
import { MACEDONIA_BOUNDS } from "@/lib/map";
import type { MapItem } from "@/lib/map-items";
import messages from "../../../messages/mk.json";
import { ResultsMap } from "./results-map";

// Leaflet is browser-only: a stand-in that exposes the props it receives.
let mapProps: ItemsMapProps;
let frameLabel: string;
vi.mock("./index", () => ({
  MapFrame: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => {
    frameLabel = label;
    return <div>{children}</div>;
  },
  ItemsMap: (props: ItemsMapProps) => {
    mapProps = props;
    return null;
  },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: (props: object) => <a {...props} />,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const item = (
  id: string,
  lat: number,
  {
    type = "lost",
    status = "active",
  }: { type?: MapItem["type"]; status?: MapItem["status"] } = {},
) =>
  ({
    id,
    type,
    status,
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

function render(props: Parameters<typeof ResultsMap>[0]) {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={messages}>
        <ResultsMap {...props} />
      </NextIntlClientProvider>,
    ),
  );
}

function renderPopup(items: MapItem[]) {
  const popup = document.createElement("div");
  document.body.append(popup);
  const popupRoot = createRoot(popup);
  act(() =>
    popupRoot.render(
      <NextIntlClientProvider locale="mk" messages={messages}>
        {mapProps.renderPopup({ key: "k", lat: 41.4, lng: 22, items })}
      </NextIntlClientProvider>,
    ),
  );
  return {
    popup,
    unmount: () => {
      act(() => popupRoot.unmount());
      popup.remove();
    },
  };
}

describe("ResultsMap", () => {
  it("groups the results by point and labels the markers", () => {
    render({
      items: [
        item("a", 41.4),
        item("b", 41.4, { type: "found" }),
        item("c", 41.5),
      ],
      circle: null,
    });
    expect(frameLabel).toBe("Карта на резултатите");
    expect(mapProps.groups.map((g) => g.items.map((i) => i.id))).toEqual([
      ["a", "b"],
      ["c"],
    ]);
    expect(mapProps.groups.map(mapProps.groupLabel)).toEqual([
      "2 пријави на ова место",
      "Title c",
    ]);
    expect(mapProps.circle).toBeNull();
  });

  it("fits the results", () => {
    render({ items: [item("a", 41.4), item("c", 41.5)], circle: null });
    expect(mapProps.area).toEqual([
      [41.4, 22],
      [41.5, 22],
    ]);
  });

  it("fits North Macedonia without results", () => {
    render({ items: [], circle: null });
    expect(mapProps.area).toEqual(MACEDONIA_BOUNDS);
    expect(mapProps.groups).toEqual([]);
  });

  it("draws and fits the search circle", () => {
    const circle = { center: { lat: 41.9981, lng: 21.4254 }, radiusKm: 5 };
    render({ items: [], circle });
    expect(mapProps.circle).toEqual(circle);
    const [[south], [north]] = mapProps.area;
    expect(south).toBeLessThan(41.9981);
    expect(north).toBeGreaterThan(41.9981);
  });

  it("lists a marker's items with links in the popup", () => {
    render({ items: [], circle: null });
    const { popup, unmount } = renderPopup([
      item("a", 41.4),
      item("b", 41.4, { type: "found", status: "resolved" }),
    ]);
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
    // Resolved reports (status filter) say so; active ones do not.
    const [first, second] = popup.querySelectorAll("li");
    expect(first.textContent).not.toContain("Решено");
    expect(second.textContent).toContain("Решено");
    unmount();
  });
});
