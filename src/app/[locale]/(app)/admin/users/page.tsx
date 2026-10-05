import { CircleAlert, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import type { Locale } from "next-intl";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { BanButton } from "@/components/admin/ban-button";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Pagination } from "@/components/search/pagination";
import { FormPendingMarker } from "@/components/search/pending-marker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPathname, redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { pageCount, parsePage } from "@/lib/pagination";
import {
  type AdminUser,
  getUserPage,
  USERS_PAGE_SIZE,
} from "@/lib/queries/admin";
import {
  parseUserFilters,
  USER_SEARCH_MAX_LENGTH,
  type UserListFilters,
  userListQuery,
} from "@/lib/validation/admin";
import { requestQuery } from "@/lib/validation/search";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/users">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Admin",
  });
  return { title: t("users.title") };
}

function listHref(filters: UserListFilters, page = 1) {
  const query = Object.fromEntries(
    new URLSearchParams(userListQuery(filters, page)),
  );
  return Object.keys(query).length > 0
    ? { pathname: "/admin/users" as const, query }
    : "/admin/users";
}

function Badge({
  children,
  tone = "muted",
}: {
  children: string;
  tone?: "muted" | "primary" | "destructive";
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    primary: "border-primary/30 bg-primary/10 text-primary",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// Users of the platform for the admins (§18): newest accounts first, search
// by name or email, banned only; role, ban state, counts and ban/unban.
// Admins (and the viewer) cannot be banned, so they get no button. Times
// are formatted on the server (F-30).
export default async function AdminUsersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/users">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const raw = await searchParams;
  const filters = parseUserFilters(raw);
  const page = parsePage(raw.page);
  const canonical = userListQuery(filters, page);
  const viewer = await requireAdmin(
    canonical ? `/admin/users?${canonical}` : "/admin/users",
  );
  // Empty search, unknown parameters, "page=1": one URL per list.
  if (requestQuery(raw) !== canonical) {
    redirect({ href: listHref(filters, page), locale: locale as Locale });
  }

  const [result, t, format] = await Promise.all([
    getUserPage(filters, page).catch((error) => {
      console.error(error);
      return null;
    }),
    getTranslations("Admin.users"),
    getFormatter(),
  ]);
  const totalPages = result ? pageCount(result.total, USERS_PAGE_SIZE) : 1;
  // Past the last page (e.g. after a search narrowed the list).
  if (result && page > totalPages) {
    redirect({
      href: listHref(filters, totalPages),
      locale: locale as Locale,
    });
  }
  const date = (value: string) =>
    format.dateTime(new Date(value), { dateStyle: "medium" });
  const filtered = filters.q !== "" || filters.bannedOnly;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <Form
        action={getPathname({ href: "/admin/users", locale: locale as Locale })}
        role="search"
        className="group/search flex flex-wrap items-center gap-x-4 gap-y-2"
      >
        <div className="flex min-w-0 flex-1 basis-72 gap-2">
          <Label htmlFor="user-search" className="sr-only">
            {t("searchLabel")}
          </Label>
          <Input
            id="user-search"
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder={t("searchPlaceholder")}
            maxLength={USER_SEARCH_MAX_LENGTH}
            enterKeyHint="search"
          />
          <Button
            type="submit"
            className="group-has-[[data-pending]]/search:opacity-70"
          >
            <Search aria-hidden />
            <span className="max-sm:sr-only">{t("search")}</span>
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="banned"
            value="1"
            defaultChecked={filters.bannedOnly}
            className="size-4 accent-primary"
          />
          {t("bannedOnly")}
        </label>
        <FormPendingMarker />
      </Form>

      {result === null ? (
        <p
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("error")}
        </p>
      ) : result.total === 0 ? (
        <section className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <Users className="size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            {t(filtered ? "emptyFiltered" : "empty")}
          </p>
        </section>
      ) : (
        <section aria-labelledby="users-count" className="grid gap-4">
          <h2 id="users-count" className="text-sm text-muted-foreground">
            {t("count", { count: result.total })}
          </h2>
          <ul className="grid gap-3">
            {result.users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                self={user.id === viewer.id}
                labels={{
                  admin: t("roleAdmin"),
                  banned: t("bannedBadge"),
                  you: t("you"),
                  joined: t("joined", { date: date(user.createdAt) }),
                  lastSignIn: user.lastSignInAt
                    ? t("lastSignIn", { date: date(user.lastSignInAt) })
                    : t("neverSignedIn"),
                  items: t("items", { count: user.itemCount }),
                  flags: t("openFlags", { count: user.openReportCount }),
                  noEmail: t("noEmail"),
                }}
              />
            ))}
          </ul>
          <Pagination
            page={page}
            totalPages={totalPages}
            href={(p) => listHref(filters, p)}
          />
        </section>
      )}
    </div>
  );
}

function UserRow({
  user,
  self,
  labels,
}: {
  user: AdminUser;
  self: boolean;
  labels: Record<
    | "admin"
    | "banned"
    | "you"
    | "joined"
    | "lastSignIn"
    | "items"
    | "flags"
    | "noEmail",
    string
  >;
}) {
  // admin_set_banned() refuses admins and the viewer.
  const canBan = user.role !== "admin" && !self;
  return (
    <li
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-4 [overflow-wrap:anywhere] shadow-xs"
      data-banned={user.isBanned}
    >
      <div className="flex min-w-0 flex-1 basis-64 gap-3">
        <UserAvatar
          name={user.displayName}
          avatarPath={user.avatarPath}
          className="size-10 shrink-0"
        />
        <div className="grid min-w-0 gap-0.5 text-sm">
          <p className="flex flex-wrap items-center gap-1.5 font-medium">
            {user.displayName}
            {self && <Badge>{labels.you}</Badge>}
            {user.role === "admin" && (
              <Badge tone="primary">{labels.admin}</Badge>
            )}
            {user.isBanned && <Badge tone="destructive">{labels.banned}</Badge>}
          </p>
          <p className="text-muted-foreground">
            {user.email ?? labels.noEmail}
          </p>
          <p className="text-xs text-muted-foreground">
            {labels.joined} · {labels.lastSignIn}
          </p>
          <p className="text-xs text-muted-foreground">
            {labels.items}
            {user.openReportCount > 0 && (
              <>
                {" · "}
                <span className="font-medium text-destructive">
                  {labels.flags}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      {canBan && (
        <BanButton
          userId={user.id}
          name={user.displayName}
          banned={user.isBanned}
        />
      )}
    </li>
  );
}
