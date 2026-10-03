// @vitest-environment jsdom
import { NextIntlClientProvider, useNow } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationSummary } from "@/lib/conversations";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { ConversationList } from "./conversation-list";

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  return { ...actual, useNow: vi.fn(actual.useNow) };
});
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

// React only runs act() warnings-free with this flag.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const now = new Date("2026-10-01T12:00:00Z");

function conversation(
  overrides: Partial<ConversationSummary> = {},
): ConversationSummary {
  return {
    id: "49000000-0000-4000-8000-000000000001",
    isOwner: false,
    other: { id: "b", displayName: "Ана Стојанова", avatarPath: null },
    item: {
      id: "47000000-0000-4000-8000-000000000001",
      title: "Црн паричник",
      type: "found",
      status: "active",
    },
    lastMessage: { preview: "Дали е ова вашиот?", fromMe: false },
    unreadCount: 0,
    activityAt: "2026-10-01T11:55:00Z",
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // The times follow the browser's clock once mounted (ConversationTime).
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  vi.mocked(useNow).mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

function render(
  conversations: ConversationSummary[],
  locale: "mk" | "en" = "mk",
) {
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "mk" ? mk : en}
        now={now}
        timeZone="Europe/Skopje"
      >
        <ConversationList conversations={conversations} />
      </NextIntlClientProvider>,
    ),
  );
  return [...container.querySelectorAll("li")];
}

describe("ConversationList", () => {
  it("renders the conversations in the given order with links to the chats", () => {
    const rows = render([
      conversation({
        id: "c1",
        other: { id: "1", displayName: "Прва", avatarPath: null },
      }),
      conversation({
        id: "c2",
        other: { id: "2", displayName: "Втора", avatarPath: null },
      }),
    ]);
    expect(rows).toHaveLength(2);
    expect(
      rows.map((row) => row.querySelector("a")?.getAttribute("href")),
    ).toEqual(["/messages/c1", "/messages/c2"]);
    expect(rows.map((row) => row.querySelector("a")?.textContent)).toEqual([
      "Прва",
      "Втора",
    ]);
  });

  it("shows the report, the last message and the time", () => {
    const [row] = render([conversation()]);
    expect(row.textContent).toContain("Пронајдено");
    expect(row.textContent).toContain("Црн паричник");
    expect(row.textContent).toContain("Дали е ова вашиот?");
    expect(row.querySelector("time")?.textContent).toBe("пред 5 минути");
    expect(row.querySelector("time")?.getAttribute("dateTime")).toBe(
      "2026-10-01T11:55:00Z",
    );
  });

  it("marks unread conversations with a count for screen readers", () => {
    const [unread, read] = render([
      conversation({ id: "u", unreadCount: 3 }),
      conversation({ id: "r", unreadCount: 0 }),
    ]);
    expect(unread.dataset.unread).toBe("true");
    const badge = unread.querySelector('[data-testid="conversation-unread"]');
    expect(badge?.querySelector('[aria-hidden="true"]')?.textContent).toBe("3");
    expect(badge?.querySelector(".sr-only")?.textContent).toBe(
      "3 непрочитани пораки",
    );
    expect(unread.querySelector("a")?.className).toContain("font-semibold");
    expect(read.dataset.unread).toBe("false");
    expect(
      read.querySelector('[data-testid="conversation-unread"]'),
    ).toBeNull();
  });

  it("caps the badge at 99+", () => {
    const [row] = render([conversation({ unreadCount: 150 })]);
    expect(
      row.querySelector(
        '[data-testid="conversation-unread"] [aria-hidden="true"]',
      )?.textContent,
    ).toBe("99+");
  });

  it("prefixes the viewer's own last message", () => {
    const [row] = render([
      conversation({ lastMessage: { preview: "Да, мој е.", fromMe: true } }),
    ]);
    expect(row.textContent).toContain("Вие: Да, мој е.");
  });

  it("says when there are no messages yet", () => {
    const [row] = render([conversation({ lastMessage: null })]);
    expect(row.textContent).toContain("Сè уште нема пораки.");
  });

  it("describes a report that is no longer available", () => {
    const [row] = render([conversation({ item: null })]);
    expect(row.textContent).toContain("Пријавата не е достапна");
    expect(row.textContent).not.toContain("Пронајдено");
  });

  it("marks conversations about the viewer's own report", () => {
    const [own, others] = render([
      conversation({ id: "o", isOwner: true }),
      conversation({ id: "x", isOwner: false }),
    ]);
    expect(own.textContent).toContain("Ваша пријава");
    expect(others.textContent).not.toContain("Ваша пријава");
  });

  it("words older times without Intl (F-30)", () => {
    const rows = render([
      conversation({ id: "a", activityAt: "2026-10-01T11:59:40Z" }),
      conversation({ id: "b", activityAt: "2026-10-01T09:00:00Z" }),
      conversation({ id: "c", activityAt: "2026-09-29T12:00:00Z" }),
      conversation({ id: "d", activityAt: "2026-09-01T12:00:00Z" }),
    ]);
    expect(rows.map((row) => row.querySelector("time")?.textContent)).toEqual([
      "сега",
      "пред 3 часа",
      "пред 2 дена",
      "1.9.2026",
    ]);
  });

  // In a Server Component, next-intl ignores `updateInterval` and logs a
  // warning; the list takes the time once and leaves updates to
  // ConversationTime.
  it("reads the time without an update interval", () => {
    render([conversation()]);
    expect(useNow).toHaveBeenCalled();
    for (const args of vi.mocked(useNow).mock.calls) {
      expect(args[0]?.updateInterval).toBeUndefined();
    }
  });

  it("uses English texts", () => {
    const [row] = render(
      [
        conversation({
          unreadCount: 1,
          isOwner: true,
          lastMessage: { preview: "Yes", fromMe: true },
        }),
      ],
      "en",
    );
    expect(row.textContent).toContain("Found");
    expect(row.textContent).toContain("Your report");
    expect(row.textContent).toContain("You: Yes");
    expect(row.querySelector("time")?.textContent).toBe("5 minutes ago");
    expect(row.querySelector(".sr-only")?.textContent).toBe("1 unread message");
  });
});
