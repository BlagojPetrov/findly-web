// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapItem } from "@/lib/map-items";
import { parseSearchParams, type SearchFilters } from "@/lib/validation/search";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { MapResults } from "./map-results";

let mapProps: { items: MapItem[]; circle: unknown };
vi.mock("@/components/map/results-map", () => ({
  ResultsMap: (props: typeof mapProps) => {
    mapProps = props;
    return null;
  },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    ...props
  }: {
    href: { pathname: string; query: Record<string, string> };
  }) => (
    <a
      {...props}
      href={`${href.pathname}?${new URLSearchParams(href.query)}`}
    />
  ),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const item = (id: string) =>
  ({
    id,
    type: "lost",
    status: "active",
    title: id,
    occurredOn: "2026-09-01",
    locationName: null,
    lat: 41.4,
    lng: 22,
    category: { slug: "wallet", icon: "wallet", name_mk: "", name_en: "" },
    coverPath: null,
  }) satisfies MapItem;

const filters = (search: string): SearchFilters =>
  parseSearchParams(new URLSearchParams(search));

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

function render(
  props: Parameters<typeof MapResults>[0],
  locale: "mk" | "en" = "mk",
) {
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "mk" ? mk : en}
      >
        <MapResults {...props} />
      </NextIntlClientProvider>,
    ),
  );
}

const notice = () => container.querySelector('[role="status"]');

describe("MapResults", () => {
  it("says when more reports match than the map shows", () => {
    const items = Array.from({ length: 300 }, (_, i) => item(`i${i}`));
    render({ filters: filters("view=map"), items, total: 301 });
    expect(notice()!.textContent).toBe(
      "Картата ги прикажува првите 300 од 301 пријави што одговараат. Стеснете ги филтрите или користете ја листата за да ги видите сите.",
    );
    expect(mapProps.items).toHaveLength(300);
  });

  it("says it in English", () => {
    render(
      { filters: filters("view=map"), items: [item("a")], total: 1200 },
      "en",
    );
    expect(notice()!.textContent).toBe(
      "The map shows the first 1 of 1200 matching reports. Narrow the filters or use the list to see all of them.",
    );
  });

  it("has no notice when the map shows every match", () => {
    render({ filters: filters("view=map"), items: [item("a")], total: 1 });
    expect(notice()).toBeNull();
  });

  it("passes the search circle only with a radius", () => {
    render({
      filters: filters("lat=41.9981&lng=21.4254&radius=5&view=map"),
      items: [item("a")],
      total: 1,
    });
    expect(mapProps.circle).toEqual({
      center: { lat: 41.9981, lng: 21.4254 },
      radiusKm: 5,
    });
    render({
      filters: filters("lat=41.9981&lng=21.4254&view=map"),
      items: [item("a")],
      total: 1,
    });
    expect(mapProps.circle).toBeNull();
  });

  it("links to the list with the same filters for browsers without JavaScript", () => {
    // The browser renders <noscript> content only without JavaScript, so
    // this checks the server's HTML.
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="mk" messages={mk}>
        <MapResults
          filters={filters("q=keys&type=found&view=map")}
          items={[item("a")]}
          total={1}
        />
      </NextIntlClientProvider>,
    );
    const noscript = html.match(/<noscript>(.*)<\/noscript>/)![1];
    expect(noscript).toContain("За картата е потребен JavaScript.");
    expect(noscript).toContain('href="/items?q=keys&amp;type=found"');
    expect(noscript).toContain("Прикажи ги резултатите како листа");
  });
});
