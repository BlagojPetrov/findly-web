import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryManager } from "@/components/admin/category-manager";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategories } from "@/lib/queries/admin";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/categories">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Admin",
  });
  return { title: t("categories.title") };
}

// Category management (§18): add, rename, change the icon, reorder and
// delete unused categories. A failed query shows a message instead of
// breaking the page.
export default async function AdminCategoriesPage({
  params,
}: PageProps<"/[locale]/admin/categories">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireAdmin("/admin/categories");
  const [categories, t] = await Promise.all([
    getAdminCategories().catch((error) => {
      console.error(error);
      return null;
    }),
    getTranslations("Admin.categories"),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>
      {categories ? (
        <CategoryManager categories={categories} locale={locale} />
      ) : (
        <p
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("error")}
        </p>
      )}
    </div>
  );
}
