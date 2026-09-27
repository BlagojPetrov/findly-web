import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemForm } from "@/components/items/item-form";
import { requireUser } from "@/lib/auth";
import { todayInAppTimeZone } from "@/lib/dates";
import { categoryName, getCategories } from "@/lib/queries/categories";
import { getItem } from "@/lib/queries/items";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/items/[id]/edit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Items",
  });
  return { title: t("editTitle") };
}

export default async function EditItemPage({
  params,
}: PageProps<"/[locale]/items/[id]/edit">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const [user, item, categories, t] = await Promise.all([
    requireUser(`/items/${id}/edit`),
    getItem(id),
    getCategories(),
    getTranslations("Items"),
  ]);
  // Only the owner edits, and not while an admin has hidden the item (RLS
  // would reject the update anyway). Admins moderate, they do not edit.
  if (!item || item.user_id !== user.id || item.status === "hidden") {
    notFound();
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("editTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("editDescription")}
        </p>
      </div>
      <ItemForm
        mode="edit"
        userId={user.id}
        itemId={item.id}
        categories={categories.map((category) => ({
          id: category.id,
          icon: category.icon,
          name: categoryName(category, locale),
        }))}
        initialValues={{
          type: item.type,
          title: item.title,
          description: item.description,
          categoryId: String(item.category.id),
          occurredOn: item.occurred_on,
          locationName: item.location_name ?? "",
        }}
        initialImagePaths={item.images.map((image) => image.storage_path)}
        today={todayInAppTimeZone()}
      />
    </div>
  );
}
