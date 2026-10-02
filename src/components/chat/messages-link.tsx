"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { badgeCount } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "./use-unread-messages";

// Header link to /messages with the number of unread messages, kept live
// (§16). Render it with key = user id.
export function MessagesLink({
  userId,
  initialUnread,
}: {
  userId: string;
  initialUnread: number | null;
}) {
  const t = useTranslations("Header");
  const { unread, signedOut } = useUnreadMessages({ userId, initialUnread });
  // The bell refreshes the header for the new visitor.
  if (signedOut) return null;

  const count = unread ?? 0;
  const badge = badgeCount(count);
  const label = t("messagesLabel", { count });

  return (
    <Link
      href="/messages"
      aria-label={label}
      title={label}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative",
      )}
    >
      <MessageCircle aria-hidden />
      {badge && (
        <span
          data-testid="messages-badge"
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] leading-none font-semibold text-white tabular-nums ring-2 ring-background"
          aria-hidden
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
