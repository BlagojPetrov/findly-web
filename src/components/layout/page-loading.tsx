import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

// Fallback of a page's loading.tsx while its server data loads. Only for
// signed-in pages that never redirect to a canonical URL or answer 404: a
// fallback is streamed first, so those would lose their HTTP status (F-23).
export function PageLoading() {
  const t = useTranslations("PageLoading");

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"
    >
      <LoaderCircle aria-hidden className="size-5 animate-spin" />
      {t("label")}
    </div>
  );
}
