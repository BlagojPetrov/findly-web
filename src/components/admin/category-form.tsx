"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/actions/categories";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { CategoryIcon } from "@/components/items/category-icon";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import type { AdminCategory } from "@/lib/queries/admin";
import {
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_SLUG_MAX_LENGTH,
} from "@/lib/validation/categories";
import type { ValidationMessage } from "@/lib/validation/messages";

type Values = { slug: string; nameMk: string; nameEn: string; icon: string };

type FormState = {
  result: ActionResult;
  // Counts submits, so the icon radios remount after each result (F-24).
  attempt: number;
  values: Values;
};

// Adds a category (no `category`) or edits one (names and icon; the slug is
// fixed). Lives inside a dialog and mounts each time it opens; success
// closes it with a toast and the action refreshes the page.
export function CategoryForm({
  category,
  onSaved,
}: {
  category?: AdminCategory;
  onSaved: () => void;
}) {
  const t = useTranslations("Admin.categories");
  const tValidation = useTranslations("Validation");
  const initial: Values = {
    slug: category?.slug ?? "",
    nameMk: category?.nameMk ?? "",
    nameEn: category?.nameEn ?? "",
    icon: category?.icon ?? "package",
  };
  const [state, formAction, pending] = useActionState(
    async (prev: FormState | null, formData: FormData) => {
      const result = await (category ? updateCategory : createCategory)(
        formData,
      );
      if (result.ok) {
        toast.success(t(category ? "updatedToast" : "createdToast"));
        onSaved();
      }
      const value = (key: keyof Values) => String(formData.get(key) ?? "");
      return {
        result,
        attempt: (prev?.attempt ?? 0) + 1,
        values: {
          slug: category ? initial.slug : value("slug"),
          nameMk: value("nameMk"),
          nameEn: value("nameEn"),
          icon: value("icon") || initial.icon,
        },
      };
    },
    null,
  );
  const values = state?.values ?? initial;
  const failure = state && !state.result.ok ? state.result : undefined;
  const errors = failure?.fieldErrors;

  return (
    <form action={formAction} className="grid gap-4">
      {category ? (
        <>
          <input type="hidden" name="id" value={category.id} />
          <p className="text-sm text-muted-foreground">
            {t("slugFixed", { slug: category.slug })}
          </p>
        </>
      ) : (
        <FormField
          name="slug"
          label={t("slug")}
          hint={t("slugHint")}
          required
          maxLength={CATEGORY_SLUG_MAX_LENGTH}
          autoComplete="off"
          spellCheck={false}
          defaultValue={values.slug}
          errors={errors?.slug}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          name="nameMk"
          label={t("nameMk")}
          required
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          defaultValue={values.nameMk}
          errors={errors?.nameMk}
        />
        <FormField
          name="nameEn"
          label={t("nameEn")}
          required
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          defaultValue={values.nameEn}
          errors={errors?.nameEn}
        />
      </div>
      <fieldset
        aria-describedby={errors?.icon ? "icon-error" : undefined}
        className="min-w-0"
      >
        <legend className="mb-2 text-sm font-medium">{t("icon")}</legend>
        <div
          key={state?.attempt ?? 0}
          className="grid grid-cols-6 gap-1.5 sm:grid-cols-8"
        >
          {CATEGORY_ICONS.map((icon) => (
            <label
              key={icon}
              title={icon}
              className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="icon"
                value={icon}
                required
                defaultChecked={values.icon === icon}
                className="sr-only"
              />
              <CategoryIcon name={icon} className="size-5" />
              <span className="sr-only">{icon}</span>
            </label>
          ))}
        </div>
        {errors?.icon?.length ? (
          <p id="icon-error" className="mt-1.5 text-xs text-destructive">
            {tValidation(errors.icon[0] as ValidationMessage)}
          </p>
        ) : null}
      </fieldset>
      <FormError failure={failure} />
      <DialogFooter>
        <DialogClose
          render={<Button type="button" variant="outline" size="lg" />}
        >
          {t("cancel")}
        </DialogClose>
        <SubmitButton pending={pending}>
          {t(category ? "save" : "create")}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
