"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signUp } from "@/actions/auth";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import type { ActionResult } from "@/lib/action-result";

type State = {
  result: ActionResult;
  values: { displayName: string; email: string };
} | null;

export function RegisterForm() {
  const t = useTranslations("Auth");
  // Keep name and email after an error; passwords are never refilled.
  const [state, formAction, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => ({
      result: await signUp(formData),
      values: {
        displayName: String(formData.get("displayName") ?? ""),
        email: String(formData.get("email") ?? ""),
      },
    }),
    null,
  );
  const failure = state && !state.result.ok ? state.result : undefined;
  const errors = failure?.fieldErrors;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormError failure={failure} />
      <FormField
        name="displayName"
        label={t("displayName")}
        hint={t("displayNameHint")}
        autoComplete="name"
        required
        maxLength={50}
        defaultValue={state?.values.displayName}
        errors={errors?.displayName}
      />
      <FormField
        name="email"
        type="email"
        label={t("email")}
        autoComplete="email"
        required
        defaultValue={state?.values.email}
        errors={errors?.email}
      />
      <FormField
        name="password"
        type="password"
        label={t("password")}
        hint={t("passwordHint")}
        autoComplete="new-password"
        required
        errors={errors?.password}
      />
      <FormField
        name="confirmPassword"
        type="password"
        label={t("confirmPassword")}
        autoComplete="new-password"
        required
        errors={errors?.confirmPassword}
      />
      <SubmitButton pending={pending}>{t("signUp")}</SubmitButton>
    </form>
  );
}
