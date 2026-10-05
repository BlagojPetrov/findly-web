// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteNotification,
  setNotificationRead,
} from "@/actions/notifications";
import { MESSAGES_READ_EVENT } from "@/lib/chat";
import {
  fetchNotifications,
  fetchUnreadCount,
  NOTIFICATIONS_CHANGED_EVENT,
  NOTIFICATIONS_RECEIVED_EVENT,
  type NotificationView,
} from "@/lib/notifications";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { NotificationBell } from "./notification-bell";
import { RELOAD_DELAY_MS } from "./use-notifications";

// A fake Supabase browser client: channels record their handlers and status
// callback so tests can emit Realtime events; the session user can change.
type Handler = {
  filter: { event: string; filter: string };
  callback: (payload: { new: object }) => void;
};
type FakeChannel = {
  topic: string;
  handlers: Handler[];
  status?: (status: string) => void;
  emit: (event: string, row: object) => void;
};

const { client, state, refresh, toast } = vi.hoisted(() => {
  const state = {
    sessionUser: "00000000-0000-4000-8000-00000000000a" as string | null,
    channels: [] as FakeChannel[],
    authCallback: undefined as
      ((event: string, session: object | null) => void) | undefined,
    unsubscribe: undefined as unknown as ReturnType<typeof vi.fn>,
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
          return { data: { subscription: { unsubscribe: state.unsubscribe } } };
        },
      ),
    },
  };
  return {
    client,
    state,
    refresh: vi.fn(),
    toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }));
vi.mock("@/actions/notifications", () => ({
  setNotificationRead: vi.fn(),
  deleteNotification: vi.fn(),
}));
vi.mock("@/lib/notifications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/notifications")>()),
  fetchUnreadCount: vi.fn(),
  fetchNotifications: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));
vi.mock("sonner", () => ({ toast }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const userA = "00000000-0000-4000-8000-00000000000a";
const userB = "00000000-0000-4000-8000-00000000000b";
const conversation = "70000000-0000-4000-8000-000000000001";
const otherConversation = "70000000-0000-4000-8000-000000000002";

function messageView(
  id: string,
  overrides: Partial<NotificationView> = {},
): NotificationView {
  return view(id, {
    type: "message",
    otherItem: null,
    matchStatus: null,
    conversationId: conversation,
    sender: { id: userB, displayName: "Ана" },
    ...overrides,
  });
}

function view(
  id: string,
  overrides: Partial<NotificationView> = {},
): NotificationView {
  return {
    id: `56000000-0000-4000-8000-0000000000${id}`,
    type: "match",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    item: {
      id: "10000000-0000-4000-8000-000000000001",
      type: "lost",
      status: "active",
      title: "Изгубени клучеви",
    },
    otherItem: {
      id: "20000000-0000-4000-8000-000000000001",
      type: "found",
      status: "active",
      title: `Најдени клучеви ${id}`,
    },
    matchStatus: "suggested",
    conversationId: null,
    sender: null,
    moderationAction: null,
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  state.sessionUser = userA;
  state.channels = [];
  state.unsubscribe = vi.fn();
  vi.mocked(fetchUnreadCount).mockReset().mockResolvedValue(0);
  vi.mocked(fetchNotifications).mockReset().mockResolvedValue([]);
  vi.mocked(setNotificationRead)
    .mockReset()
    .mockResolvedValue({ ok: true, data: undefined });
  vi.mocked(deleteNotification)
    .mockReset()
    .mockResolvedValue({ ok: true, data: undefined });
  client.channel.mockClear();
  client.removeChannel.mockClear();
  refresh.mockReset();
  toast.mockReset();
  toast.error.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

function element(
  userId = userA,
  initialUnread: number | null = 0,
  locale: "mk" | "en" = "mk",
) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "mk" ? mk : en}
      timeZone="Europe/Skopje"
    >
      <NotificationBell
        key={userId}
        userId={userId}
        initialUnread={initialUnread}
      />
    </NextIntlClientProvider>
  );
}

function render(...args: Parameters<typeof element>) {
  act(() => root.render(element(...args)));
}

// Lets pending promises and the reload timer run.
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(RELOAD_DELAY_MS + 10);
  });
}

const channel = () => state.channels.at(-1)!;
const trigger = () =>
  container.querySelector<HTMLButtonElement>("button[aria-label]")!;
const badge = () =>
  container.querySelector('[data-testid="notification-badge"]')?.textContent ??
  null;
const panelText = () =>
  document.querySelector('[data-slot="popover-content"]')?.textContent ?? "";

