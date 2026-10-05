import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { type AdminStats, getAdminStats } from "@/lib/queries/admin";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Admin",
  });
  return { title: t("dashboard.title") };
}

type Stat = { key: string; value: number };

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="grid content-start gap-1 rounded-xl border bg-card p-4 shadow-xs">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
      {detail && <dd className="text-xs text-muted-foreground">{detail}</dd>}
    </div>
  );
}

// Groups of tiles; the numbers come from admin_stats() (§18).
function groups(stats: AdminStats) {
  return [
    {
      key: "people",
      stats: [
        { key: "users", value: stats.users },
        { key: "bannedUsers", value: stats.banned_users },
      ],
    },
    {
      key: "items",
      stats: [
        { key: "activeLost", value: stats.active_lost_items },
        { key: "activeFound", value: stats.active_found_items },
        { key: "hiddenItems", value: stats.hidden_items },
      ],
    },
    {
      key: "matching",
      stats: [
        { key: "matches", value: stats.matches },
        { key: "confirmedMatches", value: stats.confirmed_matches },
      ],
    },
    {
      key: "moderation",
      stats: [
        { key: "openReports", value: stats.open_reports },
        { key: "reportedItems", value: stats.reported_items },
      ],
    },
  ] as const satisfies { key: string; stats: Stat[] }[];
}

// Admin dashboard: site-wide counts. A failed query shows a message instead
// of breaking the page.
export default async function AdminDashboardPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireAdmin("/admin");
  const [stats, t, format] = await Promise.all([
    getAdminStats().catch((error) => {
      console.error(error);
      return null;
    }),
    getTranslations("Admin.dashboard"),
    getFormatter(),
  ]);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {stats ? (
        groups(stats).map((group) => (
          <section
            key={group.key}
            aria-labelledby={`stats-${group.key}`}
            className="grid gap-3"
          >
            <h2
              id={`stats-${group.key}`}
              className="text-sm font-semibold text-muted-foreground"
            >
              {t(`groups.${group.key}`)}
            </h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.stats.map((stat) => (
                <StatTile
                  key={stat.key}
                  label={t(`stats.${stat.key}.label`)}
                  value={format.number(stat.value)}
                  detail={t(`stats.${stat.key}.detail`)}
                />
              ))}
            </dl>
          </section>
        ))
      ) : (
        <p
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("error")}
        </p>
      )}
    </div>
  );
}
