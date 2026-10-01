"use client";

import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteNotification,
  markAllNotificationsRead,
  setNotificationRead,
} from "@/actions/notifications";
import { NotificationEntry } from "@/components/notifications/notification-entry";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/action-result";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  NOTIFICATIONS_RECEIVED_EVENT,
  type NotificationView,
} from "@/lib/notifications";

type Change =
  | { kind: "read"; id: string; read: boolean }
  | { kind: "delete"; id: string }
  | { kind: "allRead" };

type State = { views: NotificationView[]; unread: number };

function applyChange(state: State, change: Change): State {
  switch (change.kind) {
    case "read": {
      const view = state.views.find((v) => v.id === change.id);
      if (!view || view.read === change.read) return state;
      return {
        views: state.views.map((v) =>
          v.id === change.id ? { ...v, read: change.read } : v,
        ),
        unread: Math.max(0, state.unread + (change.read ? -1 : 1)),
      };
    }
    case "delete": {
      const view = state.views.find((v) => v.id === change.id);
      if (!view) return state;
      return {
        views: state.views.filter((v) => v.id !== change.id),
        unread: view.read ? state.unread : Math.max(0, state.unread - 1),
      };
    }
    case "allRead":
      return {
        views: state.views.map((v) => ({ ...v, read: true })),
        unread: 0,
      };
  }
}

// One page of /notifications with its actions. Changes show at once
// (useOptimistic); the actions' refresh() brings the server's page, and a
// failed action simply ends the optimistic state. New notifications that the
// header bell receives refresh the page.
export function NotificationList({
  views,
  unread,
  total,
}: {
  views: NotificationView[];
  unread: number;
  total: number;
}) {
  const t = useTranslations("Notifications");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [state, apply] = useOptimistic({ views, unread }, applyChange);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onReceived = () => router.refresh();
    window.addEventListener(NOTIFICATIONS_RECEIVED_EVENT, onReceived);
    return () =>
      window.removeEventListener(NOTIFICATIONS_RECEIVED_EVENT, onReceived);
  }, [router]);

  function run<T>(
    change: Change,
    action: () => Promise<ActionResult<T>>,
    onSuccess?: (data: T) => void,
  ) {
    startTransition(async () => {
      apply(change);
      const result = await action();
      // The bell reloads its count and list (deletes have no Realtime event).
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      if (!result.ok) {
        toast.error(tErrors(result.error));
        return;
      }
      onSuccess?.(result.data);
    });
  }

  function setRead(view: NotificationView, read: boolean) {
    const data = new FormData();
    data.set("notificationId", view.id);
    data.set("read", String(read));
    run({ kind: "read", id: view.id, read }, () => setNotificationRead(data));
  }

  function remove(view: NotificationView) {
    const data = new FormData();
    data.set("notificationId", view.id);
    run({ kind: "delete", id: view.id }, () => deleteNotification(data));
  }

  function markAllRead() {
    run({ kind: "allRead" }, markAllNotificationsRead, ({ count }) =>
      toast.success(t("page.markedAllRead", { count })),
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("page.summary", { total, unread: state.unread })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={state.unread === 0 || pending}
          onClick={markAllRead}
        >
          <CheckCheck aria-hidden />
          {t("page.markAllRead")}
        </Button>
      </div>
      <ul
        aria-label={t("page.listLabel")}
        className="divide-y overflow-hidden rounded-xl border bg-card"
      >
        {state.views.map((view) => (
          <NotificationEntry
            key={view.id}
            view={view}
            onOpen={() => {
              if (!view.read) setRead(view, true);
            }}
            onSetRead={(read) => setRead(view, read)}
            onDelete={() => remove(view)}
          />
        ))}
      </ul>
    </div>
  );
}
