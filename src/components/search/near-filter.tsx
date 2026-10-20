"use client";

import { LoaderCircle, LocateFixed, Map as MapIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { LocationPickerMap, MapFrame } from "@/components/map";
import type { MapViewTarget } from "@/components/map/location-picker-map";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DEFAULT_CENTER, type LatLng } from "@/lib/map";
import { cn } from "@/lib/utils";
import {
  CENTER_DECIMALS,
  centerParam,
  SEARCH_RADII,
  type SearchRadius,
} from "@/lib/validation/search-center";

// Radius chosen when a center is set for the first time.
export const DEFAULT_RADIUS: SearchRadius = 5;

// Zoom at which the radius circle fits the small map.
const RADIUS_ZOOM: Record<SearchRadius, number> = {
  1: 13,
  2: 12,
  5: 11,
  10: 10,
  25: 9,
  50: 8,
};
const radiusZoom = (radius: SearchRadius | null) =>
  radius ? RADIUS_ZOOM[radius] : 11;

type GeoStatus = "idle" | "locating" | "denied" | "unavailable" | "unsupported";

// Distance part of the feed's filter form: a center ("near me" or a point on
// the map) posted as `lat`/`lng`, and a `radius` select. Without a center
// nothing is posted and the radius is disabled. Choices only take effect when
// the form is submitted, like the other filters.
export function NearFilter({
  defaultNear,
  defaultRadius,
}: {
  defaultNear: LatLng | null;
  defaultRadius: SearchRadius | null;
}) {
  const t = useTranslations("Search.near");
  const id = useId();
  const [near, setNear] = useState(defaultNear);
  const [radius, setRadius] = useState(defaultRadius);
  const [showMap, setShowMap] = useState(false);
  const [view, setView] = useState<MapViewTarget>({
    center: defaultNear ?? DEFAULT_CENTER,
    zoom: radiusZoom(defaultRadius),
  });
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");

  function choose(point: LatLng) {
    setNear(point);
    setGeoStatus("idle");
    // A first center gets a radius, so "near me" means nearby.
    if (!near && !radius) setRadius(DEFAULT_RADIUS);
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        choose(point);
        setView({ center: point, zoom: radiusZoom(radius ?? DEFAULT_RADIUS) });
      },
      (error) =>
        setGeoStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        ),
      // An approximate position is enough for a radius of 1 km or more.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  function changeRadius(value: string) {
    const next = value ? (Number(value) as SearchRadius) : null;
    setRadius(next);
    if (near) setView({ center: near, zoom: radiusZoom(next) });
  }

  function clear() {
    setNear(null);
    setRadius(null);
    setGeoStatus("idle");
  }

  const geoMessage =
    geoStatus === "locating"
      ? t("locating")
      : geoStatus !== "idle"
        ? t(`geo.${geoStatus}`)
        : null;
  // A message, not Intl unit formatting: Chromium has no Macedonian data
  // for it (F-30). The radii are whole numbers.
  const km = (value: number) => t("km", { value: String(value) });

  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">
        {near
          ? t("around", {
              lat: near.lat.toFixed(CENTER_DECIMALS),
              lng: near.lng.toFixed(CENTER_DECIMALS),
            })
          : t("anywhere")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-auto"
          onClick={locate}
          disabled={geoStatus === "locating"}
        >
          {geoStatus === "locating" ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : (
            <LocateFixed aria-hidden />
          )}
          {t("nearMe")}
        </Button>
        <Button
          type="button"
          variant={showMap ? "secondary" : "outline"}
          size="sm"
          className="flex-auto"
          aria-expanded={showMap}
          aria-controls={`${id}-map`}
          onClick={() => {
            if (!showMap && near) {
              setView({ center: near, zoom: radiusZoom(radius) });
            }
            setShowMap(!showMap);
          }}
        >
          <MapIcon aria-hidden />
          {t("onMap")}
        </Button>
        {near && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-auto"
            onClick={clear}
          >
            <X aria-hidden />
            {t("clear")}
          </Button>
        )}
      </div>
      <p role="status" className="text-xs text-muted-foreground empty:hidden">
        {geoMessage}
      </p>

      {/* Mounted only while shown: Leaflet cannot size a hidden map (the
          filter panel is collapsed on phones). */}
      <div id={`${id}-map`} className={cn("grid gap-1", !showMap && "hidden")}>
        {showMap && (
          <>
            <MapFrame label={t("mapLabel")} className="aspect-square">
              <LocationPickerMap
                point={near}
                view={view}
                onPick={choose}
                pinLabel={t("pinLabel")}
                radius={near && radius ? radius * 1000 : null}
              />
            </MapFrame>
            <p className="text-xs text-muted-foreground">{t("mapHint")}</p>
          </>
        )}
      </div>

      <div className="grid gap-1">
        <Label htmlFor={`${id}-radius`} className="text-xs font-normal">
          {t("radius")}
        </Label>
        {/* Disabled (and so not submitted) without a center. */}
        <select
          id={`${id}-radius`}
          name="radius"
          value={near ? String(radius ?? "") : ""}
          onChange={(event) => changeRadius(event.target.value)}
          disabled={!near}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
        >
          <option value="">{t("anyDistance")}</option>
          {SEARCH_RADII.map((value) => (
            <option key={value} value={value}>
              {km(value)}
            </option>
          ))}
        </select>
      </div>

      {near && (
        <>
          <input type="hidden" name="lat" value={centerParam(near.lat)} />
          <input type="hidden" name="lng" value={centerParam(near.lng)} />
        </>
      )}
    </div>
  );
}
