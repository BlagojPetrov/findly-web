import { useNow, useTranslations } from "next-intl";
import { ConversationTime } from "@/components/chat/conversation-time";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Link } from "@/i18n/navigation";
import type { ConversationSummary } from "@/lib/conversations";
import { badgeCount } from "@/lib/notifications";
import { cn } from "@/lib/utils";

// The user's conversations, newest activity first (the order of
// my_conversations()). Each row links to the chat. A Server Component: only
// the relative times are client components (ConversationTime), which start
// from the server's time and then follow the browser's clock.
export function ConversationList({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  const t = useTranslations("Messages.list");
  // Server Components cannot update over time (no `updateInterval`).
  const serverNow = useNow().toISOString();

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
      {conversations.map((conversation) => {
        const unread = conversation.unreadCount > 0;
        const badge = badgeCount(conversation.unreadCount);
        const { item, lastMessage } = conversation;
        return (
          <li
            key={conversation.id}
            data-unread={unread}
            className={cn(
              "relative transition-colors has-[a:hover]:bg-muted/60",
              unread && "bg-primary/5",
            )}
          >
            <div className="flex gap-3 px-4 py-3">
              <UserAvatar
                name={conversation.other.displayName}
                avatarPath={conversation.other.avatarPath}
                className="size-10 shrink-0"
              />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/messages/${conversation.id}`}
                    className={cn(
                      "min-w-0 truncate outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset",
                      unread ? "font-semibold" : "font-medium",
                    )}
                  >
                    {conversation.other.displayName}
                  </Link>
                  <ConversationTime
                    dateTime={conversation.activityAt}
                    serverNow={serverNow}
                    className={cn(
                      "shrink-0 text-xs",
                      unread
                        ? "font-medium text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                </div>
                <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {item ? (
                    <>
                      <ItemTypeBadge
                        type={item.type}
                        className="shrink-0 px-1.5 py-0 text-[0.7rem]"
                      />
                      <span className="truncate">{item.title}</span>
                      {conversation.isOwner && (
                        <span className="shrink-0">· {t("ownReport")}</span>
                      )}
                    </>
                  ) : (
                    <span className="truncate italic">
                      {t("itemUnavailable")}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={cn(
                      "min-w-0 truncate text-sm",
                      unread ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {lastMessage
                      ? lastMessage.fromMe
                        ? t("you", { text: lastMessage.preview })
                        : lastMessage.preview
                      : t("noMessages")}
                  </p>
                  {badge && (
                    <span
                      data-testid="conversation-unread"
                      className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs leading-none font-semibold text-primary-foreground tabular-nums"
                    >
                      <span aria-hidden>{badge}</span>
                      <span className="sr-only">
                        {t("unread", { count: conversation.unreadCount })}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
