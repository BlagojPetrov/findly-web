// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act, type ReactNode } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import {
  CONVERSATION_TIME_INTERVAL_MS,
  ConversationTime,
} from "./conversation-time";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// The server rendered the list at 12:00; the message is from 11:59:30.
const serverNow = "2026-10-01T12:00:00.000Z";
const activity = "2026-10-01T11:59:30Z";

function withIntl(children: ReactNode, locale: "mk" | "en" = "mk") {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "mk" ? mk : en}
      timeZone="Europe/Skopje"
    >
      {children}
    </NextIntlClientProvider>
  );
}

let container: HTMLDivElement;
let root: Root | null;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.append(container);
  root = null;
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const text = () => container.querySelector("time")?.textContent;

function mount(element: ReactNode) {
  root = createRoot(container);
  act(() => root!.render(element));
}

describe("ConversationTime", () => {
  it("renders on the server with the server's time and hydrates without a mismatch", () => {
    const element = withIntl(
      <ConversationTime dateTime={activity} serverNow={serverNow} />,
    );
    const html = renderToString(element);
    expect(html).toContain(">сега<");
    expect(html).toContain(`dateTime="${activity}"`);

    // The browser opens the page ten minutes later.
    vi.setSystemTime(new Date("2026-10-01T12:10:00Z"));
    container.innerHTML = html;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoverable = vi.fn();
    act(() => {
      root = hydrateRoot(container, element, {
        onRecoverableError: recoverable,
      });
    });
    expect(recoverable).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    // After hydration it follows the browser's clock.
    expect(text()).toBe("пред 10 минути");
  });

  it("is worded again every minute while mounted", () => {
    vi.setSystemTime(new Date(serverNow));
    mount(
      withIntl(<ConversationTime dateTime={activity} serverNow={serverNow} />),
    );
    expect(text()).toBe("сега");
    act(() => vi.advanceTimersByTime(CONVERSATION_TIME_INTERVAL_MS));
    expect(text()).toBe("пред 1 минута");
    act(() => vi.advanceTimersByTime(2 * CONVERSATION_TIME_INTERVAL_MS));
    expect(text()).toBe("пред 3 минути");
  });

  it("shares one clock between all rows and stops it when unmounted", () => {
    vi.setSystemTime(new Date(serverNow));
    const before = vi.getTimerCount();
    mount(
      withIntl(
        <>
          <ConversationTime dateTime={activity} serverNow={serverNow} />
          <ConversationTime
            dateTime="2026-10-01T09:00:00Z"
            serverNow={serverNow}
          />
          <ConversationTime
            dateTime="2026-09-29T12:00:00Z"
            serverNow={serverNow}
          />
        </>,
      ),
    );
    expect(vi.getTimerCount()).toBe(before + 1);
    expect(
      [...container.querySelectorAll("time")].map((t) => t.textContent),
    ).toEqual(["сега", "пред 3 часа", "пред 2 дена"]);
    act(() => root!.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(before);
  });

  it("starts from now when mounted again later (e.g. restored by Back)", () => {
    vi.setSystemTime(new Date(serverNow));
    mount(
      withIntl(<ConversationTime dateTime={activity} serverNow={serverNow} />),
    );
    act(() => root!.unmount());
    vi.setSystemTime(new Date("2026-10-01T14:00:00Z"));
    mount(
      withIntl(<ConversationTime dateTime={activity} serverNow={serverNow} />),
    );
    expect(text()).toBe("пред 2 часа");
  });

  it("words dates and plurals without Intl (F-30)", () => {
    // Chromium has no Macedonian relative-time data.
    const relativeTime = vi
      .spyOn(Intl, "RelativeTimeFormat")
      .mockImplementation(() => {
        throw new Error("no Macedonian data");
      });
    vi.setSystemTime(new Date(serverNow));
    mount(
      withIntl(
        <>
          <ConversationTime
            dateTime="2026-10-01T11:39:00Z"
            serverNow={serverNow}
          />
          <ConversationTime
            dateTime="2026-09-01T12:00:00Z"
            serverNow={serverNow}
          />
        </>,
      ),
    );
    expect(
      [...container.querySelectorAll("time")].map((t) => t.textContent),
    ).toEqual(["пред 21 минута", "1.9.2026"]);
    expect(relativeTime).not.toHaveBeenCalled();
  });

  it("uses English texts", () => {
    vi.setSystemTime(new Date("2026-10-01T12:05:00Z"));
    mount(
      withIntl(
        <>
          <ConversationTime dateTime={activity} serverNow={serverNow} />
          <ConversationTime
            dateTime="2026-09-01T12:00:00Z"
            serverNow={serverNow}
          />
        </>,
        "en",
      ),
    );
    expect(
      [...container.querySelectorAll("time")].map((t) => t.textContent),
    ).toEqual(["5 minutes ago", "9/1/2026"]);
  });
});
