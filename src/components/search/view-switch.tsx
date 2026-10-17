import { List, Map as MapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { LinkPendingMarker } from "@/components/search/pending-marker";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  type SearchFilters,
  type SearchView,
  searchQuery,
} from "@/lib/validation/search";

const views: { view: SearchView; icon: typeof List }[] = [
  { view: "list", icon: List },
  { view: "map", icon: MapIcon },
];

// List / Map switch of the feed (P11.S3): two links to the same filters in
// the other view (the map has no pages, so the list opens on page 1). Plain
// links, so it works without JavaScript; the current view is
// `aria-current="page"`.
export function ViewSwitch({ filters }: { filters: SearchFilters }) {
  const t = useTranslations("Search.views");

  return (
    <nav aria-label={t("label")} className="flex gap-1.5">
      {views.map(({ view, icon: Icon }) => {
        const current = filters.view === view;
        return (
          <Link
            key={view}
            href={{
              pathname: "/items",
              query: searchQuery({ ...filters, view }),
            }}
            scroll={false}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              current && "border-primary bg-primary/5 font-medium",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(view)}
            <LinkPendingMarker />
          </Link>
        );
      })}
    </nav>
  );
}
