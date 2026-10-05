// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { AdminNav } from "./admin-nav";

const { pathname } = vi.hoisted(() => ({ pathname: { current: "/admin" } }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
  usePathname: () => pathname.current,
}));

// React only runs act() warnings-free with this flag.
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

function render(locale: "mk" | "en" = "mk") {
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "mk" ? mk : en}
      >
        <AdminNav />
      </NextIntlClientProvider>,
    ),
  );
}

describe("AdminNav", () => {
  it("links the overview and marks it current on /admin", () => {
    pathname.current = "/admin";
    render();
    const nav = container.querySelector("nav")!;
    expect(nav.getAttribute("aria-label")).toBe(mk.Admin.nav.label);
    const link = nav.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("/admin");
    expect(link.textContent).toBe(mk.Admin.nav.overview);
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("does not mark the overview on other admin pages", () => {
    pathname.current = "/admin/reports";
    render("en");
    const link = container.querySelector("a")!;
    expect(link.textContent).toBe(en.Admin.nav.overview);
    expect(link.hasAttribute("aria-current")).toBe(false);
  });
});
