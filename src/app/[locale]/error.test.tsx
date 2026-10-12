// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import mk from "../../../messages/mk.json";
import { PageLoading } from "@/components/layout/page-loading";
import ErrorPage from "./error";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function render(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root!.render(
      <NextIntlClientProvider locale="mk" messages={mk}>
        {ui}
      </NextIntlClientProvider>,
    ),
  );
  return container;
}

describe("ErrorPage", () => {
  it("explains the error, shows the digest and logs the error", () => {
    const error = Object.assign(new Error("boom"), { digest: "123abc" });
    const container = render(<ErrorPage error={error} retry={vi.fn()} />);
    expect(container.querySelector("h1")?.textContent).toBe(
      "Нешто тргна наопаку",
    );
    expect(container.textContent).toContain("Код на грешката: 123abc");
    expect(container.textContent).not.toContain("boom");
    expect(console.error).toHaveBeenCalledWith(error);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/");
  });

  it("has no digest line for client errors", () => {
    const container = render(
      <ErrorPage error={new Error("boom")} retry={vi.fn()} />,
    );
    expect(container.textContent).not.toContain("Код на грешката");
  });

  it("retries the segment", () => {
    const retry = vi.fn();
    const container = render(
      <ErrorPage error={new Error("boom")} retry={retry} />,
    );
    const button = container.querySelector("button")!;
    expect(button.textContent).toBe("Обиди се повторно");
    act(() => button.click());
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("PageLoading", () => {
  it("announces loading as a status", () => {
    const container = render(<PageLoading />);
    const status = container.querySelector('[role="status"]');
    expect(status?.textContent).toBe("Се вчитува…");
  });
});
