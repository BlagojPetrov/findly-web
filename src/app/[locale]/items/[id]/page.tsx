import {
  CalendarDays,
  Clock,
  ExternalLink,
  EyeOff,
  MapPin,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import type { ReactNode } from "react";
import { CategoryIcon } from "@/components/items/category-icon";
import { ImageGallery } from "@/components/items/image-gallery";
import { ItemOwnerActions } from "@/components/items/item-owner-actions";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { ItemMap, MapFrame } from "@/components/map";
import { UserAvatar } from "@/components/profile/user-avatar";
import { getCurrentUser } from "@/lib/auth";
import { calendarDay } from "@/lib/dates";
import { itemImageUrl } from "@/lib/item-images";
import { osmUrl } from "@/lib/map";
import { categoryName } from "@/lib/queries/categories";
import { getItem } from "@/lib/queries/items";
import { localeAlternates, metaDescription, openGraphBase } from "@/lib/seo";

// "Lost: <title>", a description from the category, place, date and the
// report's text, canonical + hreflang URLs, and the cover photo for link
// previews. Missing and (for other viewers) hidden items get no metadata;
// the page itself answers with 404.
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/items/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const item = await getItem(id);
  if (!item) return {};

  const [t, format] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: "Items" }),
    getFormatter({ locale: locale as Locale }),
  ]);
  const title = `${t(`badges.${item.type}`)}: ${item.title}`;
  const facts = [
    categoryName(item.category, locale),
    item.location_name,
    format.dateTime(calendarDay(item.occurred_on), {
      dateStyle: "long",
      timeZone: "UTC",
    }),
  ]
    .filter(Boolean)
    .join(" · ");
  // Macedonian dates end with "г." already.
  const description = metaDescription(
    `${facts}${facts.endsWith(".") ? "" : "."} ${item.description}`,
  );
  const alternates = localeAlternates(`/items/${item.id}`, locale);
  const cover = item.images[0];

  return {
    title,
    description,
    alternates,
    // Only the owner and admins can open hidden items.
    robots: item.status === "hidden" ? { index: false } : undefined,
    openGraph: {
      ...openGraphBase(locale),
      type: "article",
      title,
      description,
      url: alternates.canonical,
      publishedTime: item.created_at,
      modifiedTime: item.updated_at,
      images: cover
        ? [{ url: itemImageUrl(cover.storage_path), alt: item.title }]
        : undefined,
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium break-words">{children}</dd>
      </div>
    </div>
  );
}

// Public page of a lost/found report. RLS decides visibility: a hidden item
// is not returned to other users, so they get the 404 page.
export default async function ItemPage({
  params,
}: PageProps<"/[locale]/items/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const [item, viewer] = await Promise.all([getItem(id), getCurrentUser()]);
  if (!item) notFound();

  const [t, format] = await Promise.all([
    getTranslations("Items"),
    getFormatter(),
  ]);
  const isOwner = viewer?.id === item.user_id;
  // Always set since P5.S3 (generated columns are typed as nullable).
  const point =
    item.lat !== null && item.lng !== null
      ? { lat: item.lat, lng: item.lng }
      : null;
  const icon = "size-4";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      {item.status === "hidden" && (
        <p className="mb-6 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("detail.hiddenNotice")}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <ImageGallery
          urls={item.images.map((image) => itemImageUrl(image.storage_path))}
          alt={item.title}
          placeholder={
            <CategoryIcon name={item.category.icon} className="size-12" />
          }
        />

        <div className="grid content-start gap-6">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ItemTypeBadge type={item.type} />
              {item.status === "resolved" && (
                <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {t("status.resolved")}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
              {item.title}
            </h1>
            {item.status === "resolved" && (
              <p className="text-sm text-muted-foreground">
                {t(`detail.resolvedNotice.${item.type}`)}
              </p>
            )}
          </div>

          <dl className="grid gap-4 rounded-xl border bg-card p-5 shadow-xs">
            <Detail
              icon={<CategoryIcon name={item.category.icon} className={icon} />}
              label={t("detail.category")}
            >
              {categoryName(item.category, locale)}
            </Detail>
            <Detail
              icon={<CalendarDays className={icon} aria-hidden />}
              label={t(`detail.occurredOn.${item.type}`)}
            >
              {format.dateTime(calendarDay(item.occurred_on), {
                dateStyle: "long",
                timeZone: "UTC",
              })}
            </Detail>
            {item.location_name && (
              <Detail
                icon={<MapPin className={icon} aria-hidden />}
                label={t("detail.location")}
              >
                {item.location_name}
              </Detail>
            )}
            <Detail
              icon={<Clock className={icon} aria-hidden />}
              label={t("detail.posted")}
            >
              {format.dateTime(new Date(item.created_at), {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </Detail>
          </dl>

          <div className="flex items-center gap-3">
            <UserAvatar
              name={item.owner.display_name}
              avatarPath={item.owner.avatar_path}
              className="size-10"
            />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">
                {t("detail.postedBy", { name: item.owner.display_name })}
              </p>
              <p className="text-muted-foreground">
                {t("detail.memberSince", {
                  date: format.dateTime(new Date(item.owner.created_at), {
                    month: "long",
                    year: "numeric",
                  }),
                })}
              </p>
            </div>
          </div>

          {isOwner && (
            <section className="grid gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div>
                <h2 className="text-sm font-semibold">
                  {t("detail.ownerTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t(
                    item.status === "hidden"
                      ? "detail.ownerHintHidden"
                      : "detail.ownerHint",
                  )}
                </p>
              </div>
              <ItemOwnerActions
                itemId={item.id}
                status={item.status}
                redirectAfterDelete="/dashboard"
              />
            </section>
          )}
        </div>
      </div>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold">{t("detail.description")}</h2>
        <p className="mt-2 leading-relaxed break-words whitespace-pre-line">
          {item.description}
        </p>
      </section>

      {point && (
        <section className="mt-10 grid max-w-3xl gap-3">
          <h2 className="text-lg font-semibold">{t("detail.location")}</h2>
          {/* A failing map shows a message; the link works without it. */}
          <MapFrame
            label={t(`detail.mapLabel.${item.type}`)}
            className="aspect-4/3 sm:aspect-video"
          >
            <ItemMap
              point={point}
              pinLabel={item.location_name ?? item.title}
            />
          </MapFrame>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            {item.location_name && (
              <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4 shrink-0" aria-hidden />
                <span className="break-words">{item.location_name}</span>
              </p>
            )}
            <a
              href={osmUrl(point)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("detail.openInOsm")}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
