// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markConversationRead, sendMessage } from "@/actions/messages";
import {
  type ChatMessage,
  fetchMessagesAfter,
  fetchMessagesBefore,
  MESSAGES_READ_EVENT,
} from "@/lib/chat";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { ChatView, MARK_READ_DELAY_MS } from "./chat-view";

// A fake Supabase browser client: channels record their handlers and status
// callback so tests can emit Realtime events.
type Handler = {
  filter: { event: string; table: string; filter: string };
  callback: (payload: { new: object }) => void;
};
type FakeChannel = {
  topic: string;
  handlers: Handler[];
  status?: (status: string) => void;
  emit: (row: object) => void;
};

const { client, state } = vi.hoisted(() => {
  const state = { channels: [] as FakeChannel[] };
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
        emit(row: object) {
          for (const handler of channel.handlers)
            handler.callback({ new: row });
        },
      };
      state.channels.push(channel);
      return channel;
    }),
    removeChannel: vi.fn(async () => "ok"),
  };
  return { client, state };
});

vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }));
vi.mock("@/actions/messages", () => ({
  sendMessage: vi.fn(),
  markConversationRead: vi.fn(),
}));

// jsdom's document is not "visible" by default; the chat only marks
// messages read in a visible tab.
let visibility: DocumentVisibilityState = "visible";
Object.defineProperty(document, "visibilityState", {
  configurable: true,
  get: () => visibility,
});
vi.mock("@/lib/chat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat")>()),
  fetchMessagesBefore: vi.fn(),
  fetchMessagesAfter: vi.fn(),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const conversationId = "49000000-0000-4000-8000-000000000001";
const me = "00000000-0000-4000-8000-00000000000a";
const other = "00000000-0000-4000-8000-00000000000b";
// 12:00 in Macedonia.
const now = new Date("2026-10-02T10:00:00Z");

function message(
  n: number,
  createdAt: string,
  senderId = other,
  body = `Порака ${n}`,
): ChatMessage {
  return {
    id: `4a000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`,
    senderId,
    body,
    createdAt,
    readAt: null,
  };
}

function row(m: ChatMessage, conversation = conversationId) {
  return {
    id: m.id,
    conversation_id: conversation,
    sender_id: m.senderId,
    body: m.body,
    read_at: m.readAt,
    created_at: m.createdAt,
  };
}

const older = message(1, "2026-09-20T08:00:00Z");
const yesterday = message(2, "2026-10-01T18:30:00Z", me);
const today = message(3, "2026-10-02T09:15:00Z");

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  state.channels = [];
  client.channel.mockClear();
  client.removeChannel.mockClear();
  vi.mocked(fetchMessagesAfter).mockReset().mockResolvedValue([]);
  vi.mocked(fetchMessagesBefore)
    .mockReset()
    .mockResolvedValue({ messages: [], hasMore: false });
  vi.mocked(sendMessage).mockReset();
  vi.mocked(markConversationRead)
    .mockReset()
    .mockResolvedValue({ ok: true, data: 0 });
  visibility = "visible";
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render({
  messages = [older, yesterday, today],
  hasMore = false,
  canSend = true,
  locale = "mk",
}: {
  messages?: ChatMessage[];
  hasMore?: boolean;
  canSend?: boolean;
  locale?: "mk" | "en";
} = {}) {
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "mk" ? mk : en}
        timeZone="Europe/Skopje"
        now={now}
      >
        <ChatView
          conversationId={conversationId}
          viewerId={me}
          otherName="Ана"
          initialMessages={messages}
          initialHasMore={hasMore}
          canSend={canSend}
        />
      </NextIntlClientProvider>,
    ),
  );
}

const channel = () => state.channels.at(-1)!;
const scroller = () =>
  container.querySelector<HTMLDivElement>('[data-testid="chat-scroller"]')!;
const bubbles = () =>
  [...container.querySelectorAll("li[data-own]")].map((li) => ({
    own: li.getAttribute("data-own") === "true",
    body: li.querySelector("p")!.textContent,
  }));
