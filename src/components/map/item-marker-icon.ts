import { type DivIcon, divIcon } from "leaflet";

// Markers of the /map page: a round pin in the item type's color (lost /
// found; the primary color for a point with both), with the number of items
// when several share the point. Styled with the theme's tokens, so they
// follow dark mode. Browser only (imports Leaflet).

export type ItemMarkerKind = "lost" | "found" | "mixed";

const SIZE = 28;

const colors: Record<ItemMarkerKind, string> = {
  lost: "bg-lost text-lost-foreground",
  found: "bg-found text-found-foreground",
  mixed: "bg-primary text-primary-foreground",
};

const cache = new Map<string, DivIcon>();

export function itemMarkerIcon(kind: ItemMarkerKind, count: number): DivIcon {
  const key = `${kind}:${count}`;
  let icon = cache.get(key);
  if (!icon) {
    icon = divIcon({
      // Leaflet's default white box is replaced by the inner element.
      className: "",
      html: `<span class="flex size-full items-center justify-center rounded-full border-2 border-white text-xs font-semibold shadow-md ring-1 ring-black/20 ${colors[kind]}">${count > 99 ? "99+" : count > 1 ? count : ""}</span>`,
      iconSize: [SIZE, SIZE],
      iconAnchor: [SIZE / 2, SIZE / 2],
      popupAnchor: [0, -SIZE / 2],
    });
    cache.set(key, icon);
  }
  return icon;
}
