"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Entry point for maps. Leaflet needs `window`, so every module that imports
// `leaflet` or `react-leaflet` (even just `Marker`) is loaded here with
// `ssr: false` and never imported directly by pages. Render it inside
// `MapFrame`.

export const BaseMap = dynamic(() => import("./base-map"), {
  ssr: false,
  loading: MapLoading,
});

// Placeholder while a map's code loads.
export function MapLoading() {
  const t = useTranslations("Map");
  return (
    <div className="size-full animate-pulse bg-muted">
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}

// Sizes the map (`className`, e.g. `aspect-4/3` or `h-80`) so the page does
// not shift while it loads. The frame is its own stacking context: Leaflet's
// panes and controls use z-index up to 1000 and would otherwise cover the
// sticky header.
export function MapFrame({
  label,
  className,
  children,
}: {
  // Accessible name of the map region.
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "relative isolate overflow-hidden rounded-xl border bg-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}
