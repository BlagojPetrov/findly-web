import { Map as MapIcon } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { MessagesLink } from "@/components/chat/messages-link";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadMessageCount } from "@/lib/queries/conversations";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";
import { cn } from "@/lib/utils";
import logo from "../../../public/brand/findly-icon.png";

export async function SiteHeader() {
  const [t, user] = await Promise.all([
    getTranslations("Header"),
    getCurrentUser(),
  ]);
  const [unread, unreadMessages] = user
    ? await Promise.all([
        getUnreadNotificationCount(user.id),
        getUnreadMessageCount(user.id),
      ])
    : [null, null];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          {/* The Android app's launcher icon; the name next to it is the link text. */}
          <Image src={logo} alt="" width={28} height={28} className="size-7" />
          Findly
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/map"
            className={cn(buttonVariants({ variant: "ghost" }), "px-2")}
          >
            <MapIcon aria-hidden />
            <span className="max-sm:sr-only">{t("map")}</span>
          </Link>
          <Suspense>
            <LocaleSwitcher />
          </Suspense>
          {user ? (
            <>
              {/* A new key per account: no state or subscription of the
                  previous user survives an account switch. */}
              <MessagesLink
                key={`messages-${user.id}`}
                userId={user.id}
                initialUnread={unreadMessages}
              />
              <NotificationBell
                key={user.id}
                userId={user.id}
                initialUnread={unread}
              />
              <UserMenu
                displayName={user.profile.display_name}
                email={user.email}
                avatarPath={user.profile.avatar_path}
                isAdmin={user.profile.role === "admin"}
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost" })}
              >
                {t("signIn")}
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants(), "hidden sm:inline-flex")}
              >
                {t("register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
