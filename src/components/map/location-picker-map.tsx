"use client";

import type {
  LeafletEventHandlerFnMap,
  LeafletMouseEvent,
  Marker as LeafletMarker,
} from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, Marker, useMap, useMapEvents } from "react-leaflet";
import type { LatLng } from "@/lib/map";
import BaseMap from "./base-map";
import { markerIcon } from "./marker-icon";

export type MapViewTarget = { center: LatLng; zoom: number };

export type LocationPickerMapProps = {
  point: LatLng | null;
  // Initial view, and the view to move to whenever a new object is passed
  // (search result, own location); clicks and drags do not move the map.
  view: MapViewTarget;
  onPick: (point: LatLng) => void;
  // Alternative text of the pin.
  pinLabel: string;
  // Circle of this many meters around the pin (e.g. a search radius).
  radius?: number | null;
  disabled?: boolean;
};

function toPoint(latLng: { lat: number; lng: number }): LatLng {
  return { lat: latLng.lat, lng: latLng.lng };
}

function ClickToPick({
  onPick,
  disabled,
}: Pick<LocationPickerMapProps, "onPick" | "disabled">) {
  const handlers = useMemo(
    () => ({
      click(event: LeafletMouseEvent) {
        if (!disabled) onPick(toPoint(event.latlng.wrap()));
      },
    }),
    [onPick, disabled],
  );
  useMapEvents(handlers);
  return null;
}

function FollowView({ view }: { view: MapViewTarget }) {
  const map = useMap();
  useEffect(() => {
    map.setView(view.center, view.zoom);
  }, [map, view]);
  return null;
}

// Map part of the location picker (and the feed's distance filter): click to
// place the pin, drag it to adjust.
// Browser only: loaded through `LocationPickerMap` from `@/components/map`.
export default function LocationPickerMap({
  point,
  view,
  onPick,
  pinLabel,
  radius,
  disabled,
}: LocationPickerMapProps) {
  const markerHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      dragend(event) {
        const marker = event.target as LeafletMarker;
        onPick(toPoint(marker.getLatLng().wrap()));
      },
    }),
    [onPick],
  );

  return (
    <BaseMap center={view.center} zoom={view.zoom}>
      <ClickToPick onPick={onPick} disabled={disabled} />
      <FollowView view={view} />
      {point && radius ? (
        <Circle
          center={point}
          radius={radius}
          interactive={false}
          // Colors from the theme: CSS beats Leaflet's stroke/fill attributes.
          className="fill-primary stroke-primary"
          pathOptions={{ weight: 2, fillOpacity: 0.1 }}
        />
      ) : null}
      {point && (
        <Marker
          position={point}
          icon={markerIcon}
          draggable={!disabled}
          alt={pinLabel}
          title={pinLabel}
          eventHandlers={markerHandlers}
        />
      )}
    </BaseMap>
  );
}
