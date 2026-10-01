// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startConversation } from "@/actions/messages";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { ContactButton } from "./contact-button";

vi.mock("@/actions/messages", () => ({ startConversation: vi.fn() }));

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
  vi.mocked(startConversation).mockReset();
});

function render(locale: "mk" | "en" = "mk") {
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "mk" ? mk : en}
      >
        <ContactButton
          itemId={itemId}
          label={locale === "mk" ? "Контактирај" : "Contact"}
        />
      </NextIntlClientProvider>,
    ),
  );
  const form = container.querySelector("form")!;
  const button = container.querySelector("button")!;
  return { form, button, submit: () => act(async () => form.requestSubmit()) };
}

describe("ContactButton", () => {
  it("posts only the item id", async () => {
    vi.mocked(startConversation).mockResolvedValue({
      ok: false,
      error: "database",
    });
    const { button, submit } = render();
    expect(button.textContent).toBe("Контактирај");
    expect(button.type).toBe("submit");
    await submit();
    const data = vi.mocked(startConversation).mock.calls[0][0];
    expect([...data.keys()]).toEqual(["itemId"]);
    expect(data.get("itemId")).toBe(itemId);
  });

  it("is disabled with a spinner while the action runs", async () => {
    let finish!: () => void;
    vi.mocked(startConversation).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ ok: false, error: "database" });
        }),
    );
    const { button, submit } = render();
    await submit();
    expect(button.disabled).toBe(true);
    expect(button.querySelector(".animate-spin")).not.toBeNull();
    await act(async () => finish());
    expect(button.disabled).toBe(false);
  });

  it.each([
    ["conversation_limit", mk.Errors.conversation_limit],
    ["conversation_item_inactive", mk.Errors.conversation_item_inactive],
    ["conversation_own_item", mk.Errors.conversation_own_item],
    ["not_found", mk.Errors.not_found],
    ["forbidden", mk.Errors.forbidden],
    ["database", mk.Errors.database],
  ] as const)("shows the %s error in Macedonian", async (error, text) => {
    vi.mocked(startConversation).mockResolvedValue({ ok: false, error });
    const { submit } = render();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(text);
  });

  it("explains the daily limit in English", async () => {
    vi.mocked(startConversation).mockResolvedValue({
      ok: false,
      error: "conversation_limit",
    });
    const { submit } = render("en");
    await submit();
    const alert = container.querySelector('[role="alert"]')?.textContent;
    expect(alert).toBe(en.Errors.conversation_limit);
    expect(alert).toContain("20 in 24 hours");
  });

  it("can be tried again after an error", async () => {
    vi.mocked(startConversation)
      .mockResolvedValueOnce({ ok: false, error: "database" })
      // A real success redirects; the action never resolves for the page.
      .mockImplementationOnce(() => new Promise(() => {}));
    const { button, submit } = render();
    await submit();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(button.disabled).toBe(false);
    await submit();
    expect(vi.mocked(startConversation)).toHaveBeenCalledTimes(2);
    expect(button.disabled).toBe(true);
  });
});
