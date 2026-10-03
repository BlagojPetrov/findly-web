"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { elapsedSince } from "@/lib/dates";

// How often the relative times of the conversation list are worded again.
export const CONVERSATION_TIME_INTERVAL_MS = 60_000;

// One shared clock for all rows: it runs while any time is mounted. The
// first subscriber takes the current time, so a list restored by the Back
// button (router cache) or opened long after it was rendered is worded from
// now, not from when the server rendered it.
let current = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function tick() {
  current = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    current = Date.now();
    timer = setInterval(tick, CONVERSATION_TIME_INTERVAL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearInterval(timer);
  };
}

const getSnapshot = () => current;

// The time of a conversation's latest activity, relative to now ("пред 5
// минути"). Rendered by the server list with the server's time (`serverNow`,
// so hydration matches), then kept current in the browser. Worded with
// messages, not Intl (F-30).
export function ConversationTime({
  dateTime,
  serverNow,
  className,
}: {
  dateTime: string;
  // The time the server rendered the list at (ISO).
  serverNow: string;
  className?: string;
}) {
  const t = useTranslations("Messages.list");
  const now = useSyncExternalStore(subscribe, getSnapshot, () =>
    Date.parse(serverNow),
  );
  const elapsed = elapsedSince(new Date(dateTime), new Date(now));
  const text =
    elapsed.unit === "now"
      ? t("time.now")
      : elapsed.unit === "date"
        ? t("time.date", elapsed)
        : t(`time.${elapsed.unit}`, { count: elapsed.count });
  return (
    <time dateTime={dateTime} className={className}>
      {text}
    </time>
  );
}
