import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemForm } from "@/components/items/item-form";
import { requireUser } from "@/lib/auth";
import { todayInAppTimeZone } from "@/lib/dates";
import { categoryName, getCategories } from "@/lib/queries/categories";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/items/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Items",
  });
  return { title: t("newTitle") };
}

export default async function NewItemPage({
  params,
  searchParams,
}: PageProps<"/[locale]/items/new">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { type } = await searchParams;
  // "?type=lost" / "?type=found" preselects the type (links from the home
  // page and dashboard); otherwise the user chooses.
  const defaultType = type === "lost" || type === "found" ? type : null;

  const [user, categories, t] = await Promise.all([
    requireUser(defaultType ? `/items/new?type=${defaultType}` : "/items/new"),
    getCategories(),
    getTranslations("Items"),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("newTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("newDescription")}
        </p>
      </div>
      <ItemForm
        userId={user.id}
        // A new id per visit; the photos are uploaded into its folder.
        itemId={crypto.randomUUID()}
        categories={categories.map((category) => ({
          id: category.id,
          icon: category.icon,
          name: categoryName(category, locale),
        }))}
        mode="create"
        initialValues={{
          type: defaultType,
          title: "",
          description: "",
          categoryId: "",
          occurredOn: "",
          locationName: "",
        }}
        today={todayInAppTimeZone()}
      />
    </div>
  );
}
