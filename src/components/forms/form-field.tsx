"use client";

import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ValidationMessage } from "@/lib/validation/messages";

type FieldProps = {
  name: string;
  label: string;
  hint?: string;
  // Validation message keys from ActionResult.fieldErrors.
  errors?: string[];
  id?: string;
};

type ControlProps = {
  id: string;
  name: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
};

// Label + control + hint + translated validation errors, with the ARIA wiring.
function Field({
  name,
  label,
  hint,
  errors,
  id = name,
  children,
}: FieldProps & { children: (control: ControlProps) => ReactNode }) {
  const t = useTranslations("Validation");
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        name,
        "aria-invalid": errorId ? true : undefined,
        "aria-describedby":
          [hintId, errorId].filter(Boolean).join(" ") || undefined,
      })}
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

// Base UI reads defaultValue only on mount and warns when it changes. Forms
// refill values after a failed submit by passing a new defaultValue, so the
// control is remounted to start from that value.
function remountKey(defaultValue: unknown) {
  return JSON.stringify(defaultValue ?? null);
}

export function FormField({
  name,
  label,
  hint,
  errors,
  id,
  ...inputProps
}: FieldProps & ComponentProps<typeof Input>) {
  return (
    <Field name={name} label={label} hint={hint} errors={errors} id={id}>
      {(control) => (
        <Input
          key={remountKey(inputProps.defaultValue)}
          {...control}
          {...inputProps}
        />
      )}
    </Field>
  );
}

export function FormTextareaField({
  name,
  label,
  hint,
  errors,
  id,
  ...textareaProps
}: FieldProps & ComponentProps<typeof Textarea>) {
  return (
    <Field name={name} label={label} hint={hint} errors={errors} id={id}>
      {(control) => (
        <Textarea
          key={remountKey(textareaProps.defaultValue)}
          {...control}
          {...textareaProps}
        />
      )}
    </Field>
  );
}
