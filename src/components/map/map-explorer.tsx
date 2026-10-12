"use client";

import { LoaderCircle, RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryIcon } from "@/components/items/category-icon";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { dayParts } from "@/lib/dates";
import { itemImageUrl } from "@/lib/item-images";
import { MACEDONIA_BOUNDS } from "@/lib/map";
import {
  fetchMapItems,
  groupByPoint,
  type MapBounds,
  type MapItem,
  type MapItemGroup,
} from "@/lib/map-items";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/types/database";
import { ItemsMap, MapFrame } from "./index";

// Wait this long after the map stops moving before loading its area, so
// panning and zooming in steps make one request.
export const MAP_LOAD_DEBOUNCE_MS = 400;

type LoadState =
  | { status: "loading"; items: MapItem[]; total: number }
  | { status: "done"; items: MapItem[]; total: number }
  | { status: "error"; items: MapItem[]; total: number };

// The /map page's map with its status line: loads the active items of the
// visible area (and the type filter) whenever the map stops moving, keeps
// showing the previous markers while the next area loads, and says how many
// items there are (or that only the newest are shown, or that loading
// failed, with a retry).
export function MapExplorer({ type }: { type: Enums<"item_type"> | null }) {
  const t = useTranslations("MapPage");
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({
    status: "loading",
    items: [],
    total: 0,
  });
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!bounds) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((previous) => ({ ...previous, status: "loading" }));
      fetchMapItems(supabase, bounds, { type, signal: controller.signal }).then(
        ({ items, total }) => setState({ status: "done", items, total }),
        () => {
          if (!controller.signal.aborted) {
            setState((previous) => ({ ...previous, status: "error" }));
          }
        },
      );
    }, MAP_LOAD_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [supabase, bounds, type, attempt]);

  const groups = useMemo(() => groupByPoint(state.items), [state.items]);
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

  const shown = state.items.length;
  const message =
    state.status === "error"
      ? t("loadFailed")
      : state.status === "loading" && !bounds
        ? t("loading")
        : state.total > shown
          ? t("partial", { shown, count: state.total })
          : t("count", { count: state.total });

  return (
    <div className="grid gap-2">
      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <p role="status" aria-live="polite">
          {message}
        </p>
        {state.status === "loading" && (
          <span className="inline-flex items-center gap-1.5">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            <span className="sr-only">{t("loading")}</span>
          </span>
        )}
        {state.status === "error" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAttempt((n) => n + 1)}
          >
            <RotateCw aria-hidden />
            {t("retry")}
          </Button>
        )}
      </div>
      <MapFrame
        label={t("mapLabel")}
        className="h-[65dvh] min-h-80 sm:h-[70dvh]"
      >
        <ItemsMap
          groups={groups}
          initialBounds={MACEDONIA_BOUNDS}
          onBoundsChange={setBounds}
          groupLabel={groupLabel}
          renderPopup={renderPopup}
        />
      </MapFrame>
    </div>
  );
}

// The items of one marker, each linking to its page.
export function MapItemList({ items }: { items: MapItem[] }) {
  const t = useTranslations("MapPage");
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
            <ItemTypeBadge type={item.type} className="w-fit px-2 py-0" />
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
