// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSearchParams, type SearchFilters } from "@/lib/validation/search";
import messages from "../../../messages/mk.json";
import { SearchFilters as FilterForm } from "./search-filters";
import { ViewSwitch } from "./view-switch";

// Links and forms as plain elements: the href object becomes a URL.
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    scroll,
    ...props
  }: {
    href: string | { pathname: string; query?: Record<string, string> };
    scroll?: boolean;
  }) => (
    <a
      {...props}
      data-scroll={scroll === false ? "false" : undefined}
      href={
        typeof href === "string"
          ? href
          : `${href.pathname}${
              href.query && Object.keys(href.query).length > 0
                ? `?${new URLSearchParams(href.query)}`
                : ""
            }`
      }
    />
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/form", () => ({
  default: (props: object) => <form {...props} />,
}));
vi.mock("@/components/search/pending-marker", () => ({
  LinkPendingMarker: () => null,
  FormPendingMarker: () => null,
}));
vi.mock("@/components/search/near-filter", () => ({ NearFilter: () => null }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Every criterion of the feed, as the canonical URL writes it.
const criteria =
  "q=%D0%BF%D0%B0%D1%80%D0%B8%D1%87%D0%BD%D0%B8%D0%BA&type=lost&category=wallet%2Ckeys&status=all&from=2026-09-01&to=2026-09-20&lat=41.9981&lng=21.4254&radius=5&sort=relevance";
const filters = (search: string): SearchFilters =>
  parseSearchParams(new URLSearchParams(search), {
    categorySlugs: ["wallet", "keys"],
  });

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

function render(node: React.ReactNode) {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={messages}>
        {node}
      </NextIntlClientProvider>,
    ),
  );
}

const links = () =>
  [...container.querySelectorAll("nav a")].map((a) => ({
    text: a.textContent,
    href: a.getAttribute("href"),
    current: a.getAttribute("aria-current"),
  }));

describe("ViewSwitch", () => {
  it("links to both views with every criterion, the list marked current", () => {
    render(<ViewSwitch filters={filters(`${criteria}&page=3`)} />);
    expect(container.querySelector("nav")!.getAttribute("aria-label")).toBe(
      "Приказ на резултатите",
    );
    expect(links()).toEqual([
      { text: "Листа", href: `/items?${criteria}&page=3`, current: "page" },
      { text: "Карта", href: `/items?${criteria}&view=map`, current: null },
    ]);
  });

  it("marks the map current and links back to the list's first page", () => {
    render(<ViewSwitch filters={filters(`${criteria}&view=map`)} />);
    expect(links()).toEqual([
      { text: "Листа", href: `/items?${criteria}`, current: null },
      { text: "Карта", href: `/items?${criteria}&view=map`, current: "page" },
    ]);
  });

  it("links to the plain feed and map without filters", () => {
    render(<ViewSwitch filters={filters("")} />);
    expect(links().map((link) => link.href)).toEqual([
      "/items",
      "/items?view=map",
    ]);
  });
});

describe("SearchFilters view", () => {
  function renderForm(search: string) {
    render(
      <FilterForm
        action="/items"
        filters={filters(search)}
        categories={[{ slug: "wallet", icon: "wallet", name: "Паричник" }]}
        today="2026-10-17"
      />,
    );
    return container.querySelector("form")!;
  }

  it("posts view=map in the map view and clears to the map", () => {
    const form = renderForm(`${criteria}&view=map`);
    expect(new FormData(form).get("view")).toBe("map");
    const clear = [...form.querySelectorAll("a")].find(
      (a) => a.textContent === messages.Search.clear,
    )!;
    expect(clear.getAttribute("href")).toBe("/items?view=map");
  });

  it("posts no view in the list and clears to the list", () => {
    const form = renderForm(criteria);
    expect(new FormData(form).has("view")).toBe(false);
    const clear = [...form.querySelectorAll("a")].find(
      (a) => a.textContent === messages.Search.clear,
    )!;
    expect(clear.getAttribute("href")).toBe("/items");
  });
});
