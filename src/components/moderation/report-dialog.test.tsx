// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportItem } from "@/actions/reports";
import type { ActionResult } from "@/lib/action-result";
import mk from "../../../messages/mk.json";
import { ReportDialog } from "./report-dialog";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/actions/reports", () => ({ reportItem: vi.fn() }));
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
const t = mk.Moderation.report;

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
  vi.mocked(reportItem).mockReset();
  toast.success.mockReset();
});

function render(props: Partial<Parameters<typeof ReportDialog>[0]> = {}) {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={mk}>
        <ReportDialog itemId={itemId} signedIn reported={false} {...props} />
      </NextIntlClientProvider>,
    ),
  );
}

// The dialog renders in a portal under document.body.
const form = () => document.querySelector("form");
const radio = (reason: string) =>
  document.querySelector<HTMLInputElement>(
    `input[name="reason"][value="${reason}"]`,
  )!;

async function open() {
  await act(async () => container.querySelector("button")!.click());
  expect(form()).not.toBeNull();
}

async function submit(result: ActionResult) {
  vi.mocked(reportItem).mockResolvedValue(result);
  await act(async () => form()!.requestSubmit());
}

describe("ReportDialog", () => {
  it("opens a form with every reason and optional details", async () => {
    render();
    expect(container.textContent).toBe(t.button);
    await open();
    expect(document.body.textContent).toContain(t.title);
    for (const reason of Object.keys(t.reasons)) {
      expect(radio(reason).required).toBe(true);
    }
    const details = document.querySelector("textarea")!;
    expect(details.name).toBe("details");
    expect(details.required).toBe(false);
    expect(details.maxLength).toBe(500);
  });

  it("sends the report, confirms it and closes", async () => {
    render();
    await open();
    radio("fraud").checked = true;
    document.querySelector("textarea")!.value = "Бара пари";
    await submit({ ok: true, data: undefined });
    const data = vi.mocked(reportItem).mock.calls[0][0];
    expect([...data.entries()]).toEqual([
      ["itemId", itemId],
      ["reason", "fraud"],
      ["details", "Бара пари"],
    ]);
    expect(toast.success).toHaveBeenCalledWith(t.success);
    expect(form()).toBeNull();
  });

  it("keeps the form open with the error and the entered values", async () => {
    render();
    await open();
    radio("spam").checked = true;
    document.querySelector("textarea")!.value = "Реклама";
    await submit({ ok: false, error: "report_duplicate" });
    expect(document.querySelector('[role="alert"]')!.textContent).toBe(
      mk.Errors.report_duplicate,
    );
    expect(radio("spam").checked).toBe(true);
    expect(document.querySelector("textarea")!.value).toBe("Реклама");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("shows field errors", async () => {
    render();
    await open();
    radio("other").checked = true;
    await submit({
      ok: false,
      error: "validation",
      fieldErrors: { details: ["reportDetailsTooLong"] },
    });
    expect(document.body.textContent).toContain(
      mk.Validation.reportDetailsTooLong,
    );
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it("shows a note instead of the button after the user reported it", () => {
    render({ reported: true });
    expect(container.querySelector("button")).toBeNull();
    expect(container.textContent).toBe(t.reported);
  });

  it("links guests to the login page with the item as the return path", () => {
    render({ signedIn: false });
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("a")!.getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent(`/items/${itemId}`)}`,
    );
  });
});
