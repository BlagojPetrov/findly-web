import { Ban } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";

// Tells a banned user why nothing can be saved: they can sign in and read,
// but the database refuses every write (§18). The ban state is read per
// request (getCurrentUser), so the notice appears on the next page load or
// refresh after an admin bans the user and goes away after an unban.
export async function BannedNotice() {
  const user = await getCurrentUser();
  if (!user?.profile.is_banned) return null;
  const t = await getTranslations("Moderation.banned");

  return (
    <div
      role="status"
      className="border-b border-destructive/30 bg-destructive/10 text-destructive"
    >
      <div className="mx-auto flex max-w-6xl gap-2 px-4 py-2.5 text-sm">
        <Ban className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">{t("title")}</span> {t("body")}
        </p>
      </div>
    </div>
  );
}
