// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendMessage } from "@/actions/messages";
import type { ActionResult } from "@/lib/action-result";
import type { ChatMessage } from "@/lib/chat";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { MessageComposer } from "./message-composer";

vi.mock("@/actions/messages", () => ({ sendMessage: vi.fn() }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const conversationId = "49000000-0000-4000-8000-000000000001";
const sent: ChatMessage = {
  id: "4a000000-0000-4000-8000-000000000001",
  senderId: "00000000-0000-4000-8000-00000000000a",
  body: "Здраво",
  createdAt: "2026-10-02T10:00:00.123456+00:00",
  readAt: null,
};

let container: HTMLDivElement;
let root: Root;
let onSent: ReturnType<typeof vi.fn<(message: ChatMessage) => void>>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  onSent = vi.fn();
  vi.mocked(sendMessage)
    .mockReset()
    .mockResolvedValue({ ok: true, data: sent });
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
        <MessageComposer conversationId={conversationId} onSent={onSent} />
      </NextIntlClientProvider>,
    ),
  );
  const field = container.querySelector("textarea")!;
  const button = container.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  )!;
  return { field, button };
}

// Types into the controlled field the way React notices.
function type(field: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function press(field: HTMLTextAreaElement, init: KeyboardEventInit = {}) {
  return act(async () => {
    field.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, ...init }),
    );
  });
}

function sentForm() {
  const data = vi.mocked(sendMessage).mock.calls[0][0];
  return Object.fromEntries(data.entries());
}

const alert = () => container.querySelector('[role="alert"]')?.textContent;

describe("MessageComposer", () => {
  it("cannot send an empty or whitespace-only message", async () => {
    const { field, button } = render();
    expect(button.disabled).toBe(true);
    type(field, "  \n ");
    expect(button.disabled).toBe(true);
    await press(field);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("sends with Enter, then clears the field and hands over the message", async () => {
    const { field, button } = render();
    type(field, "Здраво");
    expect(button.disabled).toBe(false);
    await press(field);
    expect(sentForm()).toEqual({ conversationId, body: "Здраво" });
    expect(onSent).toHaveBeenCalledWith(sent);
    expect(field.value).toBe("");
    expect(document.activeElement).toBe(field);
  });

  it("adds a line with Shift+Enter instead of sending", async () => {
    const { field } = render();
    type(field, "Првиот ред");
    await press(field, { shiftKey: true });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("sends with the button", async () => {
    const { field, button } = render();
    type(field, "Со копче");
    await act(async () => button.click());
    expect(sentForm()).toEqual({ conversationId, body: "Со копче" });
  });

  it("keeps the text read-only while sending", async () => {
    let resolve!: (result: ActionResult<ChatMessage>) => void;
    vi.mocked(sendMessage).mockReturnValue(
      new Promise((done) => (resolve = done)),
    );
    const { field, button } = render();
    type(field, "Чекај");
    await press(field);
    expect(field.readOnly).toBe(true);
    expect(field.value).toBe("Чекај");
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Се испраќа…");
    // A second Enter while sending does not send again.
    await press(field);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true, data: sent }));
    expect(field.readOnly).toBe(false);
    expect(field.value).toBe("");
    expect(button.getAttribute("aria-label")).toBe("Испрати");
  });

  it("keeps the text and shows the error when sending fails", async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      ok: false,
      error: "message_rate_limit",
    });
    const { field } = render();
    type(field, "Брзо");
    await press(field);
    expect(field.value).toBe("Брзо");
    expect(onSent).not.toHaveBeenCalled();
    expect(alert()).toBe(mk.Errors.message_rate_limit);
    // Editing the text clears the error.
    type(field, "Брзо!");
    expect(alert()).toBeUndefined();
  });

  it("shows a field error from the server next to the field", async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      ok: false,
      error: "validation",
      fieldErrors: { body: ["messageTooLong"] },
    });
    const { field } = render();
    type(field, "x");
    await press(field);
    expect(alert()).toBe(mk.Validation.messageTooLong);
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });

  it("limits the length and shows a counter near the limit", () => {
    const { field } = render();
    expect(field.maxLength).toBe(2000);
    type(field, "a".repeat(1799));
    expect(
      container.querySelector('[data-testid="message-counter"]'),
    ).toBeNull();
    type(field, "a".repeat(1850));
    expect(
      container.querySelector('[data-testid="message-counter"]')?.textContent,
    ).toBe("1850 / 2000");
  });

  it("is translated", () => {
    const { field, button } = render("en");
    expect(field.placeholder).toBe("Write a message…");
    expect(field.getAttribute("aria-label")).toBe("Message");
    expect(button.getAttribute("aria-label")).toBe("Send");
  });
});
