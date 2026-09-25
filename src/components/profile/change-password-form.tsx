"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { toast } from "sonner";
import { resetPassword } from "@/actions/auth";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import type { ActionResult } from "@/lib/action-result";

// Same action as the password reset page: sets the new password for the
// signed-in user and signs out their other sessions. The current password is
// not asked for, because Supabase lets any session change the password, so
// asking for it here would add no security (see P2.S6 design note).
export function ChangePasswordForm() {
  const t = useTranslations();
  // Passwords are never refilled; the form is cleared after every submit.
  const [result, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => {
      const result = await resetPassword(formData);
      if (result.ok) toast.success(t("Profile.passwordChanged"));
      return result;
    },
    null,
  );
  const failure = result && !result.ok ? result : undefined;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormError failure={failure} />
      <FormField
        name="password"
        type="password"
        label={t("Auth.newPassword")}
        hint={t("Auth.passwordHint")}
        autoComplete="new-password"
        required
        errors={failure?.fieldErrors?.password}
      />
      <FormField
        name="confirmPassword"
        type="password"
        label={t("Auth.confirmNewPassword")}
        autoComplete="new-password"
        required
        errors={failure?.fieldErrors?.confirmPassword}
      />
      <SubmitButton pending={pending} className="justify-self-start">
        {t("Profile.passwordButton")}
      </SubmitButton>
    </form>
  );
}
