import { CalendarDays, MapPin } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CategoryIcon } from "@/components/items/category-icon";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { MatchActions } from "@/components/matches/match-actions";
import {
  MatchExplanation,
  MatchScore,
} from "@/components/matches/match-explanation";
import { Link } from "@/i18n/navigation";
import { calendarDay } from "@/lib/dates";
import { itemImageUrl } from "@/lib/item-images";
import type { MatchView } from "@/lib/matches";
import { categoryName } from "@/lib/queries/categories";
import type { MatchItem } from "@/lib/queries/matches";
import { cn } from "@/lib/utils";

const statusStyles = {
  confirmed: "border-found/30 bg-found/10 text-found",
  dismissed: "border-border bg-muted text-muted-foreground",
};

// One match from the viewer's side: the other person's report (photo, type,
// title, category, date, place), the score as words, why it was suggested
// and the actions for its status. `showOwnItem` (dashboard) names the
// viewer's report it belongs to. Only the place name is shown, never
// coordinates; the distance comes from the breakdown.
export function MatchCard({
  match,
  showOwnItem = false,
}: {
  match: MatchView<MatchItem>;
  showOwnItem?: boolean;
}) {
  const t = useTranslations("Matches");
  const tItems = useTranslations("Items");
  const format = useFormatter();
  const locale = useLocale();
  const { other, own } = match;

  return (
    <article
      className={cn(
        "grid gap-4 rounded-xl border bg-card p-4 shadow-xs sm:grid-cols-[6rem_minmax(0,1fr)]",
        match.status === "dismissed" && "bg-muted/30",
      )}
    >
      <Link
        href={`/items/${other.id}`}
        tabIndex={-1}
        aria-hidden
        className="hidden aspect-square overflow-hidden rounded-lg bg-muted sm:block"
      >
        {other.coverPath ? (
          // Storage URLs of already compressed photos (AD-17).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={itemImageUrl(other.coverPath)}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <CategoryIcon name={other.category.icon} className="size-8" />
          </span>
        )}
      </Link>

      <div className="grid min-w-0 content-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ItemTypeBadge type={other.type} />
          {match.status !== "suggested" && (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                statusStyles[match.status],
              )}
            >
              {t(`status.${match.status}`)}
            </span>
          )}
          <span className="ml-auto">
            <MatchScore score={match.score} />
          </span>
        </div>

        <div className="grid gap-1">
          <h3 className="font-semibold break-words">
            <Link
              href={`/items/${other.id}`}
              className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {other.title}
            </Link>
          </h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <li className="flex min-w-0 items-center gap-1.5">
              <CategoryIcon
                name={other.category.icon}
                className="size-4 shrink-0"
              />
              <span className="truncate">
                {categoryName(other.category, locale)}
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">
                {tItems(`detail.occurredOn.${other.type}`)}
              </span>
              {format.dateTime(calendarDay(other.occurred_on), {
                dateStyle: "medium",
                timeZone: "UTC",
              })}
            </li>
            {other.location_name && (
              <li className="flex min-w-0 items-center gap-1.5">
                <MapPin className="size-4 shrink-0" aria-hidden />
                <span className="sr-only">{tItems("detail.location")}</span>
                <span className="truncate">{other.location_name}</span>
              </li>
            )}
          </ul>
          {showOwnItem && (
            <p className="text-sm break-words">
              {t.rich("forYourReport", {
                title: own.title,
                link: (chunks) => (
                  <Link
                    href={`/items/${own.id}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}
        </div>

        <MatchExplanation breakdown={match.breakdown} />

        {match.status === "confirmed" && (
          <p className="text-sm text-muted-foreground">{t("confirmedHint")}</p>
        )}

        <MatchActions matchId={match.id} status={match.status} />
      </div>
    </article>
  );
}
