"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import { type ReactNode, useTransition } from "react";
import { FormPendingMarker } from "@/components/search/pending-marker";
import { parseSearchParams, searchQuery } from "@/lib/validation/search";

// The feed's GET form (next/form). In the map view it goes straight to the
// canonical URL of the submitted filters (the same rules as the page's
// redirect), because the redirect that a plain submit gets (empty fields,
// field order) would remount the map; going straight there keeps it mounted
// and only refits it (P11.S3). The list view and browsers without
// JavaScript submit normally and the page redirects. Either way a pending
// marker dims the results.
export function SearchForm({
  action,
  mapView,
  className,
  children,
}: {
  // The localized feed path ("/items" or "/en/items").
  action: string;
  mapView: boolean;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Form
      action={action}
      className={className}
      onSubmit={
        mapView
          ? (event) => {
              event.preventDefault();
              const data = new URLSearchParams();
              for (const [key, value] of new FormData(event.currentTarget)) {
                if (typeof value === "string") data.append(key, value);
              }
              const query = new URLSearchParams(
                searchQuery(parseSearchParams(data)),
              ).toString();
              startTransition(() =>
                router.push(query ? `${action}?${query}` : action),
              );
            }
          : undefined
      }
    >
      {children}
      <FormPendingMarker />
      <span hidden data-pending={pending || undefined} />
    </Form>
  );
}
