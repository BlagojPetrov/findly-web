import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Category = Pick<
  Tables<"categories">,
  "id" | "slug" | "name_mk" | "name_en" | "icon"
>;

// All categories in display order. Readable by everyone; cached per request.
export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_mk, name_en, icon")
    .order("sort_order")
    .order("id");
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return data;
});

export function categoryName(category: Category, locale: string) {
  return locale === "mk" ? category.name_mk : category.name_en;
}
