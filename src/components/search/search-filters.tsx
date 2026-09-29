import { Search, SlidersHorizontal } from "lucide-react";
import Form from "next/form";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CategoryIcon } from "@/components/items/category-icon";
import { NearFilter } from "@/components/search/near-filter";
import { FormPendingMarker } from "@/components/search/pending-marker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  availableSorts,
  DEFAULT_SEARCH_FILTERS,
  SEARCH_LIMITS,
  SEARCH_STATUSES,
  type SearchFilters as Filters,
} from "@/lib/validation/search";

export type CategoryOption = { slug: string; icon: string; name: string };

// Number of filters in the panel that differ from the defaults (the search
// text and the sort are not counted).
export function activeFilterCount(filters: Filters) {
  return [
    filters.type !== null,
    filters.categories.length > 0,
    filters.status !== DEFAULT_SEARCH_FILTERS.status,
    filters.from !== null || filters.to !== null,
    filters.near !== null,
  ].filter(Boolean).length;
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      {children}
    </fieldset>
  );
}

// A radio or checkbox styled as a selectable pill / row.
function Choice({
  type,
  name,
  value,
  defaultChecked,
  children,
  className,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  defaultChecked: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/5 has-checked:font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      {children}
    </label>
  );
}

// Filter form of the public feed. A GET form (next/form): without
// JavaScript the browser submits it normally, with JavaScript it navigates
// on the client. Either way the filters end up in the URL, and the page
// redirects to the canonical URL. The page remounts this form when the URL
// changes, so back/forward always show the URL's filters.
// On small screens the panel is collapsed behind a CSS-only toggle.
export function SearchFilters({
  action,
  filters,
  categories,
  today,
}: {
  // The localized feed path ("/items" or "/en/items").
  action: string;
  filters: Filters;
  categories: CategoryOption[];
  // "YYYY-MM-DD" in Macedonia; the latest selectable date.
  today: string;
}) {
  const t = useTranslations("Search");
  const active = activeFilterCount(filters);
  const sorts = availableSorts(filters);

  return (
    <Form
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-4 shadow-xs lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="search-q">{t("searchLabel")}</Label>
        <div className="flex gap-2">
          <Input
            id="search-q"
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder={t("searchPlaceholder")}
            maxLength={SEARCH_LIMITS.queryMax}
            enterKeyHint="search"
          />
          <Button type="submit" size="icon" aria-label={t("submitSearch")}>
            <Search aria-hidden />
          </Button>
        </div>
      </div>

      {/* No name, so it is never submitted. */}
      <input
        id="search-filters-toggle"
        type="checkbox"
        aria-controls="search-filters-panel"
        className="peer sr-only"
      />
      <label
        htmlFor="search-filters-toggle"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "cursor-pointer justify-start peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 lg:hidden",
        )}
      >
        <SlidersHorizontal aria-hidden />
        {t("filters")}
        {active > 0 && (
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            {t("filtersActive", { count: active })}
          </span>
        )}
      </label>

      <div
        id="search-filters-panel"
        className="hidden gap-5 peer-checked:grid lg:grid"
      >
        <Group legend={t("type")}>
          <div className="flex flex-wrap gap-1.5">
            {([null, "lost", "found"] as const).map((type) => (
              <Choice
                key={type ?? "all"}
                type="radio"
                name="type"
                value={type ?? ""}
                defaultChecked={filters.type === type}
                className="flex-auto justify-center"
              >
                {t(`types.${type ?? "all"}`)}
              </Choice>
            ))}
          </div>
        </Group>

        <Group legend={t("categories")}>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {categories.map((category) => (
              <Choice
                key={category.slug}
                type="checkbox"
                name="category"
                value={category.slug}
                defaultChecked={filters.categories.includes(category.slug)}
              >
                <CategoryIcon
                  name={category.icon}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate">{category.name}</span>
              </Choice>
            ))}
          </div>
        </Group>

        <Group legend={t("dates")}>
          {/* Side by side on phones; stacked in the narrow sidebar. */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <div className="grid gap-1">
              <Label htmlFor="search-from" className="text-xs font-normal">
                {t("from")}
              </Label>
              <Input
                id="search-from"
                type="date"
                name="from"
                defaultValue={filters.from ?? ""}
                max={today}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="search-to" className="text-xs font-normal">
                {t("to")}
              </Label>
              <Input
                id="search-to"
                type="date"
                name="to"
                defaultValue={filters.to ?? ""}
                max={today}
              />
            </div>
          </div>
        </Group>

        <Group legend={t("near.legend")}>
          <NearFilter
            defaultNear={filters.near}
            defaultRadius={filters.radius}
          />
        </Group>

        <Group legend={t("status")}>
          <div className="flex flex-wrap gap-1.5">
            {SEARCH_STATUSES.map((status) => (
              <Choice
                key={status}
                type="radio"
                name="status"
                value={status}
                defaultChecked={filters.status === status}
                className="flex-auto justify-center"
              >
                {t(`statuses.${status}`)}
              </Choice>
            ))}
          </div>
        </Group>

        {/* Only a search text can be ranked and only a center gives
            distances; without either the list is newest first and there is
            nothing to choose. */}
        {sorts.length > 1 && (
          <Group legend={t("sort")}>
            <div className="flex flex-wrap gap-1.5">
              {sorts.map((sort) => (
                <Choice
                  key={sort}
                  type="radio"
                  name="sort"
                  value={sort}
                  defaultChecked={filters.sort === sort}
                  className="flex-auto justify-center"
                >
                  {t(`sorts.${sort}`)}
                </Choice>
              ))}
            </div>
          </Group>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="flex-1">
            {t("apply")}
          </Button>
          {(active > 0 || filters.q) && (
            <Link
              href="/items"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              {t("clear")}
            </Link>
          )}
        </div>
      </div>
      <FormPendingMarker />
    </Form>
  );
}
