"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { reportItem } from "@/actions/reports";
import { FormError } from "@/components/forms/form-error";
import { FormTextareaField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/action-result";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { cn } from "@/lib/utils";
import type { ValidationMessage } from "@/lib/validation/messages";
import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
} from "@/lib/validation/reports";

const triggerClass = cn(
  buttonVariants({ variant: "ghost", size: "sm" }),
  "justify-self-start text-muted-foreground",
);

type FormState = {
  result: ActionResult;
  // Counts submits, so the reason radios remount after each result (F-24).
  attempt: number;
  values: { reason: string; details: string };
};

// The form inside the dialog. It mounts each time the dialog opens, so an
// old error does not show again. Success closes the dialog with a toast;
// the action refreshes the page, which then shows the report as flagged.
function ReportForm({
  itemId,
  onReported,
}: {
  itemId: string;
  onReported: () => void;
}) {
  const t = useTranslations("Moderation.report");
  const tValidation = useTranslations("Validation");
  const [state, formAction, pending] = useActionState(
    async (prev: FormState | null, formData: FormData) => {
      const result = await reportItem(formData);
      if (result.ok) {
        toast.success(t("success"));
        onReported();
      }
      return {
        result,
        attempt: (prev?.attempt ?? 0) + 1,
        values: {
          reason: String(formData.get("reason") ?? ""),
          details: String(formData.get("details") ?? ""),
        },
      };
    },
    null,
  );
  const failure = state && !state.result.ok ? state.result : undefined;
  const errors = failure?.fieldErrors;

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="itemId" value={itemId} />
      <fieldset
        aria-describedby={errors?.reason ? "reason-error" : undefined}
        className="min-w-0"
      >
        <legend className="mb-2 text-sm font-medium">
          {t("reasonLegend")}
        </legend>
        <div key={state?.attempt ?? 0} className="grid gap-1.5">
          {REPORT_REASONS.map((reason) => (
            <label
              key={reason}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/5 has-checked:font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="reason"
                value={reason}
                required
                defaultChecked={state?.values.reason === reason}
                className="accent-primary"
              />
              {t(`reasons.${reason}`)}
            </label>
          ))}
        </div>
        {errors?.reason?.length ? (
          <p id="reason-error" className="mt-1.5 text-xs text-destructive">
            {tValidation(errors.reason[0] as ValidationMessage)}
          </p>
        ) : null}
      </fieldset>
      <FormTextareaField
        name="details"
        label={t("details")}
        hint={t("detailsHint")}
        rows={3}
        maxLength={REPORT_DETAILS_MAX_LENGTH}
        defaultValue={state?.values.details}
        errors={errors?.details}
      />
      <FormError failure={failure} />
      <DialogFooter>
        <DialogClose
          render={<Button type="button" variant="outline" size="lg" />}
        >
          {t("cancel")}
        </DialogClose>
        <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
      </DialogFooter>
    </form>
  );
}

// Flagging another user's report for the moderators (§18): a dialog with a
// reason and optional details. Users with an open report about the item see
// a note instead (one open report per user and item); guests get a link to
// the login page that returns to the report.
export function ReportDialog({
  itemId,
  signedIn,
  reported,
}: {
  itemId: string;
  signedIn: boolean;
  reported: boolean;
}) {
  const t = useTranslations("Moderation.report");
  const [open, setOpen] = useState(false);

  if (!signedIn) {
    return (
      <Link
        href={{ pathname: SIGN_IN_PATH, query: { next: `/items/${itemId}` } }}
        title={t("guestHint")}
        className={triggerClass}
      >
        <Flag aria-hidden />
        {t("button")}
      </Link>
    );
  }

  if (reported) {
    return (
      <p className="flex gap-2 text-sm text-muted-foreground">
        <Flag className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t("reported")}
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={triggerClass}>
        <Flag aria-hidden />
        {t("button")}
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <ReportForm itemId={itemId} onReported={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
