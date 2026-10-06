// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hideConversation } from "@/actions/messages";
import { currentMessagesVersion, MESSAGES_READ_EVENT } from "@/lib/chat";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { DeleteConversationButton } from "./delete-conversation-button";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/actions/messages", () => ({ hideConversation: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

// React only runs act() warnings-free with this flag.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const conversationId = "49000000-0000-4000-8000-000000000001";
const t = mk.Messages.list.delete;

let container: HTMLDivElement;
let root: Root;
const readEvents = vi.fn();

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  window.addEventListener(MESSAGES_READ_EVENT, readEvents);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
  window.removeEventListener(MESSAGES_READ_EVENT, readEvents);
  readEvents.mockReset();
  vi.mocked(hideConversation).mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

function render(locale: "mk" | "en" = "mk") {
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "mk" ? mk : en}
      >
        <DeleteConversationButton
          conversationId={conversationId}
          otherName="Ана"
        />
      </NextIntlClientProvider>,
    ),
  );
}

const trigger = (label = "Избриши го разговорот со Ана") =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const dialogButton = (text: string) =>
  [...document.querySelectorAll('[role="alertdialog"] button')].find(
    (b) => b.textContent === text,
  ) as HTMLButtonElement | undefined;
const marker = () => container.querySelector("[data-removed]");

describe("DeleteConversationButton", () => {
  it("asks for a confirmation and can be cancelled", async () => {
    render();
    await act(async () => trigger()!.click());
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain(t.title);
    expect(dialog?.textContent).toContain("Ана го задржува целиот разговор");

    await act(async () => dialogButton(t.cancel)!.click());
    expect(hideConversation).not.toHaveBeenCalled();
    expect(marker()).toBeNull();
  });

  it("hides the row at once and reports success", async () => {
    let resolve!: (value: { ok: true; data: undefined }) => void;
    vi.mocked(hideConversation).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const version = currentMessagesVersion();
    render();
    await act(async () => trigger()!.click());
    await act(async () => dialogButton(t.confirm)!.click());

    expect(marker()).not.toBeNull();
    const data = vi.mocked(hideConversation).mock.calls[0][0];
    expect(data.get("conversationId")).toBe(conversationId);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();

    await act(async () => resolve({ ok: true, data: undefined }));
    expect(toast.success).toHaveBeenCalledWith(t.done);
    expect(readEvents).toHaveBeenCalledTimes(1);
    expect(currentMessagesVersion()).toBe(version + 1);
  });

  it("brings the row back when the action fails", async () => {
    vi.mocked(hideConversation).mockResolvedValue({
      ok: false,
      error: "not_found",
    });
    render();
    await act(async () => trigger()!.click());
    await act(async () => dialogButton(t.confirm)!.click());

    expect(marker()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(mk.Errors.not_found);
    expect(toast.success).not.toHaveBeenCalled();
    expect(readEvents).not.toHaveBeenCalled();
  });

  it("brings the row back when the request throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(hideConversation).mockRejectedValue(new Error("offline"));
    render();
    await act(async () => trigger()!.click());
    await act(async () => dialogButton(t.confirm)!.click());

    expect(marker()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(mk.Errors.unknown);
  });

  it("is translated", async () => {
    render("en");
    await act(async () => trigger("Delete conversation with Ана")!.click());
    expect(
      document.querySelector('[role="alertdialog"]')?.textContent,
    ).toContain("Ана keeps the whole conversation");
    expect(dialogButton("Delete")).toBeDefined();
  });
});
