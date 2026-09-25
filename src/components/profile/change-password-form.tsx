"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { toast } from "sonner";
import { resetPassword } from "@/actions/auth";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

// Same action as the password reset page: sets the new password for the
// signed-in user and signs out their other sessions. The current password is
// not asked for, because Supabase lets any session change the password, so
// asking for it here would add no security (see P2.S6 design note).
export function ChangePasswordForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations();
  // Passwords are never refilled; the form is cleared after every submit.
  const [result, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => {
      const result = await resetPassword(formData);
      if (result.ok) {
        toast.success(t("Profile.passwordChanged"));
        onDone();
      }
      return result;
    },
    null,
  );
  const failure = result && !result.ok ? result : undefined;

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormError failure={failure} />
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <FormField
          name="password"
          type="password"
          label={t("Auth.newPassword")}
          hint={t("Auth.passwordHint")}
          autoComplete="new-password"
          autoFocus
          required
          className="h-9"
          errors={failure?.fieldErrors?.password}
        />
        <FormField
          name="confirmPassword"
          type="password"
          label={t("Auth.confirmNewPassword")}
          autoComplete="new-password"
          required
          className="h-9"
          errors={failure?.fieldErrors?.confirmPassword}
        />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {t("Profile.passwordDescription")}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onCancel}
          >
            {t("Profile.cancel")}
          </Button>
          <SubmitButton pending={pending} size="default">
            {t("Profile.passwordButton")}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
