"use client";

import { HandHeart, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { createItem, updateItem } from "@/actions/items";
import { FormError } from "@/components/forms/form-error";
import { FormField, FormTextareaField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { CategoryIcon } from "@/components/items/category-icon";
import { ImagePicker } from "@/components/items/image-picker";
import { LocationPicker } from "@/components/map/location-picker";
import {
  SettingsCard,
  SettingsCardBody,
} from "@/components/profile/settings-card";
import { buttonVariants } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/action-result";
import type { LatLng } from "@/lib/map";
import { ITEM_LIMITS } from "@/lib/validation/items";
import type { ValidationMessage } from "@/lib/validation/messages";

type ItemType = "lost" | "found";
export type ItemFormValues = {
  type: ItemType | null;
  title: string;
  description: string;
  categoryId: string;
  occurredOn: string;
  locationName: string;
  // Coordinates as posted by the location picker; "" without a point.
  lat: string;
  lng: string;
};
type Values = ItemFormValues;
type State = {
  result: ActionResult<{ id: string }>;
  values: Values;
  // Counts action results; remounts the type radios (F-24).
  attempt: number;
} | null;

export type CategoryOption = { id: number; name: string; icon: string };

const typeIcons = { lost: SearchX, found: HandHeart };

function readValues(formData: FormData): Values {
  const text = (key: string) => String(formData.get(key) ?? "");
  const type = formData.get("type");
  return {
    type: type === "lost" || type === "found" ? type : null,
    title: text("title"),
    description: text("description"),
    categoryId: text("categoryId"),
    occurredOn: text("occurredOn"),
    locationName: text("locationName"),
    lat: text("lat"),
    lng: text("lng"),
  };
}

function toPoint({ lat, lng }: Values): LatLng | null {
  const point = { lat: Number(lat), lng: Number(lng) };
  return lat && lng && Number.isFinite(point.lat) && Number.isFinite(point.lng)
    ? point
    : null;
}

// Error below a group of radio buttons (type, category).
function GroupError({ id, errors }: { id: string; errors?: string[] }) {
  const t = useTranslations("Validation");
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-destructive">
      {t(errors[0] as ValidationMessage)}
    </p>
  );
}

// Form for a new lost/found report ("create") or for editing one ("edit").
// The item id comes from the page (a new UUID per visit when creating): the
// photos are uploaded into the item's folder before the form is submitted.
export function ItemForm({
  mode,
  userId,
  itemId,
  categories,
  initialValues,
  initialImagePaths = [],
  today,
}: {
  mode: "create" | "edit";
  userId: string;
  itemId: string;
  categories: CategoryOption[];
  initialValues: Values;
  // Saved photos of the item being edited, cover first.
  initialImagePaths?: string[];
  // "YYYY-MM-DD" in Macedonia; the latest date the picker allows.
  today: string;
}) {
  const t = useTranslations("Items");
  const router = useRouter();
  const [type, setType] = useState<ItemType | null>(initialValues.type);
  const [uploading, setUploading] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData): Promise<State> => {
      const save = mode === "edit" ? updateItem : createItem;
      const result = await save(formData);
      if (result.ok) {
        toast.success(t(mode === "edit" ? "saved" : "created"));
        router.push(`/items/${result.data.id}`);
      }
      // Keep the entered values after an error (React resets the form).
      return {
        result,
        values: readValues(formData),
        attempt: (prev?.attempt ?? 0) + 1,
      };
    },
    null,
  );
  const values = state?.values ?? initialValues;
  const failure = state && !state.result.ok ? state.result : undefined;
  const errors = failure?.fieldErrors;
  // After success the page navigates away; keep the form locked meanwhile.
  const done = state?.result.ok === true;

  return (
    <form action={formAction} noValidate className="grid gap-6">
      <input type="hidden" name="itemId" value={itemId} />
      <div className="empty:hidden">
        <FormError failure={failure} />
      </div>

      <fieldset
        aria-describedby={errors?.type ? "type-error" : undefined}
        className="min-w-0"
      >
        <legend className="mb-2 text-sm font-medium">{t("typeLegend")}</legend>
        {/* React resets the form after every action, which unchecks these
            controlled radios while `type` stays the same (F-24). Remounting
            the group after each result makes React write the current choice
            as their default (`defaultChecked`), so the reset keeps it. */}
        <div key={state?.attempt ?? 0} className="grid gap-3 sm:grid-cols-2">
          {(["lost", "found"] as const).map((option) => {
            const Icon = typeIcons[option];
            return (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/5 has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  name="type"
                  value={option}
                  checked={type === option}
                  onChange={() => setType(option)}
                  className="sr-only"
                />
                <Icon
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden
                />
                <span className="grid gap-0.5">
                  <span className="font-medium">
                    {t(`types.${option}.label`)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t(`types.${option}.hint`)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <GroupError id="type-error" errors={errors?.type} />
      </fieldset>

      <SettingsCard title={t("detailsTitle")}>
        <SettingsCardBody className="grid gap-5">
          <FormField
            name="title"
            label={t("title")}
            placeholder={t("titlePlaceholder")}
            required
            maxLength={ITEM_LIMITS.titleMax}
            className="h-9"
            defaultValue={values.title}
            errors={errors?.title}
          />
          <FormTextareaField
            name="description"
            label={t("description")}
            hint={t("descriptionHint")}
            required
            rows={5}
            maxLength={ITEM_LIMITS.descriptionMax}
            className="min-h-28"
            defaultValue={values.description}
            errors={errors?.description}
          />

          <fieldset
            aria-describedby={
              errors?.categoryId ? "categoryId-error" : undefined
            }
            className="min-w-0"
          >
            <legend className="mb-1.5 text-sm leading-none font-medium">
              {t("category")}
            </legend>
            {/* Remounted to apply a refilled value (see FormField). */}
            <div
              key={values.categoryId}
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/5 has-checked:font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="radio"
                    name="categoryId"
                    value={category.id}
                    defaultChecked={String(category.id) === values.categoryId}
                    className="sr-only"
                  />
                  <CategoryIcon
                    name={category.icon}
                    className="size-4 shrink-0 text-primary"
                  />
                  <span className="truncate">{category.name}</span>
                </label>
              ))}
            </div>
            <GroupError id="categoryId-error" errors={errors?.categoryId} />
          </fieldset>

          <div className="grid items-start gap-5 sm:grid-cols-2">
            <FormField
              name="occurredOn"
              type="date"
              label={t(type ? `occurredOn.${type}` : "occurredOn.any")}
              required
              max={today}
              className="h-9"
              defaultValue={values.occurredOn}
              errors={errors?.occurredOn}
            />
          </div>
        </SettingsCardBody>
      </SettingsCard>

      <SettingsCard
        title={t("locationTitle")}
        description={t(`locationDescription.${type ?? "any"}`)}
      >
        <SettingsCardBody>
          {/* Keeps its own state, so a failed submit keeps the pin. */}
          <LocationPicker
            defaultPoint={toPoint(initialValues)}
            defaultLocationName={initialValues.locationName}
            errors={errors?.lat ?? errors?.lng}
            locationNameErrors={errors?.locationName}
            disabled={pending || done}
          />
        </SettingsCardBody>
      </SettingsCard>

      <SettingsCard
        title={t("photosTitle")}
        description={t("photosDescription")}
      >
        <SettingsCardBody>
          <ImagePicker
            userId={userId}
            itemId={itemId}
            defaultPaths={initialImagePaths}
            onPendingChange={setUploading}
            disabled={pending || done}
            describedBy={errors?.imagePaths ? "imagePaths-error" : undefined}
          />
          <GroupError id="imagePaths-error" errors={errors?.imagePaths} />
        </SettingsCardBody>
      </SettingsCard>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {uploading && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("waitForPhotos")}
          </p>
        )}
        {mode === "edit" && (
          <Link
            href={`/items/${itemId}`}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {t("cancel")}
          </Link>
        )}
        <SubmitButton
          pending={pending || done}
          disabled={pending || done || uploading}
        >
          {t(mode === "edit" ? "save" : "submit")}
        </SubmitButton>
      </div>
    </form>
  );
}
