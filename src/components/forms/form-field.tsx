"use client";

import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ValidationMessage } from "@/lib/validation/messages";

type FormFieldProps = ComponentProps<typeof Input> & {
  name: string;
  label: string;
  hint?: string;
  // Validation message keys from ActionResult.fieldErrors.
  errors?: string[];
};

// Label + input + hint + translated validation errors, with the ARIA wiring.
export function FormField({
  name,
  label,
  hint,
  errors,
  id = name,
  ...inputProps
}: FormFieldProps) {
  const t = useTranslations("Validation");
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        // Base UI reads defaultValue only on mount and warns when it changes.
        // Forms refill values after a failed submit by passing a new
        // defaultValue, so remount the input to start from that value.
        key={JSON.stringify(inputProps.defaultValue ?? null)}
        id={id}
        name={name}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={
          [hintId, errorId].filter(Boolean).join(" ") || undefined
        }
        {...inputProps}
      />
      {hint && !errorId && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} className="text-xs text-destructive">
          {t(errors![0] as ValidationMessage)}
        </p>
      )}
    </div>
  );
}
