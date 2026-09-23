import { SearchCheck } from "lucide-react";
import { Suspense } from "react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Link } from "@/i18n/navigation";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <SearchCheck className="size-5 text-primary" aria-hidden />
          Findly
        </Link>
        <Suspense>
          <LocaleSwitcher />
        </Suspense>
      </div>
    </header>
  );
}
