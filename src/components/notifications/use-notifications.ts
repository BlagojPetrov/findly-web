"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteNotification,
  setNotificationRead,
} from "@/actions/notifications";
import type { ActionResult } from "@/lib/action-result";
import {
  fetchNotifications,
  fetchUnreadCount,
  type NotificationView,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";

export type NotificationListState =
  | { status: "idle" | "loading" | "error" }
  | { status: "ready"; views: NotificationView[] };

// "connecting" until the first subscription, "reconnecting" after an error
// or a closed channel (Realtime rejoins by itself; the list is reloaded once
// it is back).
export type LiveState = "connecting" | "live" | "reconnecting";

// Realtime events, focus and reconnects are collected for this long and
// answered with one reload.
export const RELOAD_DELAY_MS = 300;

type RealtimeRow = { user_id?: string } | undefined;

// The signed-in user's notifications in the browser: the unread count (first
// from the server, then kept current), the panel list (loaded when first
// opened), a Realtime subscription to the user's new and changed rows, and
// optimistic read/unread/delete. Mount once per user (key = user id): the
// subscription is removed on unmount, so signing out (the header renders no
// bell) or switching accounts (a new key) never keeps the old user's channel
// or data.
export function useNotifications({
  userId,
  initialUnread,
  onNew,
}: {
  userId: string;
  initialUnread: number | null;
  // Called with the number of new notifications since the last reload.
  onNew?: (count: number) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [unread, setUnread] = useState(initialUnread);
  const [list, setList] = useState<NotificationListState>({ status: "idle" });
  const [live, setLive] = useState<LiveState>("connecting");
  // The browser's session no longer belongs to this user.
  const [signedOut, setSignedOut] = useState(false);

  const listWanted = useRef(false);
  // Bumped by every local change: a reload that started earlier must not
  // overwrite the optimistic state with older data.
  const version = useRef(0);
  const active = useRef(true);
  const onNewRef = useRef(onNew);
  useEffect(() => {
    onNewRef.current = onNew;
  });

  const forget = useCallback(() => {
    active.current = false;
    setSignedOut(true);
    setUnread(0);
    setList({ status: "idle" });
  }, []);

  const reload = useCallback(async () => {
    const started = version.current;
    const withList = listWanted.current;
    try {
      // Another account in this browser (signed out or switched in another
      // tab): show nothing of either user.
      const { data } = await supabase.auth.getSession();
      if (!active.current) return;
      if (data.session?.user.id !== userId) {
        forget();
        return;
      }
      const [count, views] = await Promise.all([
        fetchUnreadCount(supabase, userId),
        withList ? fetchNotifications(supabase, userId) : null,
      ]);
      if (!active.current || started !== version.current) return;
      setUnread(count);
      if (views) setList({ status: "ready", views });
    } catch (error) {
      if (!active.current) return;
      console.error(error);
      // Keep a list that is already shown; otherwise show the error.
      if (withList) {
        setList((current) =>
          current.status === "ready" ? current : { status: "error" },
        );
      }
    }
  }, [supabase, userId, forget]);

  // Opening the panel: load the list (again after an error).
  const loadList = useCallback(() => {
    listWanted.current = true;
    setList((current) =>
      current.status === "ready" ? current : { status: "loading" },
    );
    void reload();
  }, [reload]);

  useEffect(() => {
    if (signedOut) return;
    active.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inserted = 0;

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const count = inserted;
        inserted = 0;
        if (count > 0) onNewRef.current?.(count);
        void reload();
      }, RELOAD_DELAY_MS);
    };
    const own = (row: RealtimeRow) => row?.user_id === userId;

    const filter = `user_id=eq.${userId}`;
    // A topic of its own: supabase.channel() returns an existing channel
    // with the same topic, which a quick remount would then remove.
    const channel = supabase
      .channel(`notifications:${userId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter },
        (payload) => {
          if (!own(payload.new as RealtimeRow)) return;
          inserted++;
          schedule();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter },
        (payload) => {
          if (own(payload.new as RealtimeRow)) schedule();
        },
      )
      // Deletes are not subscribed: Realtime cannot filter them by user or
      // check RLS for them. Rows deleted elsewhere disappear on the next
      // reload (event, focus, reconnect, reopening the panel).
      .subscribe((status) => {
        if (!active.current) return;
        if (status === "SUBSCRIBED") {
          setLive("live");
          // Catch up on anything missed before (re)subscribing.
          schedule();
        } else {
          setLive("reconnecting");
        }
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", schedule);

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
      subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, reload, forget, signedOut]);

  // Optimistic change, then the server's answer and a reload (which also
  // undoes a change that failed).
  const mutate = useCallback(
    async (
      apply: () => void,
      action: () => Promise<ActionResult>,
    ): Promise<ActionResult> => {
      version.current++;
      apply();
      const result = await action();
      version.current++;
      if (active.current) void reload();
      return result;
    },
    [reload],
  );

  const setRead = useCallback(
    (view: NotificationView, read: boolean) => {
      const data = new FormData();
      data.set("notificationId", view.id);
      data.set("read", String(read));
      return mutate(
        () => {
          setList((current) =>
            current.status === "ready"
              ? {
                  status: "ready",
                  views: current.views.map((other) =>
                    other.id === view.id ? { ...other, read } : other,
                  ),
                }
              : current,
          );
          if (view.read !== read) {
            setUnread((count) =>
              count === null ? count : Math.max(0, count + (read ? -1 : 1)),
            );
          }
        },
        () => setNotificationRead(data),
      );
    },
    [mutate],
  );

  const remove = useCallback(
    (view: NotificationView) => {
      const data = new FormData();
      data.set("notificationId", view.id);
      return mutate(
        () => {
          setList((current) =>
            current.status === "ready"
              ? {
                  status: "ready",
                  views: current.views.filter((other) => other.id !== view.id),
                }
              : current,
          );
          if (!view.read) {
            setUnread((count) =>
              count === null ? count : Math.max(0, count - 1),
            );
          }
        },
        () => deleteNotification(data),
      );
    },
    [mutate],
  );

  return { unread, list, live, signedOut, loadList, setRead, remove };
}
