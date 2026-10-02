"use client";

import { Bell, Check, Link2, Mail, MessageCircle, Trash2 } from "lucide-react";
import { useNow, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { elapsedSince } from "@/lib/dates";
import { notificationHref, type NotificationView } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const icons = { match: Link2, message: MessageCircle, moderation: Bell };

// One notification in the header panel. The text comes from the type and
// the reports it refers to; a report or match that is gone (or no longer
// visible) is described instead of linked.
export function NotificationEntry({
  view,
  onOpen,
  onSetRead,
  onDelete,
}: {
  view: NotificationView;
  // Following the link (closes the panel, marks it read).
  onOpen: () => void;
  onSetRead: (read: boolean) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("Notifications");
  const now = useNow({ updateInterval: 60_000 });
  const href = notificationHref(view);
  const Icon = icons[view.type];
  const title = t(`${view.type}.title`);
  const createdAt = new Date(view.createdAt);
  const elapsed = elapsedSince(createdAt, now);
  const time =
    elapsed.unit === "now"
      ? t("time.now")
      : elapsed.unit === "date"
        ? t("time.date", elapsed)
        : t(`time.${elapsed.unit}`, { count: elapsed.count });

  const details: ReactNode[] = [];
  if (view.type === "match") {
    details.push(
      view.item
        ? t("match.own", { title: view.item.title })
        : t("match.itemUnavailable"),
    );
    if (view.otherItem) {
      details.push(
        <span className="flex min-w-0 items-center gap-1.5">
          <ItemTypeBadge
            type={view.otherItem.type}
            className="shrink-0 px-1.5 py-0 text-[0.7rem]"
          />
          <span className="truncate">{view.otherItem.title}</span>
        </span>,
      );
      if (view.matchStatus === null) {
        details.push(t("match.matchUnavailable"));
      } else if (view.matchStatus !== "suggested") {
        details.push(t(`match.status.${view.matchStatus}`));
      }
    } else {
      details.push(t("match.otherUnavailable"));
    }
  } else {
    if (view.type === "message" && view.sender) {
      details.push(t("message.from", { name: view.sender.displayName }));
    }
    if (view.item) {
      details.push(t("other.item", { title: view.item.title }));
    }
  }

  return (
    <li
      className={cn(
        "relative flex gap-3 px-4 py-3 transition-colors has-[a:hover]:bg-muted/60",
        !view.read && "bg-primary/5",
      )}
      data-read={view.read}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          view.read
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary",
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5 text-sm">
        <p className="flex items-center gap-2 font-medium">
          {href ? (
            <Link
              href={href}
              onClick={onOpen}
              className="outline-none after:absolute after:inset-0 focus-visible:underline"
            >
              {title}
            </Link>
          ) : (
            title
          )}
          {!view.read && (
            <span className="size-2 shrink-0 rounded-full bg-primary">
              <span className="sr-only">{t("unread")}</span>
            </span>
          )}
        </p>
        {details.map((detail, index) => (
          <p
            key={index}
            className="line-clamp-2 min-w-0 break-words text-muted-foreground"
          >
            {detail}
          </p>
        ))}
        <p className="text-xs text-muted-foreground">
          <time dateTime={view.createdAt}>{time}</time>
        </p>
      </div>
      {/* Above the stretched link. */}
      <div className="relative z-10 flex shrink-0 items-start gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t(view.read ? "markUnread" : "markRead")}
          title={t(view.read ? "markUnread" : "markRead")}
          onClick={() => onSetRead(!view.read)}
        >
          {view.read ? <Mail aria-hidden /> : <Check aria-hidden />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("delete")}
          title={t("delete")}
          onClick={onDelete}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
}
