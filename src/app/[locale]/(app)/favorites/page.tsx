import { CircleAlert, Heart, PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemCard } from "@/components/items/item-card";
import { Pagination } from "@/components/search/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { pageCount, parsePage } from "@/lib/pagination";
import { FAVORITES_PAGE_SIZE, getFavoritePage } from "@/lib/queries/favorites";
import { cn } from "@/lib/utils";
import { requestQuery } from "@/lib/validation/search";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/favorites">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Favorites",
  });
  return { title: t("page.title") };
}

// "?page=2" and up; page 1 has no parameter.
function pageHref(page: number) {
  return page > 1
    ? { pathname: "/favorites" as const, query: { page } }
    : "/favorites";
}

// The signed-in user's saved reports that are still listed (active or
// resolved), most recently saved first, paged. The heart on a card removes
// it; the action refreshes the page, so the card disappears.
export default async function FavoritesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/favorites">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const raw = await searchParams;
  const page = parsePage(raw.page);
  const canonical = page > 1 ? `page=${page}` : "";
  const user = await requireUser(
    canonical ? `/favorites?${canonical}` : "/favorites",
  );
  // Unknown parameters, "page=1", "page=abc": one URL per page.
  if (requestQuery(raw) !== canonical) {
    redirect({ href: pageHref(page), locale: locale as Locale });
  }

  const [result, t] = await Promise.all([
    // A failed query shows a message instead of breaking the page.
    getFavoritePage(user.id, page).catch((error) => {
      console.error(error);
      return null;
    }),
    getTranslations("Favorites"),
  ]);

  const totalPages = result ? pageCount(result.total, FAVORITES_PAGE_SIZE) : 1;
  // Past the last page (e.g. after removing the last favorite of a page).
  if (result && page > totalPages) {
    redirect({ href: pageHref(totalPages), locale: locale as Locale });
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("page.description")}
        </p>
      </div>

      {result === null ? (
        <p
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("page.error")}
        </p>
      ) : result.total === 0 ? (
        <section className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <Heart className="size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            {t("page.empty")}
          </p>
          <Link
            href="/items"
            className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
          >
            <PackageSearch aria-hidden />
            {t("page.browse")}
          </Link>
        </section>
      ) : (
        <section aria-labelledby="favorites-count" className="grid gap-4">
          <h2 id="favorites-count" className="text-sm text-muted-foreground">
            {t("page.count", { count: result.total })}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((item) => (
              <li key={item.id} className="grid">
                <ItemCard item={item} favorite={{ signedIn: true }} />
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} href={pageHref} />
        </section>
      )}
    </div>
  );
}
