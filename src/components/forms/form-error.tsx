"use client";

import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ActionResult } from "@/lib/action-result";

type Failure = Extract<ActionResult, { ok: false }>;

// Form-level error from an ActionResult, e.g. "Incorrect email or password".
// Validation errors are shown next to their fields; the generic validation
// message only appears when no field has an error to show.
export function FormError({ failure }: { failure?: Failure }) {
  const t = useTranslations("Errors");
  if (!failure) return null;

  const hasFieldErrors = Object.values(failure.fieldErrors ?? {}).some(
    (messages) => messages?.length,
  );
  if (failure.error === "validation" && hasFieldErrors) return null;

  return (
    <div
      role="alert"
      className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{t(failure.error)}</p>
    </div>
  );
}
