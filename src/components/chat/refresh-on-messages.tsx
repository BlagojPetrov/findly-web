"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { MESSAGES_CHANGED_EVENT } from "@/lib/chat";

// Renders the page again when the header's subscription reports changed
// messages (new ones, or ones read elsewhere), so /messages stays current
// without a second Realtime channel. The header already batches events.
export function RefreshOnMessages() {
  const router = useRouter();
  useEffect(() => {
    const onChange = () => router.refresh();
    window.addEventListener(MESSAGES_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(MESSAGES_CHANGED_EVENT, onChange);
  }, [router]);
  return null;
}
