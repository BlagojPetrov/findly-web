// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeReports, hideItem, restoreItem } from "@/actions/admin";
import mk from "../../../messages/mk.json";
import { ModerationActions } from "./moderation-actions";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/actions/admin", () => ({
  closeReports: vi.fn(),
  hideItem: vi.fn(),
  restoreItem: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));

// React only runs act() warnings-free with this flag.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const itemId = "10000000-0000-4000-8000-000000000001";
const reportIds = [
  "47000000-0000-4000-8000-000000000001",
  "47000000-0000-4000-8000-000000000002",
];
const t = mk.Admin.moderation;
const done = { ok: true, data: undefined } as const;

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
  vi.mocked(closeReports).mockReset();
  vi.mocked(hideItem).mockReset();
  vi.mocked(restoreItem).mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

function render(props: { hidden: boolean; reportIds?: string[] }) {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={mk}>
        <ModerationActions itemId={itemId} {...props} />
      </NextIntlClientProvider>,
    ),
  );
}

function button(text: string) {
  return [...document.querySelectorAll("button")].find(
    (b) => b.textContent === text,
  );
}

function sent(action: unknown) {
  const data = vi.mocked(action as typeof hideItem).mock.calls[0][0];
  return {
    itemId: data.get("itemId"),
    reportIds: data.getAll("reportIds"),
    outcome: data.get("outcome"),
  };
}

describe("ModerationActions", () => {
  it("hides a flagged report after a confirmation", async () => {
    vi.mocked(hideItem).mockResolvedValue(done);
    render({ hidden: false, reportIds });
    expect(button(t.hide)).toBeDefined();
    expect(button("Отфрли 2 неправилности")).toBeDefined();
    expect(button("Реши 2 неправилности")).toBeUndefined();

    await act(async () => button(t.hide)!.click());
    expect(hideItem).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain(t.hideTitle);
    expect(document.body.textContent).toContain(
      "2 неправилности ќе бидат означени како решени",
    );
    await act(async () => button(t.confirmHide)!.click());
    expect(sent(hideItem)).toEqual({ itemId, reportIds, outcome: null });
    expect(toast.success).toHaveBeenCalledWith(t.hideToast);
  });

  it("dismisses the flags shown", async () => {
    vi.mocked(closeReports).mockResolvedValue(done);
    render({ hidden: false, reportIds: reportIds.slice(0, 1) });
    await act(async () => button("Отфрли ја неправилноста")!.click());
    expect(sent(closeReports)).toEqual({
      itemId,
      reportIds: reportIds.slice(0, 1),
      outcome: "dismissed",
    });
    expect(toast.success).toHaveBeenCalledWith("Неправилноста е отфрлена.");
  });

  it("resolves the flags of a report that is already hidden", async () => {
    vi.mocked(closeReports).mockResolvedValue(done);
    render({ hidden: true, reportIds });
    expect(button(t.hide)).toBeUndefined();
    await act(async () => button("Реши 2 неправилности")!.click());
    expect(sent(closeReports)).toMatchObject({ outcome: "resolved" });
    expect(toast.success).toHaveBeenCalledWith("2 неправилности се решени.");
  });

  it("restores a hidden report and shows errors", async () => {
    vi.mocked(restoreItem).mockResolvedValue({ ok: false, error: "not_found" });
    render({ hidden: true });
    await act(async () => button(t.restore)!.click());
    expect(sent(restoreItem)).toEqual({ itemId, reportIds: [], outcome: null });
    expect(toast.error).toHaveBeenCalledWith(mk.Errors.not_found);
    expect(toast.success).not.toHaveBeenCalled();
    expect(button(t.restore)!.disabled).toBe(false);
  });

  it("renders nothing for a visible report without flags", () => {
    render({ hidden: false });
    expect(container.innerHTML).toBe("");
  });
});
