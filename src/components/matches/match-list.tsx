import { CircleAlert, SearchCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { MatchCard } from "@/components/matches/match-card";
import type { MatchView } from "@/lib/matches";
import type { MatchItem } from "@/lib/queries/matches";
import { cn } from "@/lib/utils";

type Matches = {
  suggested: MatchView<MatchItem>[];
  confirmed: MatchView<MatchItem>[];
  dismissed?: MatchView<MatchItem>[];
};

function Cards({
  matches,
  showOwnItem,
  columns,
}: {
  matches: MatchView<MatchItem>[];
  showOwnItem: boolean;
  columns: boolean;
}) {
  return (
    <ul className={cn("grid gap-3", columns && "lg:grid-cols-2")}>
      {matches.map((match) => (
        <li key={match.id} className="grid">
          <MatchCard match={match} showOwnItem={showOwnItem} />
        </li>
      ))}
    </ul>
  );
}

// "Possible matches" on the item page (one report, owner only) or the
// dashboard (all the user's reports): confirmed matches, the suggested ones
// best first, and on the item page the dismissed ones behind a disclosure.
// `matches` is null when they could not be loaded; `inactive` (a resolved
// report) replaces the empty state with a note that matching has stopped.
export function MatchList({
  context,
  matches,
  inactive = false,
}: {
  context: "item" | "dashboard";
  matches: Matches | null;
  inactive?: boolean;
}) {
  const t = useTranslations("Matches");
  const dashboard = context === "dashboard";
  const confirmed = matches?.confirmed ?? [];
  const suggested = matches?.suggested ?? [];
  const dismissed = matches?.dismissed ?? [];
  const titleId = `matches-${context}`;

  return (
    <section aria-labelledby={titleId} className="grid gap-4">
      <div>
        <h2
          id={titleId}
          className="flex items-center gap-2 text-lg font-semibold"
        >
          {t("title")}
          {suggested.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary tabular-nums">
              {suggested.length}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(dashboard ? "dashboardDescription" : "itemDescription")}
        </p>
      </div>

      {matches === null ? (
        <p className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("error")}
        </p>
      ) : (
        <>
          {confirmed.length > 0 && (
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">{t("confirmedTitle")}</h3>
              <Cards
                matches={confirmed}
                showOwnItem={dashboard}
                columns={dashboard}
              />
            </div>
          )}

          {suggested.length > 0 ? (
            <div className="grid gap-2">
              {confirmed.length > 0 && (
                <h3 className="text-sm font-semibold">{t("suggestedTitle")}</h3>
              )}
              <Cards
                matches={suggested}
                showOwnItem={dashboard}
                columns={dashboard}
              />
            </div>
          ) : (
            (!inactive || confirmed.length === 0) && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
                <SearchCheck className="size-8" aria-hidden />
                {inactive
                  ? t("resolvedNote")
                  : t(dashboard ? "empty.dashboard" : "empty.item")}
              </div>
            )
          )}

          {dismissed.length > 0 && (
            <details className="group grid gap-2">
              <summary className="w-fit cursor-pointer rounded-sm text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
                {t("dismissedTitle", { count: dismissed.length })}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("dismissedHint")}
              </p>
              <div className="mt-2">
                <Cards
                  matches={dismissed}
                  showOwnItem={false}
                  columns={false}
                />
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
