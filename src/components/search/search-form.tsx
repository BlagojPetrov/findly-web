"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useTransition } from "react";
import { FormPendingMarker } from "@/components/search/pending-marker";

// The URL rules with their Zod schemas, loaded only by the map view: the list
// view never needs them in the browser (P11.S5).
const loadSearchRules = () => import("@/lib/validation/search");

// The feed's GET form (next/form). In the map view it goes straight to the
// canonical URL of the submitted filters (the same rules as the page's
// redirect), because the redirect that a plain submit gets (empty fields,
// field order) would remount the map; going straight there keeps it mounted
// and only refits it (P11.S3). The list view and browsers without
// JavaScript submit normally and the page redirects. Either way a pending
// marker dims the results. The map view starts loading the URL rules when it
// mounts, so a submit does not wait for them.
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

  useEffect(() => {
    if (mapView) void loadSearchRules();
  }, [mapView]);

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
              startTransition(async () => {
                const { parseSearchParams, searchQuery } =
                  await loadSearchRules();
                const query = new URLSearchParams(
                  searchQuery(parseSearchParams(data)),
                ).toString();
                startTransition(() =>
                  router.push(query ? `${action}?${query}` : action),
                );
              });
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
