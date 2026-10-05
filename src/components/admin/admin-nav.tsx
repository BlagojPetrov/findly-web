"use client";

import { LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Sections of the admin area. P10.S4–P10.S6 add reports, users and
// categories here.
const sections = [
  { href: "/admin", key: "overview", icon: LayoutDashboard },
] as const;

// Tabs of the admin area; the current section is marked with aria-current.
export function AdminNav() {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 border-b">
        {sections.map(({ href, key, icon: Icon }) => {
          const current =
            href === "/admin"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                  current && "border-primary text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
