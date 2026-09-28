"use client";

import type {
  LeafletEventHandlerFnMap,
  LeafletMouseEvent,
  Marker as LeafletMarker,
} from "leaflet";
import { useEffect, useMemo } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import type { LatLng } from "@/lib/map";
import BaseMap from "./base-map";

export type MapViewTarget = { center: LatLng; zoom: number };

export type LocationPickerMapProps = {
  point: LatLng | null;
  // Initial view, and the view to move to whenever a new object is passed
  // (search result, own location); clicks and drags do not move the map.
  view: MapViewTarget;
  onPick: (point: LatLng) => void;
  // Alternative text of the pin.
  pinLabel: string;
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

// Map part of the location picker: click to place the pin, drag it to adjust.
// Browser only: loaded through `LocationPickerMap` from `@/components/map`.
export default function LocationPickerMap({
  point,
  view,
  onPick,
  pinLabel,
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
      {point && (
        <Marker
          position={point}
          draggable={!disabled}
          alt={pinLabel}
          title={pinLabel}
          eventHandlers={markerHandlers}
        />
      )}
    </BaseMap>
  );
}
