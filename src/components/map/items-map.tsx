"use client";

import type { LatLngBoundsExpression } from "leaflet";
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { DEFAULT_CENTER } from "@/lib/map";
import type { MapBounds, MapItemGroup } from "@/lib/map-items";
import BaseMap from "./base-map";
import { type ItemMarkerKind, itemMarkerIcon } from "./item-marker-icon";

export type ItemsMapProps = {
  groups: MapItemGroup[];
  // Initial view (fitted once); later moves are the user's.
  initialBounds: LatLngBoundsExpression;
  // The visible area after the map is ready and after every move or zoom.
  onBoundsChange: (bounds: MapBounds) => void;
  // Accessible name (marker title) of a group, e.g. its item or "3 reports".
  groupLabel: (group: MapItemGroup) => string;
  // Popup content of a group (its items with links).
  renderPopup: (group: MapItemGroup) => ReactNode;
};

function kind(group: MapItemGroup): ItemMarkerKind {
  const [first, ...rest] = group.items;
  return rest.every((item) => item.type === first.type) ? first.type : "mixed";
}

function ReportBounds({
  initialBounds,
  onBoundsChange,
}: Pick<ItemsMapProps, "initialBounds" | "onBoundsChange">) {
  const map = useMap();
  const report = useCallback(() => {
    const b = map.getBounds();
    onBoundsChange({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    });
  }, [map, onBoundsChange]);
  const handlers = useMemo(() => ({ moveend: report }), [report]);
  useMapEvents(handlers);

  // Fit the initial area once, then report it (a fit that does not move the
  // map fires no moveend).
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current) return;
    fitted.current = true;
    map.fitBounds(initialBounds, { animate: false });
    report();
  }, [map, initialBounds, report]);
  return null;
}

// Map of the /map page: one marker per point (items at the same point share
// it), popups with the items. Loading is done by the parent through
// `onBoundsChange`. Browser only: loaded through `ItemsMap` from
// `@/components/map`.
export default function ItemsMap({
  groups,
  initialBounds,
  onBoundsChange,
  groupLabel,
  renderPopup,
}: ItemsMapProps) {
  return (
    // The center is replaced by the initial fit right away.
    <BaseMap center={DEFAULT_CENTER} zoom={8} scrollWheelZoom>
      <ReportBounds
        initialBounds={initialBounds}
        onBoundsChange={onBoundsChange}
      />
      {groups.map((group) => (
        <Marker
          key={group.key}
          position={group}
          icon={itemMarkerIcon(kind(group), group.items.length)}
          title={groupLabel(group)}
        >
          <Popup minWidth={220} maxWidth={280}>
            {renderPopup(group)}
          </Popup>
        </Marker>
      ))}
    </BaseMap>
  );
}
