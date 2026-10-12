"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Unexpected errors of a page (not of the locale layout: that is
// global-error.tsx). Rendered inside the site layout, so the header and the
// translations still work. In production a server error has no message,
// only a digest that matches the server log.
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <title>{t("title")}</title>
      <TriangleAlert aria-hidden className="size-12 text-destructive" />
      <h1 className="mt-4 text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("code", { digest: error.digest })}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>{t("retry")}</Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
