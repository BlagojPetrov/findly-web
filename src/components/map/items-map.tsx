"use client";

import { type ReactNode, useEffect } from "react";
import { Circle, Marker, Popup, useMap } from "react-leaflet";
import { DEFAULT_CENTER, type LatLng } from "@/lib/map";
import type { MapArea, MapItemGroup } from "@/lib/map-items";
import BaseMap from "./base-map";
import { type ItemMarkerKind, itemMarkerIcon } from "./item-marker-icon";

export type ItemsMapProps = {
  groups: MapItemGroup[];
  // The area to show; fitted again whenever it changes (new results), so
  // the user's own moves are kept while the results stay the same.
  area: MapArea;
  // The search circle of a radius filter, drawn around its center.
  circle?: { center: LatLng; radiusKm: number } | null;
  // Accessible name (marker title) of a group, e.g. its item or "3 reports".
  groupLabel: (group: MapItemGroup) => string;
  // Popup content of a group (its items with links).
  renderPopup: (group: MapItemGroup) => ReactNode;
};

// Zoom for an area of a single point (or a few close ones), so one report
// does not open at street level.
const MAX_FIT_ZOOM = 15;

function kind(group: MapItemGroup): ItemMarkerKind {
  const [first, ...rest] = group.items;
  return rest.every((item) => item.type === first.type) ? first.type : "mixed";
}

function FitArea({ area }: { area: MapArea }) {
  const map = useMap();
  // Compared by value: a re-render with the same results keeps the view.
  const key = JSON.stringify(area);
  useEffect(() => {
    map.fitBounds(JSON.parse(key) as MapArea, {
      animate: false,
      padding: [24, 24],
      maxZoom: MAX_FIT_ZOOM,
    });
  }, [map, key]);
  return null;
}

// Map of the feed's map view: one marker per point (items at the same point
// share it), popups with the items, the search circle. Browser only: loaded
// through `ItemsMap` from `@/components/map`. Scroll-wheel zoom stays off
// (the map is part of a scrolling page).
export default function ItemsMap({
  groups,
  area,
  circle,
  groupLabel,
  renderPopup,
}: ItemsMapProps) {
  return (
    // The center is replaced by the first fit right away.
    <BaseMap center={DEFAULT_CENTER} zoom={8}>
      <FitArea area={area} />
      {circle && (
        <Circle
          center={circle.center}
          radius={circle.radiusKm * 1000}
          interactive={false}
          className="fill-primary stroke-primary"
          pathOptions={{ weight: 2, fillOpacity: 0.08 }}
        />
      )}
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
