import {
  CalendarDays,
  MapPin,
  MessageSquareText,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { distanceDisplay } from "@/lib/map";
import {
  type MatchBreakdown,
  type MatchReason,
  matchReasons,
  matchStrength,
} from "@/lib/matches";
import { cn } from "@/lib/utils";

const reasonIcons: Record<MatchReason["kind"], LucideIcon> = {
  category: Shapes,
  distance: MapPin,
  date: CalendarDays,
  words: MessageSquareText,
  text: MessageSquareText,
};

// One line per reason, e.g. "Same category", "1 km apart", "1 day apart",
// "Common words: crn, paricnik, koza".
function useReasonText() {
  const t = useTranslations("Matches.reasons");
  const format = useFormatter();
  return (reason: MatchReason) => {
    switch (reason.kind) {
      case "category":
        return t(reason.same ? "sameCategory" : "otherCategory");
      case "distance": {
        const { value, ...options } = distanceDisplay(reason.meters);
        return t("distance", {
          distance: format.number(value, { style: "unit", ...options }),
        });
      }
      case "date":
        return reason.days === 0
          ? t("sameDay")
          : t("days", { count: reason.days });
      case "words":
        // With a remainder, "and N more" ends the list, so the listed
        // words are only separated by commas.
        return t("words", {
          words:
            reason.more > 0
              ? t("moreWords", {
                  words: reason.words.join(", "),
                  count: reason.more,
                })
              : format.list(reason.words, { type: "unit" }),
        });
      case "text":
        return t(reason.similar ? "similarText" : "differentText");
    }
  };
}

// Why a match was suggested, from its stored breakdown.
export function MatchExplanation({
  breakdown,
  className,
}: {
  breakdown: MatchBreakdown;
  className?: string;
}) {
  const t = useTranslations("Matches");
  const reasonText = useReasonText();
  const reasons = matchReasons(breakdown);
  if (reasons.length === 0) return null;

  return (
    <div className={className}>
      <p className="sr-only">{t("reasonsLabel")}</p>
      <ul className="flex flex-wrap gap-1.5">
        {reasons.map((reason) => {
          const Icon = reasonIcons[reason.kind];
          const weak = reason.kind === "text" && !reason.similar;
          return (
            <li
              key={reason.kind}
              className={cn(
                "inline-flex min-w-0 items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs",
                weak && "text-muted-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="break-words">{reasonText(reason)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const strengthStyles = {
  strong: "border-primary/30 bg-primary/10 text-primary",
  good: "border-primary/20 bg-primary/5 text-primary",
  possible: "border-border bg-muted text-muted-foreground",
};

// The score as a word and a percentage ("Strong match · 91%").
export function MatchScore({ score }: { score: number }) {
  const t = useTranslations("Matches");
  const format = useFormatter();
  const strength = matchStrength(score);
  const percent = format.number(score, {
    style: "percent",
    maximumFractionDigits: 0,
  });

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        strengthStyles[strength],
      )}
      title={t("scoreLabel", { percent })}
    >
      {t(`strength.${strength}`)}
      <span aria-hidden>·</span>
      <span className="tabular-nums">{percent}</span>
    </span>
  );
}
