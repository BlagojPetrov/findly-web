import { BellRing, FilePlus2, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryIcon } from "@/components/items/category-icon";
import { createClient } from "@/lib/supabase/server";
import { localeAlternates } from "@/lib/seo";

const steps = [
  { key: "report", icon: FilePlus2 },
  { key: "match", icon: BellRing },
  { key: "contact", icon: MessagesSquare },
] as const;

// Title and description come from the layout.
export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localeAlternates("/", locale) };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, slug, name_mk, name_en, icon")
    .order("sort_order");
  if (error) console.error("Failed to load categories:", error);

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-16 text-center sm:py-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
          {t("subtitle")}
        </p>
      </section>

      <section className="pb-16">
        <h2 className="mb-6 text-2xl font-semibold">{t("stepsTitle")}</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map(({ key, icon: Icon }) => (
            <li key={key} className="rounded-xl border bg-card p-5">
              <Icon className="size-6 text-primary" aria-hidden />
              <h3 className="mt-3 font-semibold">{t(`steps.${key}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`steps.${key}.description`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="pb-16">
        <h2 className="mb-6 text-2xl font-semibold">{t("categoriesTitle")}</h2>
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {t("categoriesError")}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-4"
              >
                <CategoryIcon
                  name={category.icon}
                  className="size-5 text-primary"
                />
                <span className="font-medium">
                  {locale === "mk" ? category.name_mk : category.name_en}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
