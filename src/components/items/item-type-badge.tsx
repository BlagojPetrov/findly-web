import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const styles = {
  lost: "border-lost/30 bg-lost/10 text-lost",
  found: "border-found/30 bg-found/10 text-found",
};

// "Lost" / "Found" label in the item type's color.
export function ItemTypeBadge({
  type,
  className,
}: {
  type: "lost" | "found";
  className?: string;
}) {
  const t = useTranslations("Items.badges");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        styles[type],
        className,
      )}
    >
      {t(type)}
    </span>
  );
}
