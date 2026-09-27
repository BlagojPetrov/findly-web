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

// Owner controls on the item page: edit, mark as resolved / reopen, delete.
// A hidden item (moderated) can only be deleted.
export function ItemOwnerActions({
  itemId,
  status,
}: {
  itemId: string;
  status: "active" | "resolved" | "hidden";
}) {
  const t = useTranslations("Items.owner");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [statusPending, startStatus] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const busy = statusPending || deletePending;

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
      // Becomes the dashboard in P3.S8.
      router.replace("/");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "hidden" && (
        <>
          <Link
            href={`/items/${itemId}/edit`}
            aria-disabled={busy}
            className={buttonVariants({ variant: "outline" })}
          >
            <Pencil aria-hidden />
            {t("edit")}
          </Link>
          <Button
            type="button"
            variant="outline"
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
              disabled={busy}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            />
          }
        >
          <Trash2 aria-hidden />
          {t("delete")}
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
