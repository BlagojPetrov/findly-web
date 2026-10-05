import { CircleAlert, EyeOff, FlagOff } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import type { ReactNode } from "react";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { Pagination } from "@/components/search/pagination";
import { Link, redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import type { QueueGroup } from "@/lib/moderation";
import { pageCount, parsePage } from "@/lib/pagination";
import {
  getHiddenItems,
  getReportQueue,
  HIDDEN_ITEMS_PAGE_SIZE,
  type HiddenItem,
  REPORT_QUEUE_MAX_REPORTS,
  REPORT_QUEUE_PAGE_SIZE,
} from "@/lib/queries/admin";
import { cn } from "@/lib/utils";
import { REPORT_REASONS } from "@/lib/validation/reports";
import { requestQuery } from "@/lib/validation/search";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/reports">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Admin",
  });
  return { title: t("reports.title") };
}

const VIEWS = ["open", "hidden"] as const;
type View = (typeof VIEWS)[number];

// "?view=hidden" for hidden reports (the open flags have no parameter),
// then "page=2" and up.
function viewHref(view: View, page = 1) {
  const query = {
    ...(view === "hidden" ? { view } : {}),
    ...(page > 1 ? { page } : {}),
  };
  return Object.keys(query).length > 0
    ? { pathname: "/admin/reports" as const, query }
    : "/admin/reports";
}

function canonicalQuery(view: View, page: number) {
  const query = new URLSearchParams();
  if (view === "hidden") query.set("view", view);
  if (page > 1) query.set("page", String(page));
  return query.toString();
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
      {label}
    </span>
  );
}

function ErrorMessage({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function EmptyState({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <section className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
      {icon}
      <p className="mt-4 max-w-md text-sm text-muted-foreground">{children}</p>
    </section>
  );
}

// Moderation queue (§18): items with open flags, the one waiting longest
// first, each with its flags (reason, details, who flagged it and when) and
// the actions; and the hidden reports, which can be restored. Times are
// formatted on the server (F-30).
export default async function AdminReportsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/reports">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const raw = await searchParams;
  const view: View = raw.view === "hidden" ? "hidden" : "open";
  const page = parsePage(raw.page);
  const canonical = canonicalQuery(view, page);
  await requireAdmin(
    canonical ? `/admin/reports?${canonical}` : "/admin/reports",
  );
  // Unknown parameters, "view=open", "page=1": one URL per page.
  if (requestQuery(raw) !== canonical) {
    redirect({ href: viewHref(view, page), locale: locale as Locale });
  }

  const [t, tItems, tReasons, format] = await Promise.all([
    getTranslations("Admin.reports"),
    getTranslations("Items"),
    getTranslations("Moderation.report.reasons"),
    getFormatter(),
  ]);
  const reasons = Object.fromEntries(
    REPORT_REASONS.map((reason) => [reason, tReasons(reason)]),
  );
  const dateTime = (value: string) =>
    format.dateTime(new Date(value), {
      dateStyle: "medium",
      timeStyle: "short",
    });

  let content: ReactNode;
  if (view === "open") {
    const queue = await getReportQueue(page).catch((error) => {
      console.error(error);
      return null;
    });
    const totalPages = queue
      ? pageCount(queue.total, REPORT_QUEUE_PAGE_SIZE)
      : 1;
    // Past the last page (e.g. after handling the last item of a page).
    if (queue && page > totalPages) {
      redirect({ href: viewHref(view, totalPages), locale: locale as Locale });
    }
    content =
      queue === null ? (
        <ErrorMessage>{t("error")}</ErrorMessage>
      ) : queue.total === 0 ? (
        <EmptyState
          icon={
            <FlagOff className="size-10 text-muted-foreground" aria-hidden />
          }
        >
          {t("open.empty")}
        </EmptyState>
      ) : (
        <section aria-labelledby="queue-count" className="grid gap-4">
          <h2 id="queue-count" className="text-sm text-muted-foreground">
            {t("open.count", { items: queue.total, reports: queue.reports })}
          </h2>
          {queue.truncated && (
            <p className="text-sm text-muted-foreground">
              {t("open.truncated", { count: REPORT_QUEUE_MAX_REPORTS })}
            </p>
          )}
          <ul className="grid gap-4">
            {queue.groups.map((group) => (
              <QueueEntry
                key={group.item.id}
                group={group}
                dateTime={dateTime}
                labels={{
                  status: tItems(`status.${group.item.status}`),
                  owner: t("owner", { name: group.item.owner.displayName }),
                  flags: t("open.flags", { count: group.reports.length }),
                  reasons,
                  flaggedBy: (name: string, time: string) =>
                    t("open.flaggedBy", { name, time }),
                }}
              />
            ))}
          </ul>
          <Pagination
            page={page}
            totalPages={totalPages}
            href={(p) => viewHref(view, p)}
          />
        </section>
      );
  } else {
    const hidden = await getHiddenItems(page).catch((error) => {
      console.error(error);
      return null;
    });
    const totalPages = hidden
      ? pageCount(hidden.total, HIDDEN_ITEMS_PAGE_SIZE)
      : 1;
    if (hidden && page > totalPages) {
      redirect({ href: viewHref(view, totalPages), locale: locale as Locale });
    }
    content =
      hidden === null ? (
        <ErrorMessage>{t("error")}</ErrorMessage>
      ) : hidden.total === 0 ? (
        <EmptyState
          icon={
            <EyeOff className="size-10 text-muted-foreground" aria-hidden />
          }
        >
          {t("hidden.empty")}
        </EmptyState>
      ) : (
        <section aria-labelledby="hidden-count" className="grid gap-4">
          <h2 id="hidden-count" className="text-sm text-muted-foreground">
            {t("hidden.count", { count: hidden.total })}
          </h2>
          <ul className="grid gap-3">
            {hidden.items.map((item) => (
              <HiddenEntry
                key={item.id}
                item={item}
                owner={t("owner", { name: item.owner.displayName })}
                changed={t("hidden.changed", {
                  time: dateTime(item.updatedAt),
                })}
                restoresAs={t(
                  item.resolvedAt
                    ? "hidden.restoresResolved"
                    : "hidden.restoresActive",
                )}
              />
            ))}
          </ul>
          <Pagination
            page={page}
            totalPages={totalPages}
            href={(p) => viewHref(view, p)}
          />
        </section>
      );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <nav aria-label={t("views.label")} className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={viewHref(v)}
            aria-current={v === view ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              v === view && "border-primary bg-primary/10 text-foreground",
            )}
          >
            {t(`views.${v}`)}
          </Link>
        ))}
      </nav>

      {content}
    </div>
  );
}

