import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { LinkPendingMarker } from "@/components/search/pending-marker";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageItems } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type Href = ComponentProps<typeof Link>["href"];

// Page links for a paged list. `href(page)` builds each page's URL (for the
// feed: searchQuery() with the page, so the filters are kept). Plain links,
// so it works without JavaScript; while a page loads, its link marks itself
// as pending (`LinkPendingMarker`). Phones get previous/next and "page x of y";
// wider screens also get the page numbers.
export function Pagination({
  page,
  totalPages,
  href,
}: {
  page: number;
  totalPages: number;
  href: (page: number) => Href;
}) {
  const t = useTranslations("Pagination");
  if (totalPages <= 1) return null;

  const edge = cn(buttonVariants({ variant: "outline" }), "min-w-8");
  const disabledEdge = cn(edge, "pointer-events-none opacity-50");

  return (
    <nav
      aria-label={t("label")}
      className="flex items-center justify-between gap-2 sm:justify-center"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={edge}>
          <ChevronLeft aria-hidden />
          <span className="max-sm:sr-only">{t("previous")}</span>
          <LinkPendingMarker />
        </Link>
      ) : (
        <span aria-disabled className={disabledEdge}>
          <ChevronLeft aria-hidden />
          <span className="max-sm:sr-only">{t("previous")}</span>
        </span>
      )}

      <p className="text-sm text-muted-foreground sm:hidden">
        {t("pageOf", { page, totalPages })}
      </p>

      <ul className="hidden items-center gap-1 sm:flex">
        {pageItems(page, totalPages).map((item, i) =>
          item === "gap" ? (
            <li
              key={`gap-${i}`}
              aria-hidden
              className="w-8 text-center text-muted-foreground"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={href(item)}
                aria-label={t("page", { page: item })}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: item === page ? "default" : "ghost",
                  }),
                  "min-w-8 tabular-nums",
                )}
              >
                {item}
                <LinkPendingMarker />
              </Link>
            </li>
          ),
        )}
      </ul>

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={edge}>
          <span className="max-sm:sr-only">{t("next")}</span>
          <ChevronRight aria-hidden />
          <LinkPendingMarker />
        </Link>
      ) : (
        <span aria-disabled className={disabledEdge}>
          <span className="max-sm:sr-only">{t("next")}</span>
          <ChevronRight aria-hidden />
        </span>
      )}
    </nav>
  );
}
