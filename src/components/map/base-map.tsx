"use client";

import "leaflet/dist/leaflet.css";
// Sets the default marker icon for every map.
import "./marker-icon";
import "./leaflet-fixes";
import type { ReactNode } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type LatLng,
  OSM_ATTRIBUTION,
  OSM_MAX_ZOOM,
  OSM_TILE_URL,
} from "@/lib/map";

export type BaseMapProps = {
  // Initial view only: Leaflet ignores later changes (move the map with
  // `useMap()` from a child instead).
  center?: LatLng;
  zoom?: number;
  // Off by default so the map does not catch page scrolling.
  scrollWheelZoom?: boolean;
  // Markers, layers and components that use `useMap()`.
  children?: ReactNode;
};

// OpenStreetMap map filling its parent. Browser only: use `BaseMap` from
// `@/components/map`, which loads this without server rendering.
export default function BaseMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  scrollWheelZoom = false,
  children,
}: BaseMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={scrollWheelZoom}
      className="size-full"
    >
      <TileLayer
        url={OSM_TILE_URL}
        attribution={OSM_ATTRIBUTION}
        maxZoom={OSM_MAX_ZOOM}
      />
      {children}
    </MapContainer>
  );
}