// One item of the queue with its open flags and the actions.
function QueueEntry({
  group: { item, reports },
  dateTime,
  labels,
}: {
  group: QueueGroup;
  dateTime: (value: string) => string;
  labels: {
    status: string;
    owner: string;
    flags: string;
    reasons: Record<string, string>;
    flaggedBy: (name: string, time: string) => string;
  };
}) {
  const headingId = `queue-item-${item.id}`;
  return (
    <li>
      <article
        aria-labelledby={headingId}
        className="grid gap-4 rounded-xl border bg-card p-4 [overflow-wrap:anywhere] shadow-xs sm:p-5"
      >
        <header className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ItemTypeBadge type={item.type} />
            {item.status !== "active" && <StatusBadge label={labels.status} />}
            <span className="ml-auto text-xs font-medium text-destructive">
              {labels.flags}
            </span>
          </div>
          <h3 id={headingId} className="font-semibold">
            <Link
              href={`/items/${item.id}`}
              className="underline-offset-4 hover:underline"
            >
              {item.title}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">{labels.owner}</p>
        </header>

        <ul className="grid gap-2">
          {reports.map((report) => (
            <li
              key={report.id}
              className="grid gap-1 rounded-lg border bg-muted/40 p-3 text-sm"
            >
              <p className="font-medium">{labels.reasons[report.reason]}</p>
              {report.details && (
                <p className="whitespace-pre-line">{report.details}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {labels.flaggedBy(
                  report.reporter.displayName,
                  dateTime(report.createdAt),
                )}
              </p>
            </li>
          ))}
        </ul>

        <ModerationActions
          itemId={item.id}
          hidden={item.status === "hidden"}
          reportIds={reports.map((report) => report.id)}
        />
      </article>
    </li>
  );
}

// One hidden report with the restore button.
function HiddenEntry({
  item,
  owner,
  changed,
  restoresAs,
}: {
  item: HiddenItem;
  owner: string;
  changed: string;
  restoresAs: string;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-4 [overflow-wrap:anywhere] shadow-xs">
      <div className="grid min-w-0 flex-1 basis-64 gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <ItemTypeBadge type={item.type} className="shrink-0" />
          <Link
            href={`/items/${item.id}`}
            className="truncate font-semibold underline-offset-4 hover:underline"
          >
            {item.title}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{owner}</p>
        <p className="text-xs text-muted-foreground">
          {changed} · {restoresAs}
        </p>
      </div>
      <ModerationActions itemId={item.id} hidden />
    </li>
  );
}
