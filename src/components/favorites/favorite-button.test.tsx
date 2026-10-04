// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addFavorite, removeFavorite } from "@/actions/favorites";
import type { ActionResult } from "@/lib/action-result";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { FavoriteButton } from "./favorite-button";

const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn() } }));

vi.mock("@/actions/favorites", () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    ...props
  }: {
    href: { pathname: string; query: Record<string, string> };
  }) => (
    <a
      href={`${href.pathname}?${new URLSearchParams(href.query)}`}
      {...props}
    />
  ),
}));

// React only runs act() warnings-free with this flag.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const itemId = "47000000-0000-4000-8000-000000000001";

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
  vi.mocked(addFavorite).mockReset();
  vi.mocked(removeFavorite).mockReset();
  toast.error.mockReset();
});

function render(
  props: Partial<Parameters<typeof FavoriteButton>[0]> = {},
  locale: "mk" | "en" = "mk",
) {
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "mk" ? mk : en}
      >
        <FavoriteButton
          itemId={itemId}
          isFavorite={false}
          signedIn
          {...props}
        />
      </NextIntlClientProvider>,
    ),
  );
}

const button = () => container.querySelector("button")!;
const pressed = () => button().getAttribute("aria-pressed");

// An action that resolves when the test says so.
function deferred(mock: typeof addFavorite) {
  let finish!: (result: ActionResult) => void;
  vi.mocked(mock).mockImplementation(
    () => new Promise((resolve) => (finish = resolve)),
  );
  return (result: ActionResult) => act(async () => finish(result));
}

describe("FavoriteButton", () => {
  it("shows the saved state as a pressed toggle", () => {
    render({ isFavorite: true });
    expect(pressed()).toBe("true");
    expect(button().getAttribute("aria-label")).toBe(mk.Favorites.label);
    expect(button().title).toBe(mk.Favorites.removeHint);
    render({ isFavorite: false });
    expect(pressed()).toBe("false");
    expect(button().title).toBe(mk.Favorites.addHint);
  });

  it("saves optimistically and keeps the stored state", async () => {
    const finish = deferred(addFavorite);
    render();
    await act(async () => button().click());
    expect(pressed()).toBe("true");
    const data = vi.mocked(addFavorite).mock.calls[0][0];
    expect([...data.entries()]).toEqual([["itemId", itemId]]);
    expect(removeFavorite).not.toHaveBeenCalled();
    // The action's refresh re-renders the page with the stored state.
    render({ isFavorite: true });
    await finish({ ok: true, data: undefined });
    expect(pressed()).toBe("true");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("removes optimistically", async () => {
    const finish = deferred(removeFavorite);
    render({ isFavorite: true });
    await act(async () => button().click());
    expect(pressed()).toBe("false");
    expect(addFavorite).not.toHaveBeenCalled();
    render({ isFavorite: false });
    await finish({ ok: true, data: undefined });
    expect(pressed()).toBe("false");
  });

  it("turns back and shows the error when saving fails", async () => {
    const finish = deferred(addFavorite);
    render();
    await act(async () => button().click());
    expect(pressed()).toBe("true");
    await finish({ ok: false, error: "favorite_unavailable" });
    expect(pressed()).toBe("false");
    expect(toast.error).toHaveBeenCalledWith(mk.Errors.favorite_unavailable);
  });

  it("shows the state as text on the item page", async () => {
    deferred(addFavorite);
    render({ variant: "full" }, "en");
    expect(button().textContent).toBe(en.Favorites.save);
    expect(button().hasAttribute("aria-label")).toBe(false);
    await act(async () => button().click());
    expect(button().textContent).toBe(en.Favorites.saved);
  });

  it("links guests to the login page with the item as the return path", () => {
    render({ signedIn: false });
    expect(container.querySelector("button")).toBeNull();
    const link = container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent(`/items/${itemId}`)}`,
    );
    expect(link.getAttribute("aria-label")).toBe(mk.Favorites.guestLabel);
    expect(addFavorite).not.toHaveBeenCalled();
  });
});
