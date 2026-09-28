"use client";

import { useLinkStatus } from "next/link";
import { useFormStatus } from "react-dom";

// Hidden markers with `data-pending` while a navigation they started is
// running, so an ancestor can style its content with
// `group-has-[[data-pending]]/…:` (the feed dims its results). Without
// JavaScript nothing is marked and the browser's own loading indicator shows.

// Inside a `Link`.
export function LinkPendingMarker() {
  const { pending } = useLinkStatus();
  return <span hidden data-pending={pending || undefined} />;
}

// Inside a `next/form` `Form`.
export function FormPendingMarker() {
  const { pending } = useFormStatus();
  return <span hidden data-pending={pending || undefined} />;
}
