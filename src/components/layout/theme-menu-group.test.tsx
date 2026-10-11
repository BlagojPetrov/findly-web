// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import mk from "../../../messages/mk.json";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeMenuGroup } from "./theme-menu-group";

const { setTheme, theme } = vi.hoisted(() => ({
  setTheme: vi.fn(),
  theme: { current: undefined as string | undefined },
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: theme.current, setTheme }),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

beforeEach(() => {
  setTheme.mockReset();
  theme.current = undefined;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

// The menu renders its content in a portal, so query the document.
function render() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root!.render(
      <NextIntlClientProvider locale="mk" messages={mk}>
        <DropdownMenu open>
          <DropdownMenuTrigger>menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <ThemeMenuGroup />
          </DropdownMenuContent>
        </DropdownMenu>
      </NextIntlClientProvider>,
    ),
  );
}

function options() {
  return [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
}

describe("ThemeMenuGroup", () => {
  it("offers light, dark and system under a label", () => {
    render();
    expect(document.body.textContent).toContain(mk.Header.theme);
    expect(options().map((option) => option.textContent)).toEqual([
      mk.Header.themes.light,
      mk.Header.themes.dark,
      mk.Header.themes.system,
    ]);
  });

  it("checks the stored theme", () => {
    theme.current = "dark";
    render();
    expect(options().map((o) => o.getAttribute("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  it("checks system before a theme is known", () => {
    render();
    expect(options()[2].getAttribute("aria-checked")).toBe("true");
  });

  it("stores the chosen theme", () => {
    theme.current = "system";
    render();
    act(() => options()[1].click());
    expect(setTheme).toHaveBeenCalledWith("dark");
    act(() => options()[0].click());
    expect(setTheme).toHaveBeenLastCalledWith("light");
  });
});
