import {
  ArrowRight,
  BellRing,
  FilePlus2,
  MessagesSquare,
  Search,
} from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import { type Locale, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryIcon } from "@/components/items/category-icon";
import { ItemCard } from "@/components/items/item-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPathname, Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { categoryName, getCategories } from "@/lib/queries/categories";
import { type ItemSummary, searchItems } from "@/lib/queries/items";
import { localeAlternates } from "@/lib/seo";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SEARCH_FILTERS,
  SEARCH_LIMITS,
  searchQuery,
} from "@/lib/validation/search";

const steps = [
  { key: "report", icon: FilePlus2 },
  { key: "match", icon: BellRing },
  { key: "contact", icon: MessagesSquare },
] as const;

// Items per "latest" row (one row of four on wide screens).
const LATEST_COUNT = 4;

// Title and description come from the layout.
export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localeAlternates("/", locale) };
}

// Newest active reports of one type, as in the feed filtered by that type.
function latest(type: "lost" | "found") {
  return searchItems(
    { ...DEFAULT_SEARCH_FILTERS, type },
    { pageSize: LATEST_COUNT },
  );
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const [t, categories, lost, found, viewer] = await Promise.all([
    getTranslations("Home"),
    getCategories(),
    latest("lost"),
    latest("found"),
    getCurrentUser(),
  ]);
  const signedIn = viewer !== null;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-14 text-center sm:py-20">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
          {t("subtitle")}
        </p>

        {/* A GET form to the feed, so it also works without JavaScript. */}
        <Form
          action={getPathname({ href: "/items", locale })}
          role="search"
          className="mx-auto mt-8 flex max-w-xl gap-2"
        >
          <Label htmlFor="home-search" className="sr-only">
            {t("searchLabel")}
          </Label>
          <Input
            id="home-search"
            type="search"
            name="q"
            required
            placeholder={t("searchPlaceholder")}
            maxLength={SEARCH_LIMITS.queryMax}
            enterKeyHint="search"
            className="h-10"
          />
          <Button type="submit" size="lg" className="h-10 px-4">
            <Search aria-hidden />
            <span className="max-sm:sr-only">{t("submitSearch")}</span>
          </Button>
        </Form>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/items/new" className={buttonVariants({ size: "lg" })}>
            <FilePlus2 aria-hidden />
            {t("reportItem")}
          </Link>
          <Link
            href="/items"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {t("browseAll")}
          </Link>
        </div>
      </section>

      <LatestItems type="lost" items={lost.items} signedIn={signedIn} />
      <LatestItems type="found" items={found.items} signedIn={signedIn} />

      <section aria-labelledby="home-categories" className="pb-16">
        <h2 id="home-categories" className="text-2xl font-semibold">
          {t("categoriesTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("categoriesDescription")}
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id} className="grid">
              <Link
                href={{
                  pathname: "/items",
                  query: searchQuery({ categories: [category.slug] }),
                }}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 font-medium transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <CategoryIcon
                  name={category.icon}
                  className="size-5 shrink-0 text-primary"
                />
                <span className="min-w-0 break-words">
                  {categoryName(category, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="home-steps" className="pb-16">
        <h2 id="home-steps" className="mb-6 text-2xl font-semibold">
          {t("stepsTitle")}
        </h2>
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
    </div>
  );
}

// The newest reports of one type with a link to all of them in the feed.
function LatestItems({
  type,
  items,
  signedIn,
}: {
  type: "lost" | "found";
  items: ItemSummary[];
  signedIn: boolean;
}) {
  const t = useTranslations("Home");
  const id = `home-latest-${type}`;
  const seeAll = {
    pathname: "/items",
    query: searchQuery({ type }),
  } as const;

  return (
    <section aria-labelledby={id} className="pb-14">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id={id} className="text-2xl font-semibold">
            {t(`latest.${type}`)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`latestDescription.${type}`)}
          </p>
        </div>
        {items.length > 0 && (
          <Link
            href={seeAll}
            className={cn(buttonVariants({ variant: "ghost" }), "-mr-2.5")}
          >
            {t(`seeAll.${type}`)}
            <ArrowRight aria-hidden />
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          {t(`latestEmpty.${type}`)}
        </p>
      ) : (
        // Phones: one row to swipe through (the next card peeks in) instead
        // of a long column; wider screens: a grid.
        <ul className="mt-6 grid gap-4 max-sm:-mx-4 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-2 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="grid max-sm:w-[78%] max-sm:shrink-0 max-sm:snap-start"
            >
              <ItemCard item={item} favorite={{ signedIn }} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
