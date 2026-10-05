"use client";

import { CircleCheck, EyeOff, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { closeReports, hideItem, restoreItem } from "@/actions/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

type Pending = "hide" | "restore" | "resolved" | "dismissed" | null;

// Moderation buttons for one report. With flags (the queue): a visible
// report can be hidden (after a confirmation; its flags are resolved) or
// its flags dismissed; for a report that is already hidden the flags are
// resolved or dismissed. Without flags (hidden reports): restore. Only the
// flags shown are closed. The actions refresh the page on success.
export function ModerationActions({
  itemId,
  hidden,
  reportIds = [],
}: {
  itemId: string;
  hidden: boolean;
  reportIds?: string[];
}) {
  const t = useTranslations("Admin.moderation");
  const tErrors = useTranslations("Errors");
  const [pending, setPending] = useState<Pending>(null);
  const [, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const busy = pending !== null;
  const count = reportIds.length;

  function run(
    kind: Exclude<Pending, null>,
    action: (data: FormData) => Promise<ActionResult>,
    extra: Record<string, string> = {},
  ) {
    const data = new FormData();
    data.set("itemId", itemId);
    for (const id of reportIds) data.append("reportIds", id);
    for (const [key, value] of Object.entries(extra)) data.set(key, value);
    setPending(kind);
    startTransition(async () => {
      const result = await action(data);
      setPending(null);
      setConfirmOpen(false);
      if (!result.ok) {
        toast.error(tErrors(result.error));
        return;
      }
      toast.success(
        kind === "hide" || kind === "restore"
          ? t(`${kind}Toast`)
          : t(`${kind}Toast`, { count }),
      );
    });
  }

  const spinner = <LoaderCircle className="animate-spin" aria-hidden />;

  if (count === 0) {
    return hidden ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => run("restore", restoreItem)}
      >
        {pending === "restore" ? spinner : <RotateCcw aria-hidden />}
        {t("restore")}
      </Button>
    ) : null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {hidden ? (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => run("resolved", closeReports, { outcome: "resolved" })}
        >
          {pending === "resolved" ? spinner : <CircleCheck aria-hidden />}
          {t("resolve", { count })}
        </Button>
      ) : (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
              />
            }
          >
            <EyeOff aria-hidden />
            {t("hide")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("hideTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("hideDescription", { count })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>
                {t("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={busy}
                onClick={() => run("hide", hideItem)}
              >
                {pending === "hide" && spinner}
                {t("confirmHide")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => run("dismissed", closeReports, { outcome: "dismissed" })}
      >
        {pending === "dismissed" ? spinner : <X aria-hidden />}
        {t("dismiss", { count })}
      </Button>
    </div>
  );
}
