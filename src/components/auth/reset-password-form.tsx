"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { resetPassword } from "@/actions/auth";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/action-result";
import { AFTER_SIGN_IN_PATH } from "@/lib/auth-routes";

export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  // Passwords are never refilled after an error.
  const [result, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      resetPassword(formData),
    null,
  );

  if (result?.ok) {
    return (
      <div className="grid gap-5">
        <div
          role="status"
          className="flex gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm"
        >
          <CircleCheck
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden
          />
          <p>{t("resetDone")}</p>
        </div>
        <Link href={AFTER_SIGN_IN_PATH} className={buttonVariants()}>
          {t("continue")}
        </Link>
      </div>
    );
  }

  const failure = result && !result.ok ? result : undefined;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormError failure={failure} />
      <FormField
        name="password"
        type="password"
        label={t("newPassword")}
        hint={t("passwordHint")}
        autoComplete="new-password"
        required
        errors={failure?.fieldErrors?.password}
      />
      <FormField
        name="confirmPassword"
        type="password"
        label={t("confirmNewPassword")}
        autoComplete="new-password"
        required
        errors={failure?.fieldErrors?.confirmPassword}
      />
      <SubmitButton pending={pending}>{t("resetButton")}</SubmitButton>
    </form>
  );
}
