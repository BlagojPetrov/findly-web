"use client";

import { ArrowDown, LoaderCircle } from "lucide-react";
import { useNow, useTranslations } from "next-intl";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { markConversationRead } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import {
  type ChatMessage,
  fetchMessagesAfter,
  fetchMessagesBefore,
  MESSAGES_READ_EVENT,
  mergeMessages,
  realtimeMessage,
  unreadFrom,
} from "@/lib/chat";
import { previousDay, todayInAppTimeZone } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";

// Within this distance of the end the chat counts as "at the bottom" and
// follows new messages.
const BOTTOM_THRESHOLD_PX = 80;
// New messages that arrive together are marked read with one request.
export const MARK_READ_DELAY_MS = 300;

type LiveState = "connecting" | "live" | "reconnecting";

// The messages of one conversation (§16): the newest page from the server,
// new ones over Realtime (INSERT on messages of this conversation; RLS
// decides who receives them), older pages when the top is scrolled into
// view (or with the button), and the composer. Missed messages are fetched
// after every (re)subscription and when the tab becomes visible again.
// While the tab is visible, the other participant's messages are marked
// read (on opening and as they arrive); the header badge is told at once.
export function ChatView({
  conversationId,
  viewerId,
  otherName,
  initialMessages,
  initialHasMore,
  canSend,
}: {
  conversationId: string;
  viewerId: string;
  otherName: string;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  // Banned users can read but not send.
  canSend: boolean;
}) {
  const t = useTranslations("Messages.chat");
  const now = useNow();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [older, setOlder] = useState<"idle" | "loading" | "error">("idle");
  const [live, setLive] = useState<LiveState>("connecting");
  const [atBottom, setAtBottom] = useState(true);
  // The last message the viewer has seen at the bottom of the chat.
  const [seenId, setSeenId] = useState(initialMessages.at(-1)?.id ?? null);

  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLLIElement>(null);
  const atBottomRef = useRef(true);
  const messagesRef = useRef(messages);
  const lastIdRef = useRef<string | null | undefined>(undefined);
  // Scroll position before older messages were added above.
  const prepended = useRef<{ height: number; top: number } | null>(null);
  const loadingOlder = useRef(false);
  const mounted = useRef(true);
  const marking = useRef(false);
  const markTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    messagesRef.current = messages;
  });

  // Marks the loaded unread messages read; ones that arrive during the
  // request get a request of their own. A failure is left alone (the
  // messages stay unread and the next new message or visit tries again).
  const markReadRef = useRef<() => Promise<void>>(async () => {});
  const scheduleMarkRead = useCallback(() => {
    clearTimeout(markTimer.current);
    markTimer.current = setTimeout(
      () => void markReadRef.current(),
      MARK_READ_DELAY_MS,
    );
  }, []);

  const markRead = useCallback(async () => {
    if (marking.current || document.visibilityState !== "visible") return;
    const unread = unreadFrom(messagesRef.current, viewerId);
    if (unread.length === 0) return;
    marking.current = true;
    const ids = new Set(unread.map((message) => message.id));
    const data = new FormData();
    data.set("conversationId", conversationId);
    let marked = false;
    try {
      const result = await markConversationRead(data);
      marked = result.ok;
    } catch (error) {
      console.error(error);
    } finally {
      marking.current = false;
    }
    if (!mounted.current || !marked) return;
    const readAt = new Date().toISOString();
    setMessages((current) =>
      current.map((message) =>
        ids.has(message.id) && message.readAt === null
          ? { ...message, readAt }
          : message,
      ),
    );
    window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
    if (
      unreadFrom(messagesRef.current, viewerId).some(
        (message) => !ids.has(message.id),
      )
    ) {
      scheduleMarkRead();
    }
  }, [conversationId, viewerId, scheduleMarkRead]);

  useEffect(() => {
    markReadRef.current = markRead;
  }, [markRead]);

  useEffect(() => {
    if (unreadFrom(messages, viewerId).length > 0) scheduleMarkRead();
  }, [messages, viewerId, scheduleMarkRead]);

  useEffect(() => {
    mounted.current = true;
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleMarkRead();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      clearTimeout(markTimer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [scheduleMarkRead]);

  const add = useCallback((list: ChatMessage[]) => {
    if (list.length > 0) {
      setMessages((current) => mergeMessages(current, list));
    }
  }, []);

  const loadOlder = useCallback(async () => {
    if (loadingOlder.current) return;
    loadingOlder.current = true;
    setOlder("loading");
    try {
      const oldest = messagesRef.current[0]?.createdAt;
      const page = await fetchMessagesBefore(supabase, conversationId, oldest);
      const element = scroller.current;
      if (element) {
        prepended.current = {
          height: element.scrollHeight,
          top: element.scrollTop,
        };
      }
      setMessages((current) => mergeMessages(page.messages, current));
      setHasMore(page.hasMore);
      setOlder("idle");
    } catch (error) {
      console.error(error);
      setOlder("error");
    } finally {
      loadingOlder.current = false;
    }
  }, [supabase, conversationId]);

  // Keep the view in place when older messages are added above, and follow
  // new ones at the bottom when the viewer is there or sent them.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (prepended.current) {
      const { height, top } = prepended.current;
      prepended.current = null;
      element.scrollTop = top + element.scrollHeight - height;
    }
    const last = messages.at(-1);
    const lastId = last?.id ?? null;
    if (lastId === lastIdRef.current) return;
    const first = lastIdRef.current === undefined;
    lastIdRef.current = lastId;
    if (first || atBottomRef.current || last?.senderId === viewerId) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, viewerId]);

  function onScroll() {
    const element = scroller.current;
    if (!element) return;
    const bottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <=
      BOTTOM_THRESHOLD_PX;
    atBottomRef.current = bottom;
    setAtBottom(bottom);
    if (bottom) setSeenId(messagesRef.current.at(-1)?.id ?? null);
  }

  function scrollToBottom() {
    const element = scroller.current;
    element?.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }

  // Older messages when the top of the chat comes into view. Observed again
  // after every change, so a top that stays visible loads the next page.
  useEffect(() => {
    const target = sentinel.current;
    if (
      !hasMore ||
      older !== "idle" ||
      !target ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadOlder();
      },
      { root: scroller.current, rootMargin: "200px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, older, messages.length, loadOlder]);

  useEffect(() => {
    let active = true;

    // Messages that arrived while not subscribed (before the first
    // subscription, during a reconnect, in a background tab).
    async function catchUp() {
      try {
        const newest = messagesRef.current.at(-1)?.createdAt;
        if (newest) {
          const missed = await fetchMessagesAfter(
            supabase,
            conversationId,
            newest,
          );
          if (active) add(missed);
        } else {
          const page = await fetchMessagesBefore(supabase, conversationId);
          if (!active) return;
          add(page.messages);
          setHasMore(page.hasMore);
        }
      } catch (error) {
        if (active) console.error(error);
      }
    }

    // A topic of its own: supabase.channel() returns an existing channel
    // with the same topic, which a quick remount would then remove.
    const channel = supabase
      .channel(`messages:${conversationId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = realtimeMessage(payload.new, conversationId);
          if (active && message) add([message]);
        },
      )
      .subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          setLive("live");
          void catchUp();
        } else {
          setLive("reconnecting");
        }
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") void catchUp();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, add]);

  const today = todayInAppTimeZone(now);
  const yesterday = previousDay(today);
  function dayLabel(day: string) {
    if (day === today) return t("today");
    if (day === yesterday) return t("yesterday");
    const [year, month, date] = day.split("-");
    // Strings, so message formatting does not localize the digits (F-30).
    return t("date", { day: String(+date), month: String(+month), year });
  }

  const seenIndex = messages.findIndex((message) => message.id === seenId);
  const unseen = atBottom
    ? 0
    : messages
        .slice(seenIndex + 1)
        .filter((message) => message.senderId !== viewerId).length;

  const rows: ReactNode[] = [];
  let previous: string | null = null;
  for (const message of messages) {
    const day = todayInAppTimeZone(new Date(message.createdAt));
    if (day !== previous) {
      previous = day;
      rows.push(
        <li
          key={`day-${day}`}
          className="flex justify-center py-1"
          data-testid="chat-day"
        >
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {dayLabel(day)}
          </span>
        </li>,
      );
    }
    const own = message.senderId === viewerId;
    rows.push(
      <MessageBubble
        key={message.id}
        message={message}
        own={own}
        sender={own ? t("you") : otherName}
      />,
    );
  }

  return (
    <section
      aria-label={t("messages")}
      className="relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs"
    >
      <div className="relative">
        <div
          ref={scroller}
          onScroll={onScroll}
          data-testid="chat-scroller"
          className="h-[min(40rem,calc(100dvh-20rem))] min-h-80 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
        >
          <ol role="log" aria-relevant="additions" className="grid gap-2">
            {hasMore ? (
              <li ref={sentinel} className="flex justify-center py-1">
                {older === "loading" ? (
                  <p
                    role="status"
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <LoaderCircle
                      className="size-3.5 animate-spin"
                      aria-hidden
                    />
                    {t("loadingOlder")}
                  </p>
                ) : older === "error" ? (
                  <p className="flex flex-wrap items-center justify-center gap-2 text-xs text-destructive">
                    {t("olderError")}
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => void loadOlder()}
                    >
                      {t("retry")}
                    </Button>
                  </p>
                ) : (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => void loadOlder()}
                  >
                    {t("loadOlder")}
                  </Button>
                )}
              </li>
            ) : (
              messages.length > 0 && (
                <li className="py-1 text-center text-xs text-muted-foreground">
                  {t("beginning")}
                </li>
              )
            )}
            {rows}
          </ol>
          {messages.length === 0 && (
            <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          )}
        </div>
        {unseen > 0 && (
          <Button
            size="sm"
            onClick={scrollToBottom}
            className="absolute inset-x-0 bottom-3 mx-auto w-fit shadow-md"
          >
            <ArrowDown aria-hidden />
            {t("newMessages", { count: unseen })}
          </Button>
        )}
      </div>

      <div className="grid gap-2 border-t bg-background/60 p-3">
        {live === "reconnecting" && (
          <p role="status" className="text-xs text-muted-foreground">
            {t("reconnecting")}
          </p>
        )}
        {canSend ? (
          <MessageComposer
            conversationId={conversationId}
            onSent={(message) => add([message])}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
        )}
      </div>
    </section>
  );
}
