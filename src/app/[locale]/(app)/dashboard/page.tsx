import { FilePlus2, Inbox, PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemCard } from "@/components/items/item-card";
import { ItemOwnerActions } from "@/components/items/item-owner-actions";
import { MatchList } from "@/components/matches/match-list";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnItems } from "@/lib/queries/items";
import { getUserMatches } from "@/lib/queries/matches";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Dashboard",
  });
  return { title: t("title") };
}

const statuses = ["active", "resolved", "hidden"] as const;
type Status = (typeof statuses)[number];

function parseStatus(value: string | string[] | undefined): Status {
  return statuses.find((status) => status === value) ?? "active";
}

// "My reports": the signed-in user's items, one tab per status (in the URL,
// so a tab can be linked and survives a refresh), with quick actions.
export default async function DashboardPage({
  params,
  searchParams,
}: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const status = parseStatus((await searchParams).status);
  const user = await requireUser(
    status === "active" ? "/dashboard" : `/dashboard?status=${status}`,
  );
  const [items, matches, t] = await Promise.all([
    getOwnItems(user.id),
    // A failed query shows a message instead of breaking the page.
    getUserMatches(user.id).catch((error) => {
      console.error(error);
      return null;
    }),
    getTranslations("Dashboard"),
  ]);

  const counts = Object.fromEntries(
    statuses.map((s) => [s, items.filter((item) => item.status === s).length]),
  ) as Record<Status, number>;
  // The hidden tab exists only while a moderator has hidden something.
  const tabs = statuses.filter(
    (s) => s !== "hidden" || counts.hidden > 0 || status === "hidden",
  );
  const shown = items.filter((item) => item.status === status);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        {items.length > 0 && (
          <Link href="/items/new" className={buttonVariants()}>
            <FilePlus2 aria-hidden />
            {t("reportItem")}
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <section className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <PackageSearch
            className="size-10 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mt-4 text-lg font-semibold">{t("empty.title")}</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {t("empty.description")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href={{ pathname: "/items/new", query: { type: "lost" } }}
              className={buttonVariants()}
            >
              <FilePlus2 aria-hidden />
              {t("empty.reportLost")}
            </Link>
            <Link
              href={{ pathname: "/items/new", query: { type: "found" } }}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <FilePlus2 aria-hidden />
              {t("empty.reportFound")}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <MatchList context="dashboard" matches={matches} />

          <nav
            aria-label={t("tabsLabel")}
            className="flex overflow-x-auto border-b sm:gap-1"
          >
            {tabs.map((s) => (
              <Link
                key={s}
                href={
                  s === "active"
                    ? "/dashboard"
                    : { pathname: "/dashboard", query: { status: s } }
                }
                aria-current={s === status ? "page" : undefined}
                className={cn(
                  "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-2.5 py-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3",
                  s === status
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`tabs.${s}`)}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                  {counts[s]}
                </span>
              </Link>
            ))}
          </nav>

          {status === "hidden" && shown.length > 0 && (
            <p className="text-sm text-muted-foreground">{t("hiddenHint")}</p>
          )}

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
              <Inbox className="size-8" aria-hidden />
              {t(`emptyTab.${status}`)}
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((item) => (
                <li key={item.id} className="grid">
                  <ItemCard
                    item={item}
                    actions={
                      <ItemOwnerActions
                        itemId={item.id}
                        status={item.status}
                        compact
                      />
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
