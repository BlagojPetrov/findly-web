"use server";

import {
  type ActionResult,
  fail,
  ok,
  validationError,
} from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { itemWriteFailure } from "@/lib/item-errors";
import { ITEM_IMAGES_BUCKET } from "@/lib/item-images";
import { getCategories } from "@/lib/queries/categories";
import { createClient } from "@/lib/supabase/server";
import {
  itemIdFormSchema,
  itemSchema,
  itemStatusSchema,
} from "@/lib/validation/items";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Reads the item form. imagePaths is repeated once per photo, in order.
function itemFormValues(formData: FormData) {
  return {
    itemId: formData.get("itemId"),
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    occurredOn: formData.get("occurredOn"),
    locationName: formData.get("locationName"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    imagePaths: formData.getAll("imagePaths"),
  };
}

// Validates the item form for the signed-in user.
async function parseItemForm(formData: FormData, userId: string) {
  const categories = await getCategories();
  return itemSchema({
    categoryIds: categories.map((category) => category.id),
    userId,
  }).safeParse(itemFormValues(formData));
}

// Names of the files in an item's folder ("<owner id>/<item id>"). Listing
// needs the storage select policy: the owner's own folder, or an admin.
async function listItemFiles(supabase: SupabaseClient, folder: string) {
  const { data, error } = await supabase.storage
    .from(ITEM_IMAGES_BUCKET)
    .list(folder, { limit: 100 });
  if (error) {
    console.error(`Listing ${folder} failed: ${error.message}`);
    return null;
  }
  return data.map((file) => `${folder}/${file.name}`);
}

// True when every photo was really uploaded to the item's folder (the
// browser uploads them before submitting).
async function imagesExist(
  supabase: SupabaseClient,
  folder: string,
  paths: string[],
) {
  if (paths.length === 0) return true;
  const files = await listItemFiles(supabase, folder);
  if (!files) return false;
  const names = new Set(files);
  return paths.every((path) => names.has(path));
}

// Deletes photos that no item uses any more. A leftover file only wastes
// space, so a failure is logged and not reported to the user.
async function removeFiles(supabase: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage
    .from(ITEM_IMAGES_BUCKET)
    .remove(paths);
  if (error) console.error(`Removing item photos failed: ${error.message}`);
}

const imageInvalid: ActionResult<never> = {
  ok: false,
  error: "validation",
  fieldErrors: { imagePaths: ["imageInvalid"] },
};

// Creates a lost/found report with its photos (create_item() inserts the
// item and the image rows in one transaction, as the user, under RLS).
// Photos stay in Storage when this fails: the form keeps them for the next
// attempt (abandoned uploads: F-21).
export async function createItem(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser("/items/new");
  const parsed = await parseItemForm(formData, user.id);
  if (!parsed.success) return validationError(parsed.error);

  const item = parsed.data;
  const supabase = await createClient();
  const folder = `${user.id}/${item.itemId}`;
  if (!(await imagesExist(supabase, folder, item.imagePaths))) {
    return imageInvalid;
  }

  const { data: id, error } = await supabase.rpc("create_item", {
    item_id: item.itemId,
    type: item.type,
    title: item.title,
    description: item.description,
    category_id: item.categoryId,
    occurred_on: item.occurredOn,
    lat: item.lat,
    lng: item.lng,
    location_name: item.locationName ?? undefined,
    image_paths: item.imagePaths,
  });
  if (error) return itemWriteFailure(error);

  return ok({ id });
}

// Saves the edit form: the item's fields and its complete photo list
// (update_item() syncs the image rows in one transaction and returns the
// paths it removed, whose files are then deleted). Only the owner of an
// item that is not hidden can edit it (RLS; otherwise not_found).
export async function updateItem(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = await parseItemForm(formData, user.id);
  if (!parsed.success) return validationError(parsed.error);

  const item = parsed.data;
  const supabase = await createClient();
  const folder = `${user.id}/${item.itemId}`;
  if (!(await imagesExist(supabase, folder, item.imagePaths))) {
    return imageInvalid;
  }

  const { data: removed, error } = await supabase.rpc("update_item", {
    item_id: item.itemId,
    type: item.type,
    title: item.title,
    description: item.description,
    category_id: item.categoryId,
    occurred_on: item.occurredOn,
    lat: item.lat,
    lng: item.lng,
    location_name: item.locationName ?? undefined,
    image_paths: item.imagePaths,
  });
  if (error) return itemWriteFailure(error);

  await removeFiles(supabase, removed);
  return ok({ id: item.itemId });
}

// Marks an item as resolved (returned / found again) or active again.
export async function setItemStatus(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const parsed = itemStatusSchema.safeParse({
    itemId: formData.get("itemId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { itemId, status } = parsed.data;
  const supabase = await createClient();
  // RLS limits the update to the owner's items that are not hidden.
  const { data, error } = await supabase
    .from("items")
    .update({ status })
    .eq("id", itemId)
    .select("id");
  if (error) return itemWriteFailure(error);
  if (data.length === 0) return fail("not_found");
  return ok();
}

// Deletes an item (the owner, or an admin) and every file in its folder:
// its photos and any photo uploaded for it but never saved (F-21).
export async function deleteItem(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const parsed = itemIdFormSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return fail("not_found");

  const { itemId } = parsed.data;
  const supabase = await createClient();
  const { data: item, error: readError } = await supabase
    .from("items")
    .select("id, user_id")
    .eq("id", itemId)
    .maybeSingle();
  if (readError) return itemWriteFailure(readError);
  if (!item) return fail("not_found");

  const files = await listItemFiles(supabase, `${item.user_id}/${item.id}`);

  const { data: deleted, error } = await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .select("id");
  if (error) return itemWriteFailure(error);
  // Visible but not deletable: someone else's item.
  if (deleted.length === 0) return fail("forbidden");

  await removeFiles(supabase, files ?? []);
  return ok();
}
