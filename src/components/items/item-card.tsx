import { CalendarDays, MapPin, Navigation } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { CategoryIcon } from "@/components/items/category-icon";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { Link } from "@/i18n/navigation";
import { calendarDay } from "@/lib/dates";
import { itemImageUrl } from "@/lib/item-images";
import { distanceDisplay } from "@/lib/map";
import { categoryName } from "@/lib/queries/categories";
import type { ItemSummary } from "@/lib/queries/items";
import { cn } from "@/lib/utils";

const statusStyles = {
  resolved: "border-border bg-muted text-muted-foreground",
  hidden: "border-destructive/30 bg-destructive/10 text-destructive",
};

// A report in a grid: cover photo (or the category icon), type and status,
// title, category, date, place and (in a search around a point) distance. The whole card links to the item page;
// `actions` (e.g. the owner's quick actions) sit in a footer above the link.
// With `favorite`, a heart over the photo saves the report (guests: login).
export function ItemCard({
  item,
  actions,
  favorite,
}: {
  item: ItemSummary;
  actions?: ReactNode;
  favorite?: { signedIn: boolean };
}) {
  const t = useTranslations("Items");
  const format = useFormatter();
  const locale = useLocale();

  function formatDistance(meters: number) {
    const { value, ...options } = distanceDisplay(meters);
    return format.number(value, { style: "unit", ...options });
  }

  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow focus-within:ring-3 focus-within:ring-ring/50 hover:shadow-md">
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
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
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <CategoryIcon name={item.category.icon} className="size-10" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          <ItemTypeBadge type={item.type} className="bg-background/90" />
          {item.status !== "active" && (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                statusStyles[item.status],
              )}
            >
              {t(`status.${item.status}`)}
            </span>
          )}
        </div>
        {favorite && (
          <FavoriteButton
            itemId={item.id}
            isFavorite={item.isFavorite ?? false}
            signedIn={favorite.signedIn}
            className="absolute top-2 right-2 z-10"
          />
        )}
      </div>

      <div className="grid flex-1 content-start gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold break-words">
          <Link
            href={`/items/${item.id}`}
            className="outline-none after:absolute after:inset-0"
          >
            {item.title}
          </Link>
        </h3>
        <ul className="grid gap-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CategoryIcon
              name={item.category.icon}
              className="size-4 shrink-0"
            />
            <span className="truncate">
              {categoryName(item.category, locale)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">
              {t(`detail.occurredOn.${item.type}`)}
            </span>
            {format.dateTime(calendarDay(item.occurred_on), {
              dateStyle: "medium",
              timeZone: "UTC",
            })}
          </li>
          {item.location_name && (
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">{t("detail.location")}</span>
              <span className="truncate">{item.location_name}</span>
            </li>
          )}
          {item.distance != null && (
            <li className="flex items-center gap-2">
              <Navigation className="size-4 shrink-0" aria-hidden />
              {t("detail.distance", {
                distance: formatDistance(item.distance),
              })}
            </li>
          )}
        </ul>
      </div>

      {actions && (
        <div className="relative z-10 border-t bg-muted/30 px-3 py-3">
          {actions}
        </div>
      )}
    </article>
  );
}
