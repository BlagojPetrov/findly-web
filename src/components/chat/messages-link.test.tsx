// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  currentMessagesVersion,
  fetchUnreadMessageCount,
  MESSAGES_CHANGED_EVENT,
  MESSAGES_READ_EVENT,
} from "@/lib/chat";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { MessagesLink } from "./messages-link";
import { UNREAD_RELOAD_DELAY_MS } from "./use-unread-messages";

// A fake Supabase browser client: channels record their handlers and status
// callback so tests can emit Realtime events; the session user can change.
type Handler = {
  filter: { event: string; table: string; filter?: string };
  callback: (payload: { new: object }) => void;
};
type FakeChannel = {
  topic: string;
  handlers: Handler[];
  status?: (status: string) => void;
  emit: (event: string, row: object) => void;
};

const { client, state } = vi.hoisted(() => {
  const state = {
    sessionUser: "00000000-0000-4000-8000-00000000000a" as string | null,
    channels: [] as FakeChannel[],
    authCallback: undefined as
      ((event: string, session: object | null) => void) | undefined,
  };
  const client = {
    channel: vi.fn((topic: string) => {
      const channel: FakeChannel & {
        on: (...args: unknown[]) => unknown;
        subscribe: (cb: (status: string) => void) => unknown;
      } = {
        topic,
        handlers: [],
        on(_type: unknown, filter: unknown, callback: unknown) {
          channel.handlers.push({
            filter: filter as Handler["filter"],
            callback: callback as Handler["callback"],
          });
          return channel;
        },
        subscribe(callback: (status: string) => void) {
          channel.status = callback;
          return channel;
        },
        emit(event: string, row: object) {
          for (const handler of channel.handlers) {
            if (handler.filter.event === event) handler.callback({ new: row });
          }
        },
      };
      state.channels.push(channel);
      return channel;
    }),
    removeChannel: vi.fn(async () => "ok"),
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: state.sessionUser
            ? { user: { id: state.sessionUser } }
            : null,
        },
      })),
      onAuthStateChange: vi.fn(
        (callback: (event: string, session: object | null) => void) => {
          state.authCallback = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      ),
    },
  };
  return { client, state };
});

vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }));
vi.mock("@/lib/chat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat")>()),
  fetchUnreadMessageCount: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const userA = "00000000-0000-4000-8000-00000000000a";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  state.sessionUser = userA;
  state.channels = [];
  client.channel.mockClear();
  client.removeChannel.mockClear();
  vi.mocked(fetchUnreadMessageCount).mockReset().mockResolvedValue(0);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

function render(initialUnread: number | null = 0, locale: "mk" | "en" = "mk") {
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "mk" ? mk : en}
      >
        <MessagesLink userId={userA} initialUnread={initialUnread} />
      </NextIntlClientProvider>,
    ),
  );
}

// A new mount (the initial count is only read when mounting).
function remount(...args: Parameters<typeof render>) {
  act(() => root.unmount());
  root = createRoot(container);
  render(...args);
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(UNREAD_RELOAD_DELAY_MS + 10);
  });
}

const channel = () => state.channels.at(-1)!;
const link = () => container.querySelector("a");
const badge = () =>
  container.querySelector('[data-testid="messages-badge"]')?.textContent ??
  null;

async function subscribe() {
  act(() => channel().status!("SUBSCRIBED"));
  await flush();
}

describe("MessagesLink", () => {
  it("links to /messages with the unread count from the server", () => {
    render(3);
    expect(link()?.getAttribute("href")).toBe("/messages");
    expect(badge()).toBe("3");
    expect(link()?.getAttribute("aria-label")).toBe("Пораки, 3 непрочитани");
  });

  it("hides zero and an unknown count, and caps large counts", () => {
    render(0);
    expect(badge()).toBeNull();
    expect(link()?.getAttribute("aria-label")).toBe("Пораки");
    remount(null);
    expect(badge()).toBeNull();
    remount(150);
    expect(badge()).toBe("99+");
  });

  it("words the label in both languages", () => {
    render(1);
    expect(link()?.getAttribute("aria-label")).toBe("Пораки, 1 непрочитана");
    remount(2, "en");
    expect(link()?.getAttribute("aria-label")).toBe("Messages, 2 unread");
  });

  it("subscribes to new messages and to others' messages being read", () => {
    render();
    expect(channel().topic).toMatch(`unread-messages:${userA}:`);
    expect(channel().handlers.map((h) => h.filter)).toEqual([
      { event: "INSERT", schema: "public", table: "messages" },
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `sender_id=neq.${userA}`,
      },
    ]);
  });

  it("catches up after subscribing", async () => {
    render(0);
    vi.mocked(fetchUnreadMessageCount).mockResolvedValue(2);
    await subscribe();
    expect(fetchUnreadMessageCount).toHaveBeenCalledWith(client, userA);
    expect(badge()).toBe("2");
  });

  it("reloads once for a burst of events and tells the page", async () => {
    render(0);
    await subscribe();
    vi.mocked(fetchUnreadMessageCount).mockClear().mockResolvedValue(4);
    const changed = vi.fn();
    window.addEventListener(MESSAGES_CHANGED_EVENT, changed);
    act(() => {
      channel().emit("INSERT", { id: "1" });
      channel().emit("INSERT", { id: "2" });
      channel().emit("UPDATE", { id: "3" });
    });
    await flush();
    expect(fetchUnreadMessageCount).toHaveBeenCalledTimes(1);
    expect(badge()).toBe("4");
    expect(changed).toHaveBeenCalledTimes(1);
    window.removeEventListener(MESSAGES_CHANGED_EVENT, changed);
  });

  // F-33: a list restored by the Back button before the batch ends must
  // already see the change.
  it("notes Realtime changes at once, before the batched reload", async () => {
    render(0);
    await subscribe();
    const version = currentMessagesVersion();
    act(() => {
      channel().emit("INSERT", { id: "1" });
      channel().emit("UPDATE", { id: "2" });
    });
    expect(currentMessagesVersion()).toBe(version + 2);
    await flush();
    expect(currentMessagesVersion()).toBe(version + 2);
  });

  it("reloads when the chat marked messages read, without telling the page", async () => {
    render(5);
    await subscribe();
    vi.mocked(fetchUnreadMessageCount).mockClear().mockResolvedValue(0);
    const changed = vi.fn();
    window.addEventListener(MESSAGES_CHANGED_EVENT, changed);
    act(() => {
      window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
    });
    await flush();
    expect(fetchUnreadMessageCount).toHaveBeenCalledTimes(1);
    expect(badge()).toBeNull();
    expect(changed).not.toHaveBeenCalled();
    window.removeEventListener(MESSAGES_CHANGED_EVENT, changed);
  });

  it("keeps the last count when reloading fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(2);
    vi.mocked(fetchUnreadMessageCount).mockRejectedValue(new Error("offline"));
    await subscribe();
    expect(badge()).toBe("2");
  });

  it("disappears when the browser's session belongs to someone else", async () => {
    render(3);
    state.sessionUser = "00000000-0000-4000-8000-00000000000b";
    await subscribe();
    expect(link()).toBeNull();
    expect(fetchUnreadMessageCount).not.toHaveBeenCalled();
  });

  it("disappears on sign-out in another tab", () => {
    render(3);
    act(() => state.authCallback!("SIGNED_OUT", null));
    expect(link()).toBeNull();
  });

  it("removes its channel when unmounted", () => {
    render();
    const current = channel();
    act(() => root.unmount());
    expect(client.removeChannel).toHaveBeenCalledWith(current);
    root = createRoot(container);
  });
});
