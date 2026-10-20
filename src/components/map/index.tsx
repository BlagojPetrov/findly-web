"use client";

import dynamic from "next/dynamic";
import { MapPinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MapErrorBoundary } from "./map-error-boundary";

// Entry point for maps. Leaflet needs `window`, so every module that imports
// `leaflet` or `react-leaflet` (even just `Marker`) is loaded here with
// `ssr: false` and never imported directly by pages. Render it inside
// `MapFrame`.

export const BaseMap = dynamic(() => import("./base-map"), {
  ssr: false,
  loading: MapLoading,
});

export const ItemMap = dynamic(() => import("./item-map"), {
  ssr: false,
  loading: MapLoading,
});

export const ItemsMap = dynamic(() => import("./items-map"), {
  ssr: false,
  loading: MapLoading,
});

export const LocationPickerMap = dynamic(
  () => import("./location-picker-map"),
  { ssr: false, loading: MapLoading },
);

// Placeholder while a map's code loads.
export function MapLoading() {
  const t = useTranslations("Map");
  return (
    <div className="size-full animate-pulse bg-muted">
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}

// Shown in the frame when a map fails.
function MapUnavailable() {
  const t = useTranslations("Map");
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
      <MapPinOff className="size-6" aria-hidden />
      {t("unavailable")}
    </div>
  );
}

// Sizes the map (`className`, e.g. `aspect-4/3` or `h-80`) so the page does
// not shift while it loads. The frame is its own stacking context: Leaflet's
// panes and controls use z-index up to 1000 and would otherwise cover the
// sticky header. A map that fails (code not loaded, Leaflet error) is replaced
// by a message; the rest of the page keeps working.
// `deferred`: the map (its code and tiles) loads only when the frame comes
// near the viewport, e.g. below the photos on a phone, so it does not compete
// with the page's main content (P11.S5).
export function MapFrame({
  label,
  className,
  deferred = false,
  children,
}: {
  // Accessible name of the map region.
  label: string;
  className?: string;
  deferred?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!deferred);

  useEffect(() => {
    const frame = ref.current;
    if (visible || !frame) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: "300px" },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      className={cn(
        "relative isolate overflow-hidden rounded-xl border bg-muted",
        className,
      )}
    >
      {visible ? (
        <MapErrorBoundary fallback={<MapUnavailable />}>
          {children}
        </MapErrorBoundary>
      ) : (
        <MapLoading />
      )}
    </div>
  );
}
