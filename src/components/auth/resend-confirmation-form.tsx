"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { resendConfirmation } from "@/actions/auth";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useCooldown } from "@/hooks/use-cooldown";
import type { ActionResult } from "@/lib/action-result";

// Matches Supabase's minimum interval between emails to the same address.
const COOLDOWN_SECONDS = 60;

type State = { result: ActionResult; email: string; sentAt?: number } | null;

export function ResendConfirmationForm({ email }: { email?: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const result = await resendConfirmation(formData);
      return {
        result,
        email: String(formData.get("email") ?? ""),
        sentAt: result.ok ? Date.now() : undefined,
      };
    },
    null,
  );

  const secondsLeft = useCooldown(state?.sentAt, COOLDOWN_SECONDS);
  const failure = state && !state.result.ok ? state.result : undefined;

  return (
    <form action={formAction} className="grid gap-3" noValidate>
      <p className="text-sm text-muted-foreground">{t("resendPrompt")}</p>
      <FormError failure={failure} />
      {state?.result.ok && (
        <div
          role="status"
          className="flex gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm"
        >
          <CircleCheck
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden
          />
          <p>{t("resendSent")}</p>
        </div>
      )}
      <FormField
        name="email"
        type="email"
        label={t("email")}
        autoComplete="email"
        required
        defaultValue={state?.email ?? email}
        errors={failure?.fieldErrors?.email}
      />
      <SubmitButton pending={pending} disabled={pending || secondsLeft > 0}>
        {secondsLeft > 0
          ? t("resendCooldown", { seconds: secondsLeft })
          : t("resendButton")}
      </SubmitButton>
    </form>
  );
}
