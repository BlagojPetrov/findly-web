"use client";

import { Ban, LoaderCircle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setUserBanned } from "@/actions/admin";
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

// Bans a user (after a confirmation) or lifts the ban. The action refreshes
// the page on success, so the row shows the new state.
export function BanButton({
  userId,
  name,
  banned,
}: {
  userId: string;
  name: string;
  banned: boolean;
}) {
  const t = useTranslations("Admin.users");
  const tErrors = useTranslations("Errors");
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function submit(next: boolean) {
    const data = new FormData();
    data.set("userId", userId);
    data.set("banned", String(next));
    startTransition(async () => {
      const result = await setUserBanned(data);
      setConfirmOpen(false);
      if (!result.ok) {
        toast.error(tErrors(result.error));
        return;
      }
      toast.success(t(next ? "bannedToast" : "unbannedToast", { name }));
    });
  }

  const spinner = <LoaderCircle className="animate-spin" aria-hidden />;

  if (banned) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => submit(false)}
      >
        {pending ? spinner : <ShieldCheck aria-hidden />}
        {t("unban")}
      </Button>
    );
  }

  return (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Ban aria-hidden />
        {t("ban")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("banTitle", { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("banDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() => submit(true)}
          >
            {pending && spinner}
            {t("confirmBan")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