async function subscribe() {
  act(() => channel().status!("SUBSCRIBED"));
  await flush();
}

async function openPanel() {
  act(() => trigger().click());
  await flush();
}

function panelButton(label: string, index = 0) {
  const found = [
    ...document.querySelectorAll<HTMLButtonElement>(
      '[data-slot="popover-content"] button',
    ),
  ].filter((b) => b.getAttribute("aria-label") === label);
  if (!found[index]) throw new Error(`No button "${label}"`);
  return found[index];
}

describe("NotificationBell", () => {
  it("shows the unread count from the server, hiding zero and capping large counts", () => {
    render(userA, 0);
    expect(badge()).toBeNull();
    expect(trigger().getAttribute("aria-label")).toBe("Известувања");

    render(userA, 5);
    // Same user: the state is kept, so remount with another count.
    act(() => root.unmount());
    root = createRoot(container);
    render(userA, 5);
    expect(badge()).toBe("5");
    expect(trigger().getAttribute("aria-label")).toBe(
      "Известувања, 5 непрочитани",
    );

    act(() => root.unmount());
    root = createRoot(container);
    render(userA, 150, "en");
    expect(badge()).toBe("99+");
    expect(trigger().getAttribute("aria-label")).toBe(
      "Notifications, 150 unread",
    );
  });

  it("subscribes once to the user's own inserts and updates and refreshes the count", async () => {
    vi.mocked(fetchUnreadCount).mockResolvedValue(3);
    render(userA, 0);
    render(userA, 0);
    expect(client.channel).toHaveBeenCalledTimes(1);
    expect(channel().handlers.map((h) => h.filter)).toEqual([
      expect.objectContaining({
        event: "INSERT",
        table: "notifications",
        filter: `user_id=eq.${userA}`,
      }),
      expect.objectContaining({
        event: "UPDATE",
        filter: `user_id=eq.${userA}`,
      }),
    ]);
    await subscribe();
    expect(fetchUnreadCount).toHaveBeenCalledWith(client, userA);
    expect(badge()).toBe("3");
  });

  it("updates the badge and shows a toast for new notifications without a reload", async () => {
    render(userA, 0);
    await subscribe();
    vi.mocked(fetchUnreadCount).mockResolvedValue(2);
    act(() => {
      channel().emit("INSERT", { user_id: userA, type: "match" });
      channel().emit("INSERT", { user_id: userA, type: "match" });
    });
    await flush();
    expect(badge()).toBe("2");
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toBe("Имате 2 нови известувања");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("ignores events of other users", async () => {
    render(userA, 0);
    await subscribe();
    vi.mocked(fetchUnreadCount).mockClear();
    act(() => channel().emit("INSERT", { user_id: userB, type: "match" }));
    await flush();
    expect(fetchUnreadCount).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("lists notifications in Macedonian, newest first, with missing records described", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([
      view("01"),
      view("02", { read: true, matchStatus: "confirmed" }),
      view("03", { matchStatus: null }),
      view("04", { otherItem: null, matchStatus: null }),
      view("05", { item: null }),
    ]);
    vi.mocked(fetchUnreadCount).mockResolvedValue(4);
    // Chromium has no Macedonian relative-time data (F-30): times must not
    // depend on it.
    const relativeTime = vi
      .spyOn(Intl, "RelativeTimeFormat")
      .mockImplementation(() => {
        throw new Error("no Macedonian data");
      });
    render(userA, 4);
    await subscribe();
    await openPanel();

    expect(fetchNotifications).toHaveBeenCalledWith(client, userA);
    const items = [
      ...document.querySelectorAll('[data-slot="popover-content"] li'),
    ];
    expect(items).toHaveLength(5);
    const text = items.map((item) => item.textContent);
    expect(text[0]).toContain("Можно совпаѓање за ваша пријава");
    expect(text[0]).toContain("Ваша пријава: „Изгубени клучеви“");
    expect(text[0]).toContain("Пронајдено");
    expect(text[0]).toContain("Најдени клучеви 01");
    expect(text[0]).toContain("Непрочитано");
    expect(text[0]).toContain("пред 5 минути");
    expect(text[1]).toContain("Го потврдивте ова совпаѓање.");
    expect(text[1]).not.toContain("Непрочитано");
    expect(text[2]).toContain("Ова совпаѓање повеќе не се предлага.");
    expect(text[3]).toContain("Другата пријава повеќе не е достапна.");
    expect(text[4]).toContain("Вашата пријава повеќе не е достапна.");

    const links = items.map((item) =>
      item.querySelector("a")?.getAttribute("href"),
    );
    expect(links.slice(0, 4)).toEqual(
      Array(4).fill("/items/10000000-0000-4000-8000-000000000001#matches-item"),
    );
    // The own report is gone: nothing to link to.
    expect(links[4]).toBeUndefined();
    expect(panelText()).toContain("4 непрочитани");
    expect(relativeTime).not.toHaveBeenCalled();
    relativeTime.mockRestore();
  });

  it("lists notifications in English", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([
      view("01", { matchStatus: "dismissed" }),
      view("02", { type: "moderation", otherItem: null, matchStatus: null }),
    ]);
    render(userA, 1, "en");
    await subscribe();
    await openPanel();
    expect(panelText()).toContain("Notifications");
    expect(panelText()).toContain("Possible match for your report");
    expect(panelText()).toContain("Your report: “Изгубени клучеви”");
    expect(panelText()).toContain("Found");
    expect(panelText()).toContain("This match was dismissed.");
    expect(panelText()).toContain("Update about your report");
    expect(panelText()).toContain("Report: “Изгубени клучеви”");
    expect(panelText()).toContain("5 minutes ago");
  });

  it("says what a moderator did with the report", async () => {
    const moderation = {
      type: "moderation",
      otherItem: null,
      matchStatus: null,
    } as const;
    vi.mocked(fetchNotifications).mockResolvedValue([
      view("01", { ...moderation, moderationAction: "item_hidden" }),
      view("02", { ...moderation, moderationAction: "item_restored" }),
    ]);
    render(userA, 2);
    await subscribe();
    await openPanel();
    expect(panelText()).toContain(mk.Notifications.moderation.item_hidden);
    expect(panelText()).toContain(mk.Notifications.moderation.item_restored);
    const links = [
      ...document.querySelectorAll('[data-slot="popover-content"] li a'),
    ];
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      Array(2).fill("/items/10000000-0000-4000-8000-000000000001"),
    );
  });

  it("lists message notifications linking to the conversation", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([
      messageView("01"),
      messageView("02", { item: null, sender: null, read: true }),
      messageView("03", { conversationId: null }),
    ]);
    render(userA, 1);
    await subscribe();
    await openPanel();
    const items = [
      ...document.querySelectorAll('[data-slot="popover-content"] li'),
    ];
    const text = items.map((item) => item.textContent);
    expect(text[0]).toContain("Нова порака");
    expect(text[0]).toContain("Од Ана");
    expect(text[0]).toContain("Пријава: „Изгубени клучеви“");
    expect(text[0]).toContain("Непрочитано");
    // A deleted report or an unknown sender is left out; the chat remains.
    expect(text[1]).toContain("Нова порака");
    expect(text[1]).not.toContain("Од ");
    expect(text[1]).not.toContain("Пријава");
    const links = items.map((item) =>
      item.querySelector("a")?.getAttribute("href"),
    );
    expect(links).toEqual([
      `/messages/${conversation}`,
      `/messages/${conversation}`,
      undefined,
    ]);
  });

  it("lists message notifications in English", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([messageView("01")]);
    render(userA, 1, "en");
    await subscribe();
    await openPanel();
    expect(panelText()).toContain("New message");
    expect(panelText()).toContain("From Ана");
    expect(panelText()).toContain("Report: “Изгубени клучеви”");
  });

  it("shows no toast for a message notification about the open chat", async () => {
    render(userA, 0);
    await subscribe();
    window.history.pushState({}, "", `/en/messages/${conversation}`);
    try {
      vi.mocked(fetchUnreadCount).mockClear();
      act(() =>
        channel().emit("INSERT", {
          user_id: userA,
          type: "message",
          data: { conversation_id: conversation },
        }),
      );
      await flush();
      // Reloaded (the chat marks it read), but no toast.
      expect(fetchUnreadCount).toHaveBeenCalledTimes(1);
      expect(toast).not.toHaveBeenCalled();

      // Another conversation is news.
      act(() =>
        channel().emit("INSERT", {
          user_id: userA,
          type: "message",
          data: { conversation_id: otherConversation },
        }),
      );
      await flush();
      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast.mock.calls[0][0]).toBe("Имате ново известување");

      // So is the open chat's in a hidden tab.
      const visibility = vi
        .spyOn(document, "visibilityState", "get")
        .mockReturnValue("hidden");
      act(() =>
        channel().emit("INSERT", {
          user_id: userA,
          type: "message",
          data: { conversation_id: conversation },
        }),
      );
      await flush();
      expect(toast).toHaveBeenCalledTimes(2);
      visibility.mockRestore();
    } finally {
      window.history.pushState({}, "", "/");
    }

    // And on another page.
    act(() =>
      channel().emit("INSERT", {
        user_id: userA,
        type: "message",
        data: { conversation_id: conversation },
      }),
    );
    await flush();
    expect(toast).toHaveBeenCalledTimes(3);
  });

  it("reloads when a chat was read", async () => {
    render(userA, 1);
    await subscribe();
    vi.mocked(fetchUnreadCount).mockClear().mockResolvedValue(0);
    act(() => {
      window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
    });
    await flush();
    expect(fetchUnreadCount).toHaveBeenCalledTimes(1);
    expect(badge()).toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });

  it("shows loading, empty and error states with retry", async () => {
    let resolve: (views: NotificationView[]) => void = () => {};
    vi.mocked(fetchNotifications).mockReturnValueOnce(
      new Promise((done) => (resolve = done)),
    );
    render(userA, 0);
    await openPanel();
    expect(panelText()).toContain("Се вчитуваат известувањата…");
    await act(async () => resolve([]));
    expect(panelText()).toContain("Сè уште нема известувања.");

    act(() => root.unmount());
    root = createRoot(container);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetchNotifications).mockRejectedValueOnce(new Error("down"));
    render(userA, 0);
    await openPanel();
    expect(panelText()).toContain("Известувањата не можеа да се вчитаат.");
    vi.mocked(fetchNotifications).mockResolvedValueOnce([view("01")]);
    act(() =>
      [...document.querySelectorAll("button")]
        .find((b) => b.textContent === "Обиди се повторно")!
        .click(),
    );
    await flush();
    expect(panelText()).toContain("Најдени клучеви 01");
  });

  it("shows reconnecting and reloads once the channel is back", async () => {
    render(userA, 0);
    await subscribe();
    await openPanel();
    act(() => channel().status!("CHANNEL_ERROR"));
    expect(panelText()).toContain("Ажурирањата во живо се прекинати.");
    vi.mocked(fetchNotifications).mockClear();
    vi.mocked(fetchNotifications).mockResolvedValue([view("01")]);
    await subscribe();
    expect(fetchNotifications).toHaveBeenCalledTimes(1);
    expect(panelText()).not.toContain("Ажурирањата во живо се прекинати.");
    expect(panelText()).toContain("Најдени клучеви 01");
  });

  it("marks read and unread optimistically through the action", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([view("01")]);
    vi.mocked(fetchUnreadCount).mockResolvedValue(1);
    render(userA, 1);
    await subscribe();
    await openPanel();
    expect(badge()).toBe("1");

    // The server answers after the click; the badge changes at once.
    let finish: () => void = () => {};
    vi.mocked(setNotificationRead).mockReturnValueOnce(
      new Promise(
        (done) => (finish = () => done({ ok: true, data: undefined })),
      ),
    );
    act(() => panelButton("Означи како прочитано").click());
    expect(badge()).toBeNull();
    const data = vi.mocked(setNotificationRead).mock.calls[0][0];
    expect(data.get("notificationId")).toBe(view("01").id);
    expect(data.get("read")).toBe("true");

    vi.mocked(fetchUnreadCount).mockResolvedValue(0);
    vi.mocked(fetchNotifications).mockResolvedValue([
      view("01", { read: true }),
    ]);
    await act(async () => finish());
    await flush();
    expect(badge()).toBeNull();

    act(() => panelButton("Означи како непрочитано").click());
    expect(badge()).toBe("1");
    expect(vi.mocked(setNotificationRead).mock.calls[1][0].get("read")).toBe(
      "false",
    );
  });

  it("undoes a failed change and shows the error", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([view("01")]);
    vi.mocked(fetchUnreadCount).mockResolvedValue(1);
    vi.mocked(setNotificationRead).mockResolvedValue({
      ok: false,
      error: "forbidden",
    });
    render(userA, 1);
    await subscribe();
    await openPanel();
    act(() => panelButton("Означи како прочитано").click());
    await flush();
    expect(toast.error).toHaveBeenCalledWith("Немате дозвола за оваа акција.");
    expect(badge()).toBe("1");
  });

  it("deletes a notification", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([view("01"), view("02")]);
    vi.mocked(fetchUnreadCount).mockResolvedValue(2);
    render(userA, 2);
    await subscribe();
    await openPanel();
    vi.mocked(fetchNotifications).mockResolvedValue([view("02")]);
    vi.mocked(fetchUnreadCount).mockResolvedValue(1);
    act(() => panelButton("Избриши известување").click());
    expect(badge()).toBe("1");
    expect(
      vi.mocked(deleteNotification).mock.calls[0][0].get("notificationId"),
    ).toBe(view("01").id);
    await flush();
    expect(
      document.querySelectorAll('[data-slot="popover-content"] li'),
    ).toHaveLength(1);
    expect(panelText()).not.toContain("Најдени клучеви 01");
  });

  it("marks a notification read when its link is followed", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([view("01")]);
    render(userA, 1);
    await subscribe();
    await openPanel();
    const link = document.querySelector<HTMLAnchorElement>(
      '[data-slot="popover-content"] a',
    )!;
    link.addEventListener("click", (event) => event.preventDefault());
    act(() => link.click());
    expect(vi.mocked(setNotificationRead).mock.calls[0][0].get("read")).toBe(
      "true",
    );
  });

  it("removes the subscription when the bell unmounts (sign out)", async () => {
    render(userA, 0);
    await subscribe();
    const first = channel();
    act(() => root.unmount());
    expect(client.removeChannel).toHaveBeenCalledWith(first);
    expect(state.unsubscribe).toHaveBeenCalled();
    root = createRoot(container);
  });

  it("starts fresh for another account", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([view("01")]);
    render(userA, 1);
    await subscribe();
    await openPanel();
    const first = channel();
    expect(panelText()).toContain("Најдени клучеви 01");

    state.sessionUser = userB;
    vi.mocked(fetchNotifications).mockResolvedValue([]);
    vi.mocked(fetchUnreadCount).mockResolvedValue(0);
    render(userB, 0);
    expect(client.removeChannel).toHaveBeenCalledWith(first);
    expect(channel()).not.toBe(first);
    expect(channel().handlers[0].filter.filter).toBe(`user_id=eq.${userB}`);
    // B's bell has its own (closed, unloaded) state.
    expect(panelText()).not.toContain("Најдени клучеви 01");
    expect(badge()).toBeNull();
  });

  it("hides everything when the browser session changes to another user", async () => {
    vi.mocked(fetchUnreadCount).mockResolvedValue(4);
    render(userA, 4);
    await subscribe();
    expect(badge()).toBe("4");

    state.sessionUser = userB;
    act(() => channel().emit("UPDATE", { user_id: userA }));
    await flush();
    expect(trigger()).toBeNull();
    expect(refresh).toHaveBeenCalled();
    expect(client.removeChannel).toHaveBeenCalled();
    // A's data was not loaded with B's session.
    expect(fetchUnreadCount).toHaveBeenCalledTimes(1);
  });

  it("hides everything when the browser signs out", async () => {
    render(userA, 2);
    await subscribe();
    act(() => state.authCallback!("SIGNED_OUT", null));
    expect(trigger()).toBeNull();
    expect(refresh).toHaveBeenCalled();
    expect(client.removeChannel).toHaveBeenCalled();
  });

  it("links to all notifications and closes the panel", async () => {
    render(userA, 0);
    await openPanel();
    const link = [
      ...document.querySelectorAll<HTMLAnchorElement>(
        '[data-slot="popover-content"] a',
      ),
    ].find((a) => a.textContent === "Сите известувања")!;
    expect(link.getAttribute("href")).toBe("/notifications");
    link.addEventListener("click", (event) => event.preventDefault());
    act(() => link.click());
    await flush();
    expect(document.querySelector('[data-slot="popover-content"]')).toBeNull();
  });

  it("announces new notifications to the notifications page", async () => {
    const received = vi.fn();
    window.addEventListener(NOTIFICATIONS_RECEIVED_EVENT, received);
    render(userA, 0);
    await subscribe();
    act(() => channel().emit("UPDATE", { user_id: userA }));
    await flush();
    expect(received).not.toHaveBeenCalled();
    act(() => channel().emit("INSERT", { user_id: userA, type: "match" }));
    await flush();
    expect(received).toHaveBeenCalledTimes(1);
    window.removeEventListener(NOTIFICATIONS_RECEIVED_EVENT, received);
  });

  it("reloads after changes made on the notifications page", async () => {
    render(userA, 2);
    await subscribe();
    vi.mocked(fetchUnreadCount).mockClear().mockResolvedValue(1);
    act(() => {
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    });
    await flush();
    expect(fetchUnreadCount).toHaveBeenCalledTimes(1);
    expect(badge()).toBe("1");
    // Not after unmounting.
    act(() => root.unmount());
    root = createRoot(container);
    vi.mocked(fetchUnreadCount).mockClear();
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    await flush();
    expect(fetchUnreadCount).not.toHaveBeenCalled();
  });
});
