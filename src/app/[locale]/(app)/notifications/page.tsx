import { BellOff, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotificationList } from "@/components/notifications/notification-list";
import { Pagination } from "@/components/search/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { pageCount, parsePage } from "@/lib/pagination";
import {
  getNotificationPage,
  getUnreadNotificationCount,
  NOTIFICATIONS_PAGE_SIZE,
} from "@/lib/queries/notifications";
import { cn } from "@/lib/utils";
import { requestQuery } from "@/lib/validation/search";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/notifications">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Notifications",
  });
  return { title: t("page.title") };
}

// "?page=2" and up; page 1 has no parameter.
function pageHref(page: number) {
  return page > 1
    ? { pathname: "/notifications" as const, query: { page } }
    : "/notifications";
}

// All notifications of the signed-in user, newest first, paged. Each entry
// can be marked read/unread or deleted; all can be marked read at once.
export default async function NotificationsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const raw = await searchParams;
  const page = parsePage(raw.page);
  const canonical = page > 1 ? `page=${page}` : "";
  const user = await requireUser(
    canonical ? `/notifications?${canonical}` : "/notifications",
  );
  // Unknown parameters, "page=1", "page=abc": one URL per page.
  if (requestQuery(raw) !== canonical) {
    redirect({ href: pageHref(page), locale: locale as Locale });
  }

  const [result, unread, t, tHeader] = await Promise.all([
    // A failed query shows a message instead of breaking the page.
    getNotificationPage(user.id, page).catch((error) => {
      console.error(error);
      return null;
    }),
    getUnreadNotificationCount(user.id),
    getTranslations("Notifications"),
    getTranslations("Header"),
  ]);

  const totalPages = result
    ? pageCount(result.total, NOTIFICATIONS_PAGE_SIZE)
    : 1;
  // Past the last page (e.g. after deleting the last entry of a page).
  if (result && page > totalPages) {
    redirect({ href: pageHref(totalPages), locale: locale as Locale });
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("page.description")}
        </p>
      </div>

      {result === null ? (
        <p
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("page.error")}
        </p>
      ) : result.total === 0 ? (
        <section className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <BellOff className="size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            {t("empty")}
          </p>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
          >
            {tHeader("dashboard")}
          </Link>
        </section>
      ) : (
        <>
          <NotificationList
            views={result.views}
            unread={unread ?? result.views.filter((v) => !v.read).length}
            total={result.total}
          />
          <Pagination page={page} totalPages={totalPages} href={pageHref} />
        </>
      )}
    </div>
  );
}
