// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchForm } from "./search-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// next/form calls onSubmit and navigates itself unless it was prevented.
const nativeSubmit = vi.fn();
vi.mock("next/form", () => ({
  default: ({
    onSubmit,
    ...props
  }: {
    onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  }) => (
    <form
      {...props}
      onSubmit={(event) => {
        onSubmit?.(event);
        if (!event.defaultPrevented) nativeSubmit();
        event.preventDefault();
      }}
    />
  ),
}));
vi.mock("@/components/search/pending-marker", () => ({
  FormPendingMarker: () => null,
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
  push.mockReset();
  nativeSubmit.mockReset();
});

// The fields as the filter form posts them: empty ones included, in the
// form's order (not the canonical one). The map view loads its URL rules
// with import(), so the click is awaited.
async function render(mapView: boolean, action = "/items") {
  act(() =>
    root.render(
      <SearchForm action={action} mapView={mapView}>
        {mapView && <input type="hidden" name="view" value="map" />}
        <input name="q" defaultValue=" keys  " />
        <input type="radio" name="type" value="found" defaultChecked />
        <input type="checkbox" name="category" value="wallet" defaultChecked />
        <input type="checkbox" name="category" value="keys" defaultChecked />
        <input name="from" defaultValue="" />
        <input name="to" defaultValue="" />
        <input name="lat" defaultValue="41.9981" disabled />
        <input type="radio" name="status" value="active" defaultChecked />
        <button type="submit">Apply</button>
      </SearchForm>,
    ),
  );
  await act(async () => {
    container.querySelector("button")!.click();
    await vi.dynamicImportSettled();
  });
}

describe("SearchForm", () => {
  it("goes straight to the canonical map URL in the map view", async () => {
    await render(true);
    expect(push).toHaveBeenCalledWith(
      "/items?q=keys&type=found&category=wallet%2Ckeys&view=map",
    );
    expect(nativeSubmit).not.toHaveBeenCalled();
  });

  it("keeps the locale path", async () => {
    await render(true, "/en/items");
    expect(push.mock.calls[0][0]).toMatch(/^\/en\/items\?/);
  });

  it("submits normally in the list view (the page redirects)", async () => {
    await render(false);
    expect(push).not.toHaveBeenCalled();
    expect(nativeSubmit).toHaveBeenCalledOnce();
  });
});
