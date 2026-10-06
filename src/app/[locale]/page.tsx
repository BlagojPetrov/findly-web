import {
  ArrowRight,
  BellRing,
  FilePlus2,
  MessagesSquare,
  Search,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Form from "next/form";
import { type Locale, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
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
import heroImage from "../../../public/images/hero-returning-keys.jpg";

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
    <>
      <section className="relative isolate overflow-hidden">
        {/* Decoration: a soft purple glow and a dot grid fading out. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] mask-b-from-0% mask-b-to-80% bg-size-[22px_22px]"
        />
        <div
          aria-hidden
          className="absolute -top-48 left-1/2 -z-10 size-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl lg:left-3/4"
        />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20 lg:pb-24">
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              {t("eyebrow")}
            </p>
            <h1 className="mt-5 text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]">
              {t.rich("title", {
                accent: (chunks) => (
                  <span className="text-primary">{chunks}</span>
                ),
              })}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground lg:mx-0">
              {t("subtitle")}
            </p>

            {/* A GET form to the feed, so it also works without JavaScript. */}
            <Form
              action={getPathname({ href: "/items", locale })}
              role="search"
              className="mx-auto mt-8 flex max-w-xl items-center gap-1 rounded-2xl border bg-background p-2 shadow-xl shadow-primary/10 transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 lg:mx-0"
            >
              <Label htmlFor="home-search" className="sr-only">
                {t("searchLabel")}
              </Label>
              <Search
                className="ml-3 size-5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="home-search"
                type="search"
                name="q"
                required
                placeholder={t("searchPlaceholder")}
                maxLength={SEARCH_LIMITS.queryMax}
                enterKeyHint="search"
                className="h-12 border-0 bg-transparent px-2 text-base shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 rounded-xl px-6 text-base max-sm:px-4"
              >
                <span className="max-sm:sr-only">{t("submitSearch")}</span>
                <ArrowRight aria-hidden className="sm:hidden" />
              </Button>
            </Form>

            <div className="mt-5 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/items/new"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-10 rounded-xl px-4",
                )}
              >
                <FilePlus2 aria-hidden />
                {t("reportItem")}
              </Link>
              <Link
                href="/items"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-10 rounded-xl px-4",
                )}
              >
                {t("browseAll")}
                <ArrowRight aria-hidden />
              </Link>
            </div>
          </div>

          <HeroImage
            alt={t("heroImageAlt")}
            cardTitle={t("heroCard.title")}
            cardDescription={t("heroCard.description")}
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <LatestItems type="lost" items={lost.items} signedIn={signedIn} />
        <LatestItems type="found" items={found.items} signedIn={signedIn} />

        <section aria-labelledby="home-categories" className="pb-20">
          <SectionHeading
            id="home-categories"
            title={t("categoriesTitle")}
            description={t("categoriesDescription")}
          />
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.id} className="grid">
                <Link
                  href={{
                    pathname: "/items",
                    query: searchQuery({ categories: [category.slug] }),
                  }}
                  className="group flex items-center gap-3 rounded-2xl border bg-card p-3 font-medium transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <CategoryIcon name={category.icon} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm [overflow-wrap:anywhere] sm:text-base">
                    {categoryName(category, locale)}
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-primary opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 max-sm:hidden"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section
        aria-labelledby="home-steps"
        className="border-t bg-muted/40 py-20"
      >
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading
            id="home-steps"
            title={t("stepsTitle")}
            description={t("stepsDescription")}
            centered
          />
          <ol className="mt-12 grid gap-5 sm:grid-cols-3">
            {steps.map(({ key, icon: Icon }, index) => (
              <li
                key={key}
                className="relative rounded-2xl border bg-card p-6 text-center shadow-xs"
              >
                <span className="relative mx-auto grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                  <Icon className="size-5" aria-hidden />
                </span>
                <p className="mt-4 text-xs font-semibold tracking-widest text-primary tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {t(`steps.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
                  {t(`steps.${key}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

// The hero photo in a framed card with a floating "match" note.
function HeroImage({
  alt,
  cardTitle,
  cardDescription,
}: {
  alt: string;
  cardTitle: string;
  cardDescription: string;
}) {
  return (
    <div className="relative mx-auto w-full max-w-xl pb-8 lg:pb-0">
      <div
        aria-hidden
        className="absolute -inset-3 -z-10 rotate-2 rounded-[2rem] bg-linear-to-br from-primary/30 via-primary/10 to-transparent sm:-inset-4"
      />
      <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 shadow-primary/20 ring-foreground/5">
        <Image
          src={heroImage}
          alt={alt}
          placeholder="blur"
          preload
          sizes="(min-width: 1024px) 560px, (min-width: 640px) 576px, 100vw"
          className="aspect-4/3 w-full object-cover"
        />
      </div>

      <div className="absolute bottom-0 left-3 flex max-w-[17rem] items-start gap-3 rounded-2xl border bg-background/95 p-3.5 shadow-xl backdrop-blur sm:left-6 lg:-bottom-6 lg:-left-8">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-found/10 text-found">
          <BellRing className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{cardTitle}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {cardDescription}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  title,
  description,
  marker,
  action,
  centered = false,
}: {
  id: string;
  title: string;
  description: string;
  marker?: ReactNode;
  action?: ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        centered && "justify-center text-center",
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        <h2
          id={id}
          className={cn(
            "flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl",
            centered && "justify-center",
          )}
        >
          {marker}
          {title}
        </h2>
        <p className="mt-2 text-pretty text-muted-foreground">{description}</p>
      </div>
      {action}
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
    <section aria-labelledby={id} className="pb-20 first:pt-4">
      <SectionHeading
        id={id}
        title={t(`latest.${type}`)}
        description={t(`latestDescription.${type}`)}
        marker={
          <span
            aria-hidden
            className={cn(
              "size-2.5 shrink-0 rounded-full ring-4",
              type === "lost"
                ? "bg-lost ring-lost/15"
                : "bg-found ring-found/15",
            )}
          />
        }
        action={
          items.length > 0 && (
            <Link
              href={seeAll}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-9 rounded-xl px-3.5",
              )}
            >
              {t(`seeAll.${type}`)}
              <ArrowRight aria-hidden />
            </Link>
          )
        }
      />

      {items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
          {t(`latestEmpty.${type}`)}
        </p>
      ) : (
        // Phones: one row to swipe through (the next card peeks in) instead
        // of a long column; wider screens: a grid.
        <ul className="mt-8 grid gap-5 max-sm:-mx-4 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-2 sm:grid-cols-2 lg:grid-cols-4">
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