const bodies = () => bubbles().map((bubble) => bubble.body);
const days = () =>
  [...container.querySelectorAll('[data-testid="chat-day"]')].map(
    (day) => day.textContent,
  );

function button(text: string) {
  const found = [...container.querySelectorAll("button")].find(
    (b) => b.textContent === text,
  );
  if (!found) throw new Error(`No button "${text}"`);
  return found;
}

async function subscribe(status = "SUBSCRIBED") {
  await act(async () => channel().status!(status));
}

async function emit(value: object) {
  await act(async () => channel().emit(value));
}

// Scroll metrics for jsdom (which lays nothing out).
function layout(
  element: HTMLElement,
  { height, client: clientHeight, top }: Record<string, number>,
) {
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: height,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    writable: true,
    value: top,
  });
}

describe("ChatView", () => {
  it("shows the messages oldest first with own ones on the right", () => {
    render();
    expect(bubbles()).toEqual([
      { own: false, body: "Порака 1" },
      { own: true, body: "Порака 2" },
      { own: false, body: "Порака 3" },
    ]);
    // Times in Macedonia, senders for screen readers.
    const times = [...container.querySelectorAll("li[data-own] time")];
    expect(times.map((time) => time.textContent)).toEqual([
      "10:00",
      "20:30",
      "11:15",
    ]);
    expect(times[2].getAttribute("dateTime")).toBe(today.createdAt);
    const senders = [...container.querySelectorAll("li[data-own] .sr-only")];
    expect(senders.map((s) => s.textContent)).toEqual([
      "Ана: ",
      "Вие: ",
      "Ана: ",
    ]);
  });

  it("separates the days", () => {
    render();
    expect(days()).toEqual(["20.9.2026", "Вчера", "Денес"]);
    render({ locale: "en" });
    expect(days()).toEqual(["9/20/2026", "Yesterday", "Today"]);
  });

  it("keeps line breaks and wraps long words", () => {
    const long = message(4, today.createdAt, other, `Ред\n${"a".repeat(500)}`);
    render({ messages: [long] });
    const text = container.querySelector("li[data-own] p")!;
    expect(text.textContent).toBe(long.body);
    expect(text.className).toContain("whitespace-pre-wrap");
    expect(text.className).toContain("[overflow-wrap:anywhere]");
  });

  it("shows the beginning of the conversation when nothing older exists", () => {
    render();
    expect(container.textContent).toContain("Почеток на разговорот");
    expect(container.textContent).not.toContain("Вчитај постари пораки");
  });

  it("shows an empty state and loads the newest page after subscribing", async () => {
    render({ messages: [] });
    expect(container.textContent).toContain(mk.Messages.chat.empty);
    vi.mocked(fetchMessagesBefore).mockResolvedValue({
      messages: [today],
      hasMore: false,
    });
    await subscribe();
    expect(fetchMessagesBefore).toHaveBeenCalledWith(client, conversationId);
    expect(bodies()).toEqual(["Порака 3"]);
    expect(container.textContent).not.toContain(mk.Messages.chat.empty);
  });

  it("subscribes to new messages of this conversation and catches up", async () => {
    const missed = message(5, "2026-10-02T09:20:00Z");
    vi.mocked(fetchMessagesAfter).mockResolvedValue([missed]);
    render();
    expect(channel().topic).toMatch(`messages:${conversationId}:`);
    expect(channel().handlers.map((h) => h.filter)).toEqual([
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
    ]);
    await subscribe();
    expect(fetchMessagesAfter).toHaveBeenCalledWith(
      client,
      conversationId,
      today.createdAt,
    );
    expect(bodies()).toEqual(["Порака 1", "Порака 2", "Порака 3", "Порака 5"]);
  });

  it("appends Realtime messages once and ignores other conversations", async () => {
    render();
    await subscribe();
    const live = message(6, "2026-10-02T09:30:00Z");
    await emit(row(live));
    await emit(row(live));
    await emit(row(message(7, "2026-10-02T09:31:00Z"), "other"));
    expect(bodies()).toEqual(["Порака 1", "Порака 2", "Порака 3", "Порака 6"]);
  });

  it("shows a sent message right away and merges its Realtime event", async () => {
    const sent = message(8, "2026-10-02T09:40:00Z", me, "Еве ме");
    vi.mocked(sendMessage).mockResolvedValue({ ok: true, data: sent });
    render();
    await subscribe();
    const field = container.querySelector("textarea")!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!;
    act(() => {
      setter.call(field, "Еве ме");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[type="submit"]')!.click(),
    );
    expect(bubbles().at(-1)).toEqual({ own: true, body: "Еве ме" });
    await emit(row(sent));
    expect(bodies().filter((body) => body === "Еве ме")).toHaveLength(1);
  });

  it("loads older messages and keeps the view in place", async () => {
    render({ messages: [yesterday, today], hasMore: true });
    expect(container.textContent).not.toContain("Почеток на разговорот");
    layout(scroller(), { height: 0, client: 400, top: 40 });
    // Every rendered message is 300 px tall.
    Object.defineProperty(scroller(), "scrollHeight", {
      configurable: true,
      get: () => container.querySelectorAll("li[data-own]").length * 300,
    });
    vi.mocked(fetchMessagesBefore).mockResolvedValue({
      messages: [older],
      hasMore: false,
    });
    await act(async () => button("Вчитај постари пораки").click());
    expect(fetchMessagesBefore).toHaveBeenCalledWith(
      client,
      conversationId,
      yesterday.createdAt,
    );
    expect(bodies()).toEqual(["Порака 1", "Порака 2", "Порака 3"]);
    // The same messages stay in view: 40 px + the 300 px added above.
    expect(scroller().scrollTop).toBe(340);
    expect(container.textContent).toContain("Почеток на разговорот");
  });

  it("offers a retry when older messages fail to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render({ messages: [today], hasMore: true });
    vi.mocked(fetchMessagesBefore).mockRejectedValueOnce(new Error("offline"));
    await act(async () => button("Вчитај постари пораки").click());
    expect(container.textContent).toContain(mk.Messages.chat.olderError);
    vi.mocked(fetchMessagesBefore).mockResolvedValue({
      messages: [older],
      hasMore: true,
    });
    await act(async () => button("Обиди се повторно").click());
    expect(bodies()).toEqual(["Порака 1", "Порака 3"]);
    expect(container.textContent).toContain("Вчитај постари пораки");
  });

  it("follows new messages at the bottom and counts them when scrolled up", async () => {
    render();
    await subscribe();
    const element = scroller();
    element.scrollTo = vi.fn();
    // Scrolled up: 1000 px of content, 400 visible, at the top.
    layout(element, { height: 1000, client: 400, top: 0 });
    act(() => element.dispatchEvent(new Event("scroll")));
    await emit(row(message(10, "2026-10-02T09:50:00Z")));
    await emit(row(message(11, "2026-10-02T09:51:00Z")));
    expect(element.scrollTop).toBe(0);
    const jump = button("2 нови пораки");
    act(() => jump.click());
    expect(element.scrollTo).toHaveBeenCalledWith({
      top: 1000,
      behavior: "smooth",
    });
    // Reaching the bottom marks them seen.
    layout(element, { height: 1000, client: 400, top: 600 });
    act(() => element.dispatchEvent(new Event("scroll")));
    expect(container.textContent).not.toContain("нови пораки");
    // At the bottom, a new message scrolls into view.
    layout(element, { height: 1100, client: 400, top: 600 });
    await emit(row(message(12, "2026-10-02T09:52:00Z")));
    expect(element.scrollTop).toBe(1100);
  });

  it("scrolls to the viewer's own new message even when scrolled up", async () => {
    render();
    await subscribe();
    const element = scroller();
    layout(element, { height: 1000, client: 400, top: 0 });
    act(() => element.dispatchEvent(new Event("scroll")));
    await emit(row(message(13, "2026-10-02T09:53:00Z", me)));
    expect(element.scrollTop).toBe(1000);
    expect(container.textContent).not.toContain("нова порака");
  });

  it("tells when the connection is lost until it is back", async () => {
    render();
    await subscribe("CHANNEL_ERROR");
    expect(container.textContent).toContain(mk.Messages.chat.reconnecting);
    await subscribe();
    expect(container.textContent).not.toContain(mk.Messages.chat.reconnecting);
    expect(fetchMessagesAfter).toHaveBeenCalledTimes(1);
  });

  it("only lets the user read when sending is not allowed", () => {
    render({ canSend: false });
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.textContent).toContain(mk.Messages.chat.readOnly);
  });

  it("removes its channel when unmounted", async () => {
    render();
    const current = channel();
    act(() => root.unmount());
    expect(client.removeChannel).toHaveBeenCalledWith(current);
    // Events after unmount are ignored.
    await act(async () => current.emit(row(message(14, today.createdAt))));
    root = createRoot(container);
  });

  describe("read state", () => {
    const read = (m: ChatMessage): ChatMessage => ({
      ...m,
      readAt: "2026-10-02T09:59:00Z",
    });
    // Lets the mark-read delay pass and the request finish.
    const settle = () =>
      act(
        () =>
          new Promise((resolve) =>
            setTimeout(resolve, MARK_READ_DELAY_MS + 30),
          ),
      );
    const marked = () =>
      vi
        .mocked(markConversationRead)
        .mock.calls.map(([data]) => Object.fromEntries(data.entries()));

    it("marks the other participant's messages read when opened", async () => {
      const events = vi.fn();
      window.addEventListener(MESSAGES_READ_EVENT, events);
      render({ messages: [read(older), yesterday, today] });
      await settle();
      expect(marked()).toEqual([{ conversationId }]);
      expect(events).toHaveBeenCalledTimes(1);
      window.removeEventListener(MESSAGES_READ_EVENT, events);
    });

    it("does not mark anything when nothing from the other side is unread", async () => {
      // yesterday is the viewer's own (unread by the other side).
      render({ messages: [read(older), yesterday, read(today)] });
      await settle();
      expect(markConversationRead).not.toHaveBeenCalled();
    });

    it("marks new messages from the other side once, not own ones", async () => {
      render({ messages: [read(older), read(today)] });
      await subscribe();
      await emit(row(message(20, "2026-10-02T09:40:00Z", me)));
      await settle();
      expect(markConversationRead).not.toHaveBeenCalled();
      await emit(row(message(21, "2026-10-02T09:41:00Z")));
      await emit(row(message(22, "2026-10-02T09:42:00Z")));
      await settle();
      // Two messages together, one request.
      expect(marked()).toHaveLength(1);
      await settle();
      expect(marked()).toHaveLength(1);
    });

    it("waits for the tab to become visible", async () => {
      visibility = "hidden";
      render();
      await settle();
      expect(markConversationRead).not.toHaveBeenCalled();
      visibility = "visible";
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await settle();
      expect(marked()).toEqual([{ conversationId }]);
    });

    it("marks messages that arrive during the request with another one", async () => {
      let finish!: (value: { ok: true; data: number }) => void;
      vi.mocked(markConversationRead).mockReturnValueOnce(
        new Promise((resolve) => (finish = resolve)),
      );
      render({ messages: [read(older), today] });
      await subscribe();
      await settle();
      expect(marked()).toHaveLength(1);
      await emit(row(message(23, "2026-10-02T09:43:00Z")));
      await settle();
      // Still the first request.
      expect(marked()).toHaveLength(1);
      await act(async () => finish({ ok: true, data: 1 }));
      await settle();
      expect(marked()).toHaveLength(2);
    });

    it("leaves the messages unread when marking fails", async () => {
      const events = vi.fn();
      window.addEventListener(MESSAGES_READ_EVENT, events);
      vi.mocked(markConversationRead).mockResolvedValue({
        ok: false,
        error: "database",
      });
      render();
      await settle();
      await settle();
      // No retry loop and no event.
      expect(marked()).toHaveLength(1);
      expect(events).not.toHaveBeenCalled();
      window.removeEventListener(MESSAGES_READ_EVENT, events);
    });

    it("does not mark after unmounting", async () => {
      render();
      act(() => root.unmount());
      await settle();
      expect(markConversationRead).not.toHaveBeenCalled();
      root = createRoot(container);
    });
  });
});
