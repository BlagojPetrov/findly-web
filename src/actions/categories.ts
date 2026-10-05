"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import {
  type ActionResult,
  fail,
  ok,
  validationError,
} from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createCategorySchema,
  deleteCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from "@/lib/validation/categories";

// Category management of the admin area (§18). Each action checks
// requireAdmin() itself; the admin policies on categories (P10.S1) and the
// functions of P10.S6 have the final word.

function failure(what: string, error: PostgrestError) {
  switch (error.code) {
    case "23505": // unique slug
      return fail("category_slug_taken");
    case "23503": // items.category_id is "on delete restrict"
      return fail("category_in_use");
    case "FL409": // the "other" category
      return fail("category_protected");
    case "22023": // admin_reorder_categories(): not the full list
      return fail("category_list_changed");
    case "42501":
      return fail("forbidden");
  }
  console.error(`${what} failed: ${error.message}`);
  return fail("database");
}

function fields(formData: FormData) {
  return {
    nameMk: formData.get("nameMk"),
    nameEn: formData.get("nameEn"),
    icon: formData.get("icon"),
  };
}

// Adds a category at the end of the list.
export async function createCategory(
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createCategorySchema.safeParse({
    slug: formData.get("slug"),
    ...fields(formData),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { slug, nameMk, nameEn, icon } = parsed.data;
  const supabase = await createClient();
  const { data: last, error: readError } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) return failure("Reading the category order", readError);

  const { error } = await supabase.from("categories").insert({
    slug,
    name_mk: nameMk,
    name_en: nameEn,
    icon,
    sort_order: Math.min((last?.sort_order ?? 0) + 10, 32767),
  });
  if (error) return failure(`Adding category ${slug}`, error);
  refresh();
  return ok();
}

// Renames a category or changes its icon (the slug stays).
export async function updateCategory(
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateCategorySchema.safeParse({
    id: formData.get("id"),
    ...fields(formData),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { id, nameMk, nameEn, icon } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name_mk: nameMk, name_en: nameEn, icon })
    .eq("id", id)
    .select("id");
  if (error) return failure(`Updating category ${id}`, error);
  if (data.length === 0) return fail("not_found");
  refresh();
  return ok();
}

// Deletes a category that no report uses (and that is not "other").
export async function deleteCategory(
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteCategorySchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return validationError(parsed.error);

  const { id } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return failure(`Deleting category ${id}`, error);
  if (data.length === 0) return fail("not_found");
  refresh();
  return ok();
}

// Saves the display order: the ids of every category, in the new order.
export async function reorderCategories(
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderCategoriesSchema.safeParse({
    ids: formData.getAll("ids"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reorder_categories", {
    category_ids: parsed.data.ids,
  });
  if (error) return failure("Reordering categories", error);
  refresh();
  return ok();
}
