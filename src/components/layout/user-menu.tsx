"use client";

import {
  FilePlus2,
  Heart,
  LayoutList,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { signOut } from "@/actions/auth";
import { UserAvatar } from "@/components/profile/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";

export function UserMenu({
  displayName,
  email,
  avatarPath,
  isAdmin = false,
}: {
  displayName: string;
  email: string | null;
  avatarPath: string | null;
  // Admins get a link to the admin area (§18).
  isAdmin?: boolean;
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("Header.accountMenu")}
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <UserAvatar name={displayName} avatarPath={avatarPath} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-1.5 py-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          {email && (
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem render={<Link href="/dashboard" />}>
          <LayoutList aria-hidden />
          {t("Header.dashboard")}
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/items/new" />}>
          <FilePlus2 aria-hidden />
          {t("Header.reportItem")}
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/favorites" />}>
          <Heart aria-hidden />
          {t("Header.favorites")}
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/profile" />}>
          <UserRound aria-hidden />
          {t("Header.profile")}
        </DropdownMenuLinkItem>
        {isAdmin && (
          <DropdownMenuLinkItem render={<Link href="/admin" />}>
            <ShieldCheck aria-hidden />
            {t("Header.admin")}
          </DropdownMenuLinkItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onClick={() => startTransition(() => signOut())}
        >
          <LogOut aria-hidden />
          {t("Auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
