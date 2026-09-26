"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

// Photos of an item: the selected photo large, thumbnails below to switch.
// Without photos the placeholder (e.g. the category icon) is shown instead.
export function ImageGallery({
  urls,
  alt,
  placeholder,
}: {
  // Cover first.
  urls: string[];
  // Describes the item (its title); the photo number is added.
  alt: string;
  placeholder: ReactNode;
}) {
  const t = useTranslations("Items.gallery");
  const [index, setIndex] = useState(0);
  const count = urls.length;

  if (count === 0) {
    return (
      <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-xl border bg-muted text-muted-foreground">
        {placeholder}
        <p className="text-sm">{t("noPhotos")}</p>
      </div>
    );
  }

  const show = (next: number) => setIndex((next + count) % count);
  const navButton =
    "absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-sm outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="grid gap-3">
      <div className="relative aspect-4/3 overflow-hidden rounded-xl border bg-muted">
        {/* Storage URLs of already compressed photos (AD-17). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[index]}
          alt={t("photoAlt", { title: alt, number: index + 1, count })}
          className="size-full object-contain"
        />
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => show(index - 1)}
              aria-label={t("previous")}
              className={cn(navButton, "left-2")}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => show(index + 1)}
              aria-label={t("next")}
              className={cn(navButton, "right-2")}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
            <p className="absolute right-2 bottom-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium shadow-sm">
              {index + 1} / {count}
            </p>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {urls.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t("show", { number: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "block aspect-square w-full overflow-hidden rounded-lg border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  i === index
                    ? "ring-2 ring-primary"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
