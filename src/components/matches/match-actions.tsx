"use client";

import { Check, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { setMatchStatus } from "@/actions/matches";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { MatchStatus } from "@/lib/matches";

// Confirm or dismiss a suggested match; put a confirmed or dismissed one
// back among the suggestions. Dismissing offers "Undo" in its toast. The
// page is refreshed after every change, so the match moves to its new list.
export function MatchActions({
  matchId,
  status,
}: {
  matchId: string;
  status: MatchStatus;
}) {
  const t = useTranslations("Matches");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<MatchStatus | null>(null);

  async function update(next: MatchStatus) {
    const data = new FormData();
    data.set("matchId", matchId);
    data.set("status", next);
    const result = await setMatchStatus(data);
    if (!result.ok) {
      toast.error(tErrors(result.error));
      return false;
    }
    router.refresh();
    return true;
  }

  function change(next: MatchStatus) {
    setTarget(next);
    startTransition(async () => {
      if (!(await update(next))) return;
      if (next === "dismissed") {
        // Twice the default time: long enough to notice and undo it
        // after the page has refreshed.
        toast.success(t("toasts.dismissed"), {
          duration: 8000,
          action: {
            label: t("actions.undo"),
            onClick: () => {
              void update("suggested").then(
                (done) => done && toast.success(t("toasts.restored")),
              );
            },
          },
        });
      } else {
        toast.success(
          t(next === "confirmed" ? "toasts.confirmed" : "toasts.restored"),
        );
      }
    });
  }

  const spinner = <LoaderCircle className="animate-spin" aria-hidden />;
  const icon = (next: MatchStatus, idle: ReactNode) =>
    pending && target === next ? spinner : idle;

  if (status === "suggested") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => change("confirmed")}
        >
          {icon("confirmed", <Check aria-hidden />)}
          {t("actions.confirm")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => change("dismissed")}
        >
          {icon("dismissed", <X aria-hidden />)}
          {t("actions.dismiss")}
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={status === "confirmed" ? "ghost" : "outline"}
      disabled={pending}
      onClick={() => change("suggested")}
    >
      {icon("suggested", <RotateCcw aria-hidden />)}
      {t(status === "confirmed" ? "actions.undo" : "actions.restore")}
    </Button>
  );
}
