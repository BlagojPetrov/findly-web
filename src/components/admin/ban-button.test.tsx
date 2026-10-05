// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setUserBanned } from "@/actions/admin";
import mk from "../../../messages/mk.json";
import { BanButton } from "./ban-button";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/actions/admin", () => ({ setUserBanned: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

// React only runs act() warnings-free with this flag.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const userId = "00000000-0000-4000-8000-00000000000b";
const t = mk.Admin.users;

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
  document.body.innerHTML = "";
  vi.mocked(setUserBanned).mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

function render(banned: boolean) {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={mk}>
        <BanButton userId={userId} name="Ана" banned={banned} />
      </NextIntlClientProvider>,
    ),
  );
}

const button = (text: string, scope = "") =>
  [...document.querySelectorAll(`${scope} button`)].find(
    (b) => b.textContent === text,
  ) as HTMLButtonElement | undefined;

function sent() {
  const data = vi.mocked(setUserBanned).mock.calls[0][0];
  return { userId: data.get("userId"), banned: data.get("banned") };
}

describe("BanButton", () => {
  it("bans after a confirmation", async () => {
    vi.mocked(setUserBanned).mockResolvedValue({ ok: true, data: undefined });
    render(false);
    await act(async () => button(t.ban)!.click());
    expect(setUserBanned).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Да се блокира Ана?");

    await act(async () => button(t.cancel)!.click());
    expect(setUserBanned).not.toHaveBeenCalled();

    await act(async () => button(t.ban)!.click());
    await act(async () =>
      button(t.confirmBan, '[role="alertdialog"]')!.click(),
    );
    expect(sent()).toEqual({ userId, banned: "true" });
    expect(toast.success).toHaveBeenCalledWith("Ана е блокиран(а).");
  });

  it("lifts a ban without a confirmation", async () => {
    vi.mocked(setUserBanned).mockResolvedValue({ ok: true, data: undefined });
    render(true);
    expect(button(t.ban)).toBeUndefined();
    await act(async () => button(t.unban)!.click());
    expect(sent()).toEqual({ userId, banned: "false" });
    expect(toast.success).toHaveBeenCalledWith("Блокадата на Ана е укината.");
  });

  it("shows refusals", async () => {
    vi.mocked(setUserBanned).mockResolvedValue({
      ok: false,
      error: "forbidden",
    });
    render(true);
    await act(async () => button(t.unban)!.click());
    expect(toast.error).toHaveBeenCalledWith(mk.Errors.forbidden);
    expect(toast.success).not.toHaveBeenCalled();
    expect(button(t.unban)!.disabled).toBe(false);
  });
});
