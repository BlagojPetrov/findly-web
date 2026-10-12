"use client";

import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./globals.css";

// Errors of the locale layout itself (header, providers). This replaces the
// whole document, without the translations, so the texts are here: English
// for /en paths, Macedonian (the default locale) otherwise. Plain links,
// because the router may be what failed.
// Same font as the locale layout: --font-sans needs --font-inter.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const texts = {
  mk: {
    title: "Нешто тргна наопаку",
    description:
      "Страницата не можеше да се прикаже. Обидете се повторно или вратете се на почетната страница.",
    retry: "Обиди се повторно",
    backHome: "Назад на почетна",
    code: "Код на грешката:",
    home: "/",
  },
  en: {
    title: "Something went wrong",
    description:
      "This page could not be shown. Try again or go back to the home page.",
    retry: "Try again",
    backHome: "Back to home",
    code: "Error code:",
    home: "/en",
  },
};

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();
  const locale = /^\/en(\/|$)/.test(pathname ?? "") ? "en" : "mk";
  const t = texts[locale];

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang={locale}
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <ThemeProvider>
          <title>{t.title}</title>
          <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
            <p className="text-lg font-semibold tracking-tight">Findly</p>
            <h1 className="mt-6 text-2xl font-semibold">{t.title}</h1>
            <p className="mt-2 text-muted-foreground">{t.description}</p>
            {error.digest && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t.code} {error.digest}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => retry()}>{t.retry}</Button>
              <a
                href={t.home}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                {t.backHome}
              </a>
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
