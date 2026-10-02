"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { currentMessagesVersion, MESSAGES_CHANGED_EVENT } from "@/lib/chat";

// The messages version each rendering of the list showed, by the router's
// bfcacheId: it is new for every fresh visit and the same when the browser's
// Back/Forward buttons restore that visit from the router cache.
const shownVersions = new Map<string, number>();

// Renders the page again when the header's subscription reports changed
// messages (new ones, or ones read elsewhere), so /messages stays current
// without a second Realtime channel. The header already batches events.
// A list restored by the Back button (no server request) renders again when
// the user's messages changed since it was shown, e.g. a chat was read or a
// message sent in the meantime (F-33).
export function RefreshOnMessages() {
  const { bfcacheId, refresh } = useRouter();

  useEffect(() => {
    const shown = shownVersions.get(bfcacheId);
    const current = currentMessagesVersion();
    shownVersions.set(bfcacheId, current);
    if (shown !== undefined && shown !== current) refresh();
  }, [bfcacheId, refresh]);

  useEffect(() => {
    const onChange = () => {
      shownVersions.set(bfcacheId, currentMessagesVersion());
      refresh();
    };
    window.addEventListener(MESSAGES_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(MESSAGES_CHANGED_EVENT, onChange);
  }, [bfcacheId, refresh]);
  return null;
}
