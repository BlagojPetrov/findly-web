"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signIn } from "@/actions/auth";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Link } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/action-result";

type State = { result: ActionResult; email: string } | null;

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("Auth");
  // Keep the entered email after an error (React resets the form on submit).
  const [state, formAction, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => ({
      result: await signIn(formData),
      email: String(formData.get("email") ?? ""),
    }),
    null,
  );
  const failure = state && !state.result.ok ? state.result : undefined;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormError failure={failure} />
      {failure?.error === "email_not_confirmed" && (
        <Link
          href={{ pathname: "/verify-email", query: { email: state?.email } }}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("resendConfirmationLink")}
        </Link>
      )}
      <FormField
        name="email"
        type="email"
        label={t("email")}
        autoComplete="email"
        required
        defaultValue={state?.email}
        errors={failure?.fieldErrors?.email}
      />
      <FormField
        name="password"
        type="password"
        label={t("password")}
        autoComplete="current-password"
        required
        errors={failure?.fieldErrors?.password}
      />
      <SubmitButton pending={pending}>{t("signIn")}</SubmitButton>
    </form>
  );
}
