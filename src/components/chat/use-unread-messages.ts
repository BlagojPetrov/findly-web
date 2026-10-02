"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchUnreadMessageCount,
  MESSAGES_CHANGED_EVENT,
  MESSAGES_READ_EVENT,
} from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

// Realtime events, reads and reconnects are collected for this long and
// answered with one reload.
export const UNREAD_RELOAD_DELAY_MS = 300;

// The signed-in user's unread message count for the header (§16): first from
// the server, then reloaded after Realtime events (new messages in the
// user's conversations, and messages from others marked read, e.g. in
// another tab), after the chat marked messages read (window event), and when
// the tab becomes visible or the connection comes back. Realtime events are
// also passed on to the page (MESSAGES_CHANGED_EVENT), so /messages updates
// without a subscription of its own. Mount once per user (key = user id).
export function useUnreadMessages({
  userId,
  initialUnread,
}: {
  userId: string;
  initialUnread: number | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [unread, setUnread] = useState(initialUnread);
  // The browser's session no longer belongs to this user.
  const [signedOut, setSignedOut] = useState(false);
  const active = useRef(true);

  const forget = useCallback(() => {
    active.current = false;
    setSignedOut(true);
    setUnread(0);
  }, []);

  const reload = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!active.current) return;
      if (data.session?.user.id !== userId) {
        forget();
        return;
      }
      const count = await fetchUnreadMessageCount(supabase, userId);
      if (active.current) setUnread(count);
    } catch (error) {
      // Keep the last count; the next event or visit tries again.
      if (active.current) console.error(error);
    }
  }, [supabase, userId, forget]);

  useEffect(() => {
    if (signedOut) return;
    active.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let changed = false;

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (changed) {
          changed = false;
          window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
        }
        void reload();
      }, UNREAD_RELOAD_DELAY_MS);
    };
    const onChange = () => {
      changed = true;
      schedule();
    };

    // A topic of its own: supabase.channel() returns an existing channel
    // with the same topic, which a quick remount would then remove.
    // Realtime applies the messages select policy, so only messages of the
    // user's own conversations arrive.
    const channel = supabase
      .channel(`unread-messages:${userId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        onChange,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `sender_id=neq.${userId}`,
        },
        onChange,
      )
      .subscribe((status) => {
        // Catch up on anything missed before (re)subscribing.
        if (active.current && status === "SUBSCRIBED") schedule();
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", schedule);
    window.addEventListener(MESSAGES_READ_EVENT, schedule);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (session && session.user.id !== userId)) {
        forget();
      }
    });

    return () => {
      active.current = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", schedule);
      window.removeEventListener(MESSAGES_READ_EVENT, schedule);
      subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, reload, forget, signedOut]);

  return { unread, signedOut };
}
