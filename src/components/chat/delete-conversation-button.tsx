"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { hideConversation } from "@/actions/messages";
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
import { MESSAGES_READ_EVENT, noteMessagesChanged } from "@/lib/chat";

// Removes a conversation from the user's own list after a confirmation
// (§16). The row disappears at once: while the action runs this renders a
// [data-removed] marker that the row hides itself with
// (has-[[data-removed]]:hidden); the action's refresh() then brings the list
// without it. A failure ends the optimistic state, so the row comes back.
export function DeleteConversationButton({
  conversationId,
  otherName,
}: {
  conversationId: string;
  otherName: string;
}) {
  const t = useTranslations("Messages.list.delete");
  const tErrors = useTranslations("Errors");
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useOptimistic(false);
  const [, startTransition] = useTransition();

  function confirm() {
    setOpen(false);
    startTransition(async () => {
      setRemoved(true);
      const data = new FormData();
      data.set("conversationId", conversationId);
      let result: Awaited<ReturnType<typeof hideConversation>>;
      try {
        result = await hideConversation(data);
      } catch (error) {
        console.error(error);
        result = { ok: false, error: "unknown" };
      }
      if (!result.ok) {
        toast.error(tErrors(result.error));
        return;
      }
      // Its unread messages are now read: the header's counts reload.
      noteMessagesChanged();
      window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
      toast.success(t("done"));
    });
  }

  return (
    <>
      {removed && <span data-removed hidden />}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("label", { name: otherName })}
              className="relative shrink-0 self-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            />
          }
        >
          <Trash2 aria-hidden />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("description", { name: otherName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirm}>
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
