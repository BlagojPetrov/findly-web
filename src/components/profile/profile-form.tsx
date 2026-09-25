"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/actions/profile";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { routing } from "@/i18n/routing";
import type { ActionResult } from "@/lib/action-result";
import type { ValidationMessage } from "@/lib/validation/messages";

type Values = { displayName: string; preferredLocale: string };
type State = { result: ActionResult; values: Values } | null;

export function ProfileForm({ initialValues }: { initialValues: Values }) {
  const t = useTranslations("Profile");
  const tValidation = useTranslations("Validation");
  // Keep the entered values after an error (React resets the form).
  const [state, formAction, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const result = await updateProfile(formData);
      if (result.ok) toast.success(t("saved"));
      return {
        result,
        values: {
          displayName: String(formData.get("displayName") ?? ""),
          preferredLocale: String(formData.get("preferredLocale") ?? ""),
        },
      };
    },
    null,
  );
  const values = state?.values ?? initialValues;
  const failure = state && !state.result.ok ? state.result : undefined;
  const localeError = failure?.fieldErrors?.preferredLocale?.[0];

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
        defaultValue={values.displayName}
        errors={failure?.fieldErrors?.displayName}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="preferredLocale">{t("preferredLocale")}</Label>
        <select
          // Remount to apply a refilled value (see FormField).
          key={values.preferredLocale}
          id="preferredLocale"
          name="preferredLocale"
          defaultValue={values.preferredLocale}
          aria-invalid={localeError ? true : undefined}
          aria-describedby={
            localeError ? "preferredLocale-error" : "preferredLocale-hint"
          }
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30"
        >
          {routing.locales.map((locale) => (
            <option key={locale} value={locale}>
              {t(`locales.${locale}`)}
            </option>
          ))}
        </select>
        {localeError ? (
          <p id="preferredLocale-error" className="text-xs text-destructive">
            {tValidation(localeError as ValidationMessage)}
          </p>
        ) : (
          <p
            id="preferredLocale-hint"
            className="text-xs text-muted-foreground"
          >
            {t("preferredLocaleHint")}
          </p>
        )}
      </div>
      <SubmitButton pending={pending} className="justify-self-start">
        {t("save")}
      </SubmitButton>
    </form>
  );
}
