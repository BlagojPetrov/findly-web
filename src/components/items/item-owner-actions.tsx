"use client";

import {
  CircleCheck,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteItem, setItemStatus } from "@/actions/items";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Owner controls: edit, mark as resolved / reopen, delete. A hidden item
// (moderated) can only be deleted. `compact` (dashboard cards) uses small
// buttons and an icon-only delete button. After a delete the page goes to
// `redirectAfterDelete`, or is refreshed when there is none.
export function ItemOwnerActions({
  itemId,
  status,
  compact = false,
  redirectAfterDelete,
}: {
  itemId: string;
  status: "active" | "resolved" | "hidden";
  compact?: boolean;
  redirectAfterDelete?: string;
}) {
  const t = useTranslations("Items.owner");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [statusPending, startStatus] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const busy = statusPending || deletePending;
  const size = compact ? "sm" : "default";

  function formData(extra: Record<string, string> = {}) {
    const data = new FormData();
    data.set("itemId", itemId);
    for (const [key, value] of Object.entries(extra)) data.set(key, value);
    return data;
  }

  function changeStatus(next: "active" | "resolved") {
    startStatus(async () => {
      const result = await setItemStatus(formData({ status: next }));
      if (!result.ok) {
        toast.error(tErrors(result.error));
        return;
      }
      toast.success(t(next === "resolved" ? "resolvedToast" : "reopenedToast"));
      router.refresh();
    });
  }

  function confirmDelete() {
    startDelete(async () => {
      const result = await deleteItem(formData());
      if (!result.ok) {
        setConfirmOpen(false);
        toast.error(tErrors(result.error));
        return;
      }
      toast.success(t("deletedToast"));
      if (redirectAfterDelete) {
        router.replace(redirectAfterDelete);
      } else {
        setConfirmOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className={cn("flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
      {status !== "hidden" && (
        <>
          <Link
            href={`/items/${itemId}/edit`}
            aria-disabled={busy}
            // cn() resolves the base border-transparent against the outline border.
            className={cn(buttonVariants({ variant: "outline", size }))}
          >
            <Pencil aria-hidden />
            {t("edit")}
          </Link>
          <Button
            type="button"
            variant="outline"
            size={size}
            disabled={busy}
            onClick={() =>
              changeStatus(status === "resolved" ? "active" : "resolved")
            }
          >
            {statusPending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : status === "resolved" ? (
              <RotateCcw aria-hidden />
            ) : (
              <CircleCheck aria-hidden />
            )}
            {t(status === "resolved" ? "reopen" : "resolve")}
          </Button>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size={compact ? "icon-sm" : "default"}
              disabled={busy}
              aria-label={compact ? t("delete") : undefined}
              className={cn(
                "text-destructive hover:bg-destructive/10 hover:text-destructive",
                compact && "ml-auto",
              )}
            />
          }
        >
          <Trash2 aria-hidden />
          {!compact && t("delete")}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={confirmDelete}
            >
              {deletePending && (
                <LoaderCircle className="animate-spin" aria-hidden />
              )}
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
