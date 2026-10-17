"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { CategoryIcon } from "@/components/items/category-icon";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { Link } from "@/i18n/navigation";
import { dayParts } from "@/lib/dates";
import { itemImageUrl } from "@/lib/item-images";
import { type LatLng, MACEDONIA_BOUNDS } from "@/lib/map";
import {
  groupByPoint,
  type MapItem,
  type MapItemGroup,
  resultArea,
} from "@/lib/map-items";
import { ItemsMap, MapFrame } from "./index";

// The map view of the feed (P11.S3): the reports of the current filters
// (loaded on the server), one marker per point with a popup that links to
// each report, and the search circle of a radius filter. The page keeps it
// mounted across filter changes; the map fits each new result set (North
// Macedonia when there is nothing to fit).
export function ResultsMap({
  items,
  circle,
}: {
  items: MapItem[];
  circle: { center: LatLng; radiusKm: number } | null;
}) {
  const t = useTranslations("Search.map");
  const groups = useMemo(() => groupByPoint(items), [items]);
  const area = useMemo(
    () => resultArea(items, circle) ?? MACEDONIA_BOUNDS,
    [items, circle],
  );
  const groupLabel = useCallback(
    (group: MapItemGroup) =>
      group.items.length === 1
        ? group.items[0].title
        : t("groupLabel", { count: group.items.length }),
    [t],
  );
  const renderPopup = useCallback(
    (group: MapItemGroup) => <MapItemList items={group.items} />,
    [],
  );

  return (
    <MapFrame label={t("label")} className="h-[60dvh] min-h-80">
      <ItemsMap
        groups={groups}
        area={area}
        circle={circle}
        groupLabel={groupLabel}
        renderPopup={renderPopup}
      />
    </MapFrame>
  );
}

// The items of one marker, each linking to its page.
export function MapItemList({ items }: { items: MapItem[] }) {
  const t = useTranslations("Search.map");
  const tItems = useTranslations("Items");
  const locale = useLocale();

  return (
    <ul
      aria-label={t("groupLabel", { count: items.length })}
      className="-my-1 grid max-h-72 gap-3 overflow-y-auto font-sans"
    >
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
            {item.coverPath ? (
              // Storage URLs of already compressed photos (AD-17).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={itemImageUrl(item.coverPath)}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <CategoryIcon name={item.category.icon} className="size-6" />
            )}
          </div>
          <div className="grid min-w-0 content-start gap-1">
            <div className="flex flex-wrap items-center gap-1">
              <ItemTypeBadge type={item.type} className="w-fit px-2 py-0" />
              {item.status === "resolved" && (
                <span className="rounded-full border bg-muted px-2 text-xs text-muted-foreground">
                  {tItems("status.resolved")}
                </span>
              )}
            </div>
            <Link
              href={`/items/${item.id}`}
              className="line-clamp-2 text-sm font-semibold break-words text-foreground! underline-offset-2 hover:underline"
            >
              {item.title}
            </Link>
            <p className="text-xs text-muted-foreground">
              {locale === "mk" ? item.category.name_mk : item.category.name_en}
              {" · "}
              {t("date", dayParts(item.occurredOn))}
            </p>
            {item.locationName && (
              <p className="truncate text-xs text-muted-foreground">
                {item.locationName}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
