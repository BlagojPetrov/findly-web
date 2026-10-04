"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { addFavorite, removeFavorite } from "@/actions/favorites";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { cn } from "@/lib/utils";

const styles = {
  // Round button over a card's photo.
  icon: cn(
    buttonVariants({ variant: "outline", size: "icon-lg" }),
    "rounded-full bg-background/90 shadow-xs dark:bg-background/90",
  ),
  // Button with text (item page).
  full: buttonVariants({ variant: "outline", size: "lg" }),
};

// Saves a report to the user's favorites or removes it (§17). The heart
// changes at once (useOptimistic); the action refreshes the page, so the
// stored state takes over, and a failure turns it back with a toast.
// Guests get a link to the login page that returns to the report.
export function FavoriteButton({
  itemId,
  isFavorite,
  signedIn,
  variant = "icon",
  className,
}: {
  itemId: string;
  isFavorite: boolean;
  signedIn: boolean;
  variant?: "icon" | "full";
  className?: string;
}) {
  const t = useTranslations("Favorites");
  const tErrors = useTranslations("Errors");
  const [optimistic, setOptimistic] = useOptimistic(isFavorite);
  const [, startTransition] = useTransition();

  const heart = (
    <Heart
      aria-hidden
      className={cn(optimistic && "fill-primary text-primary")}
    />
  );
  const text = variant === "full" && (
    <span>{t(optimistic ? "saved" : "save")}</span>
  );

  if (!signedIn) {
    return (
      <Link
        href={{ pathname: SIGN_IN_PATH, query: { next: `/items/${itemId}` } }}
        aria-label={variant === "icon" ? t("guestLabel") : undefined}
        title={t("guestLabel")}
        className={cn(styles[variant], className)}
      >
        {heart}
        {text}
      </Link>
    );
  }

  function toggle() {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const data = new FormData();
      data.set("itemId", itemId);
      const result = await (next ? addFavorite : removeFavorite)(data);
      if (!result.ok) toast.error(tErrors(result.error));
    });
  }

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={variant === "icon" ? t("label") : undefined}
      title={t(optimistic ? "removeHint" : "addHint")}
      onClick={toggle}
      className={cn(styles[variant], className)}
    >
      {heart}
      {text}
    </button>
  );
}
