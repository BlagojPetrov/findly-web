import { useTranslations } from "next-intl";
import { ResultsMap } from "@/components/map/results-map";
import { Link } from "@/i18n/navigation";
import type { MapItem } from "@/lib/map-items";
import { type SearchFilters, searchQuery } from "@/lib/validation/search";

// The results of the feed's map view (P11.S3): a notice when the map shows
// only the first of more matching reports, a link to the list for browsers
// without JavaScript, and the map. The feed renders its empty state instead
// when nothing matches.
export function MapResults({
  filters,
  items,
  total,
}: {
  filters: SearchFilters;
  items: MapItem[];
  total: number;
}) {
  const t = useTranslations("Search.map");

  return (
    <div className="grid gap-2">
      {total > items.length && (
        <p
          role="status"
          className="rounded-lg border bg-muted/50 px-3 py-2 text-sm"
        >
          {t("partial", { shown: items.length, count: total })}
        </p>
      )}
      <noscript>
        <p className="text-sm text-muted-foreground">
          {t("noScript")}{" "}
          <Link
            href={{
              pathname: "/items",
              query: searchQuery({ ...filters, view: "list" }),
            }}
            className="font-medium text-foreground underline underline-offset-2"
          >
            {t("noScriptLink")}
          </Link>
        </p>
      </noscript>
      <ResultsMap
        items={items}
        circle={
          filters.near && filters.radius
            ? { center: filters.near, radiusKm: filters.radius }
            : null
        }
      />
    </div>
  );
}
