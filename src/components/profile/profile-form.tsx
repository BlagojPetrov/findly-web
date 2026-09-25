"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/actions/profile";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  SettingsCard,
  SettingsCardBody,
  SettingsCardFooter,
} from "@/components/profile/settings-card";
import { routing } from "@/i18n/routing";
import type { ActionResult } from "@/lib/action-result";
import type { ValidationMessage } from "@/lib/validation/messages";

type Values = { displayName: string; preferredLocale: string };
type State = { result: ActionResult; values: Values } | null;

// "Personal information" card: display name and the language of emails.
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
  const localeHintId = localeError
    ? "preferredLocale-error"
    : "preferredLocale-hint";

  return (
    <SettingsCard title={t("personalTitle")}>
      <form action={formAction} noValidate>
        <SettingsCardBody className="grid items-start gap-5 sm:grid-cols-2">
          <div className="empty:hidden sm:col-span-2">
            <FormError failure={failure} />
          </div>
          <FormField
            name="displayName"
            label={t("displayName")}
            autoComplete="name"
            required
            maxLength={50}
            className="h-9"
            defaultValue={values.displayName}
            errors={failure?.fieldErrors?.displayName}
          />
          <fieldset aria-describedby={localeHintId} className="min-w-0">
            <legend className="mb-1.5 text-sm leading-none font-medium">
              {t("language")}
            </legend>
            {/* A segmented control made of radio buttons, so it is still a
                plain form field for the action. Remounted to apply a
                refilled value (see FormField). */}
            <div
              key={values.preferredLocale}
              className="grid h-9 grid-cols-2 gap-0.5 rounded-lg border bg-muted/60 p-0.5"
            >
              {routing.locales.map((locale) => (
                <label
                  key={locale}
                  className="flex cursor-pointer items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors select-none hover:text-foreground has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="radio"
                    name="preferredLocale"
                    value={locale}
                    defaultChecked={locale === values.preferredLocale}
                    className="sr-only"
                  />
                  {t(`locales.${locale}`)}
                </label>
              ))}
            </div>
            {localeError ? (
              <p
                id="preferredLocale-error"
                className="mt-1.5 text-xs text-destructive"
              >
                {tValidation(localeError as ValidationMessage)}
              </p>
            ) : (
              <p
                id="preferredLocale-hint"
                className="mt-1.5 text-xs text-muted-foreground"
              >
                {t("languageHint")}
              </p>
            )}
          </fieldset>
        </SettingsCardBody>
        <SettingsCardFooter>
          <SubmitButton pending={pending} size="default">
            {t("save")}
          </SubmitButton>
        </SettingsCardFooter>
      </form>
    </SettingsCard>
  );
}
