"use client";

import { useEffect, useState } from "react";

// Seconds remaining until another email may be requested. `sentAt` is the
// time of the last successful request (undefined = no cooldown).
export function useCooldown(sentAt: number | undefined, seconds: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sentAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentAt]);

  if (!sentAt) return 0;
  // `now` may be slightly older than sentAt until the first tick; clamp.
  const elapsed = Math.max(0, Math.floor((now - sentAt) / 1000));
  return Math.max(0, seconds - elapsed);
}
