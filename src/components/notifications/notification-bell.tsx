"use client";

import { Bell, BellOff, LoaderCircle, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { NotificationEntry } from "@/components/notifications/notification-entry";
import { useNotifications } from "@/components/notifications/use-notifications";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/action-result";
import { badgeCount } from "@/lib/notifications";
import { cn } from "@/lib/utils";

// Header bell of a signed-in user: unread badge, a panel with the recent
// notifications and live updates (§15). Render it with key = user id.
export function NotificationBell({
  userId,
  initialUnread,
}: {
  userId: string;
  initialUnread: number | null;
}) {
  const t = useTranslations("Notifications");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { unread, list, live, signedOut, loadList, setRead, remove } =
    useNotifications({
      userId,
      initialUnread,
      onNew: (count) =>
        toast(t("toast", { count }), {
          action: { label: t("show"), onClick: () => changeOpen(true) },
        }),
    });

  // The session changed in this browser: render the header again for the
  // current visitor.
  useEffect(() => {
    if (signedOut) router.refresh();
  }, [signedOut, router]);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) loadList();
  }

  async function run(action: Promise<ActionResult>) {
    const result = await action;
    if (!result.ok) toast.error(tErrors(result.error));
  }

  if (signedOut) return null;

  const count = unread ?? 0;
  const badge = badgeCount(count);

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        aria-label={t("label", { count })}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative",
        )}
      >
        <Bell aria-hidden />
        {badge && (
          <span
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] leading-none font-semibold text-white tabular-nums ring-2 ring-background"
            aria-hidden
          >
            {badge}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <PopoverTitle className="text-base font-semibold">
            {t("title")}
          </PopoverTitle>
          <span className="text-xs text-muted-foreground">
            {t("unreadSummary", { count })}
          </span>
        </div>
        {live === "reconnecting" && (
          <p
            role="status"
            className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2 text-xs text-muted-foreground"
          >
            <WifiOff className="size-3.5 shrink-0" aria-hidden />
            {t("reconnecting")}
          </p>
        )}
        <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
          {list.status === "ready" ? (
            list.views.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-8 text-center text-sm text-muted-foreground">
                <BellOff className="size-6" aria-hidden />
                {t("empty")}
              </div>
            ) : (
              <ul className="divide-y">
                {list.views.map((view) => (
                  <NotificationEntry
                    key={view.id}
                    view={view}
                    onOpen={() => {
                      setOpen(false);
                      if (!view.read) void run(setRead(view, true));
                    }}
                    onSetRead={(read) => void run(setRead(view, read))}
                    onDelete={() => void run(remove(view))}
                  />
                ))}
              </ul>
            )
          ) : list.status === "error" ? (
            <div className="grid justify-items-start gap-2 p-4 text-sm">
              <p role="alert" className="text-destructive">
                {t("error")}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={loadList}
              >
                {t("retry")}
              </Button>
            </div>
          ) : (
            <p
              role="status"
              className="flex items-center gap-2 p-4 text-sm text-muted-foreground"
            >
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              {t("loading")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
