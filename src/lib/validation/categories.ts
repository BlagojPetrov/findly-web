import { z } from "zod";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { msg } from "./messages";

// Same limits as the checks on public.categories.
export const CATEGORY_NAME_MAX_LENGTH = 50;
export const CATEGORY_SLUG_MAX_LENGTH = 40;

const name = z
  .string()
  .trim()
  .min(1, msg("required"))
  .max(CATEGORY_NAME_MAX_LENGTH, msg("categoryNameTooLong"));

const icon = z.enum(CATEGORY_ICONS, { error: msg("categoryIconInvalid") });

const categoryId = z.coerce
  .number({ error: msg("invalidValue") })
  .int(msg("invalidValue"))
  .min(1, msg("invalidValue"))
  .max(32767, msg("invalidValue"));

// Editing: names and icon. The slug is fixed once the category exists (feed
// URLs and the matching rules use it).
export const updateCategorySchema = z.object({
  id: categoryId,
  nameMk: name,
  nameEn: name,
  icon,
});

// Adding: also the slug (lower-case letters, digits and single hyphens).
export const createCategorySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, msg("required"))
    .max(CATEGORY_SLUG_MAX_LENGTH, msg("categorySlugInvalid"))
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, msg("categorySlugInvalid")),
  nameMk: name,
  nameEn: name,
  icon,
});

export const deleteCategorySchema = z.object({ id: categoryId });

// The full display order (every category once; the database checks that).
export const reorderCategoriesSchema = z.object({
  ids: z
    .array(categoryId)
    .min(1, msg("invalidValue"))
    .refine((ids) => new Set(ids).size === ids.length, msg("invalidValue")),
});
