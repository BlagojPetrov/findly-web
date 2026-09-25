import { SearchCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const [t, user] = await Promise.all([
    getTranslations("Header"),
    getCurrentUser(),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <SearchCheck className="size-5 text-primary" aria-hidden />
          Findly
        </Link>
        <div className="flex items-center gap-2">
          <Suspense>
            <LocaleSwitcher />
          </Suspense>
          {user ? (
            <UserMenu
              displayName={user.profile.display_name}
              email={user.email}
              avatarPath={user.profile.avatar_path}
            />
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
