import { ShieldCheck } from "lucide-react";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth";

// Admin area (§18). Non-admins get the 404 page, so the area is not
// advertised; guests are sent to the login page by the proxy. Layouts do not
// re-run on navigation, so every admin page and action checks requireAdmin()
// itself as well, and RLS / the admin RPCs have the final word.
export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireAdmin("/admin");
  const t = await getTranslations("Admin");

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="grid gap-4">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
          <ShieldCheck className="size-4" aria-hidden />
          {t("area")}
        </p>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
