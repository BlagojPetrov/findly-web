"use server";

import { type ActionResult, ok, validationError } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { itemWriteFailure } from "@/lib/item-errors";
import { ITEM_IMAGES_BUCKET } from "@/lib/item-images";
import { getCategories } from "@/lib/queries/categories";
import { createClient } from "@/lib/supabase/server";
import { itemSchema } from "@/lib/validation/items";

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

// True when every photo was really uploaded to the item's folder (the
// browser uploads them before submitting). Listing the folder needs the
// storage select policy, which allows only the user's own folder.
async function imagesExist(
  supabase: SupabaseClient,
  folder: string,
  paths: string[],
) {
  if (paths.length === 0) return true;
  const { data, error } = await supabase.storage
    .from(ITEM_IMAGES_BUCKET)
    .list(folder, { limit: 100 });
  if (error) {
    console.error(`Listing ${folder} failed: ${error.message}`);
    return false;
  }
  const names = new Set(data.map((file) => `${folder}/${file.name}`));
  return paths.every((path) => names.has(path));
}

// Creates a lost/found report with its photos (create_item() inserts the
// item and the image rows in one transaction, as the user, under RLS).
// Photos stay in Storage when this fails: the form keeps them for the next
// attempt (abandoned uploads: F-21).
export async function createItem(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser("/items/new");
  const categories = await getCategories();
  const parsed = itemSchema({
    categoryIds: categories.map((category) => category.id),
    userId: user.id,
  }).safeParse(itemFormValues(formData));
  if (!parsed.success) return validationError(parsed.error);

  const item = parsed.data;
  const supabase = await createClient();
  const folder = `${user.id}/${item.itemId}`;
  if (!(await imagesExist(supabase, folder, item.imagePaths))) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: { imagePaths: ["imageInvalid"] },
    };
  }

  // Coordinates are stored from P5.S3 (create_item has no location yet).
  const { data: id, error } = await supabase.rpc("create_item", {
    item_id: item.itemId,
    type: item.type,
    title: item.title,
    description: item.description,
    category_id: item.categoryId,
    occurred_on: item.occurredOn,
    location_name: item.locationName ?? undefined,
    image_paths: item.imagePaths,
  });
  if (error) return itemWriteFailure(error);

  return ok({ id });
}
