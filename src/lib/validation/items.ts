import { z } from "zod";
import { todayInAppTimeZone } from "@/lib/dates";
import { msg } from "./messages";

// Limits shared with the forms (maxLength, image count). The database has
// the same limits as check constraints (migration *_items.sql).
export const ITEM_LIMITS = {
  titleMin: 3,
  titleMax: 100,
  descriptionMin: 10,
  descriptionMax: 2000,
  locationNameMax: 200,
  images: 5,
} as const;

export const ITEM_TYPES = ["lost", "found"] as const;

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const imagePathPattern = new RegExp(
  `^(${uuid})/(${uuid})/${uuid}\\.(webp|jpg)$`,
);

// Image paths are "<user id>/<item id>/<uuid>.<webp|jpg>" in the
// "item-images" bucket; only the user's own folder for this item is valid.
export function isOwnItemImagePath(
  path: string,
  userId: string,
  itemId: string,
) {
  const match = imagePathPattern.exec(path);
  return match?.[1] === userId && match[2] === itemId;
}

// FormData values are strings or null; null (missing field) is "required".
const text = () => z.string({ error: msg("required") }).trim();

// Required coordinate from a hidden form field (the location picker leaves
// it blank until a point is chosen).
const coordinate = (limit: number) =>
  z.preprocess(
    (value) =>
      value == null || (typeof value === "string" && value.trim() === "")
        ? undefined
        : Number(value),
    z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? msg("locationRequired")
            : msg("locationInvalid"),
      })
      .min(-limit, msg("locationInvalid"))
      .max(limit, msg("locationInvalid")),
  );

type ItemSchemaContext = {
  // Ids of the existing categories (loaded by the action).
  categoryIds: readonly number[];
  // The signed-in user; image paths must be in their folder.
  userId: string;
};

// Create/edit item form. The item id is generated in the browser before
// the images are uploaded, because it is part of their paths.
export function itemSchema({ categoryIds, userId }: ItemSchemaContext) {
  return z
    .object({
      itemId: z.uuid({ error: msg("invalidValue") }),
      type: z.enum(ITEM_TYPES, { error: msg("itemTypeInvalid") }),
      title: text()
        .min(1, msg("required"))
        .min(ITEM_LIMITS.titleMin, msg("titleTooShort"))
        .max(ITEM_LIMITS.titleMax, msg("titleTooLong")),
      // Form data sends line breaks as "\r\n"; normalized before the length
      // checks so a description that fits the field also fits here (F-32).
      description: z
        .string({ error: msg("required") })
        .overwrite((value) => value.replace(/\r\n?/g, "\n"))
        .trim()
        .min(1, msg("required"))
        .min(ITEM_LIMITS.descriptionMin, msg("descriptionTooShort"))
        .max(ITEM_LIMITS.descriptionMax, msg("descriptionTooLong")),
      categoryId: text()
        .min(1, msg("required"))
        .transform(Number)
        .refine((id) => categoryIds.includes(id), msg("categoryInvalid")),
      occurredOn: text()
        .min(1, msg("required"))
        .pipe(z.iso.date({ error: msg("dateInvalid") }))
        .refine((date) => date <= todayInAppTimeZone(), msg("dateInFuture")),
      locationName: z
        .string()
        .trim()
        .max(ITEM_LIMITS.locationNameMax, msg("locationNameTooLong"))
        .nullish()
        .transform((value) => value || null),
      lat: coordinate(90),
      lng: coordinate(180),
      // In cover order (the first image is the cover).
      imagePaths: z
        .array(z.string(), { error: msg("imageInvalid") })
        .max(ITEM_LIMITS.images, msg("tooManyImages")),
    })
    .superRefine((item, ctx) => {
      const paths = item.imagePaths;
      if (
        new Set(paths).size !== paths.length ||
        !paths.every((path) => isOwnItemImagePath(path, userId, item.itemId))
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["imagePaths"],
          message: msg("imageInvalid"),
        });
      }
    });
}

export type ItemInput = z.infer<ReturnType<typeof itemSchema>>;

const itemIdSchema = z.uuid({ error: msg("invalidValue") });

// Owners switch between active and resolved; "hidden" is set only by admins.
export const itemStatusSchema = z.object({
  itemId: itemIdSchema,
  status: z.enum(["active", "resolved"], { error: msg("invalidValue") }),
});

export const itemIdFormSchema = z.object({ itemId: itemIdSchema });
