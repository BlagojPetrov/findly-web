"use client";

import { Marker } from "react-leaflet";
import type { LatLng } from "@/lib/map";
import BaseMap from "./base-map";
import { markerIcon } from "./marker-icon";

// Zoom of an item's map (street level).
const ITEM_ZOOM = 16;

// Read-only map of an item's location: centered on the stored point, with a
// fixed pin. Browser only: loaded through `ItemMap` from `@/components/map`.
export default function ItemMap({
  point,
  pinLabel,
}: {
  point: LatLng;
  // Alternative text of the pin.
  pinLabel: string;
}) {
  return (
    <BaseMap center={point} zoom={ITEM_ZOOM}>
      <Marker
        position={point}
        icon={markerIcon}
        alt={pinLabel}
        title={pinLabel}
      />
    </BaseMap>
  );
}
