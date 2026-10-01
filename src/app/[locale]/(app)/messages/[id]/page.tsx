import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { getConversation } from "@/lib/queries/conversations";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/messages/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Messages",
  });
  return { title: t("conversation.title") };
}

// One conversation of the signed-in user (participants only; RLS returns
// nothing to anyone else, so they get the 404 page). P8.S2 only needs this
// route as the target of "Contact": it shows who the conversation is with and
// which report it is about. The messages themselves come in P8.S4.
export default async function ConversationPage({
  params,
}: PageProps<"/[locale]/messages/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireUser(`/messages/${id}`);
  const conversation = await getConversation(id, user.id);
  if (!conversation) notFound();

  const t = await getTranslations("Messages.conversation");
  const { item, other } = conversation;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="flex items-center gap-3">
        <UserAvatar
          name={other.display_name}
          avatarPath={other.avatar_path}
          className="size-12"
        />
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight break-words">
          {t("with", { name: other.display_name })}
        </h1>
      </div>

      <section className="grid gap-2 rounded-xl border bg-card p-4 shadow-xs">
        <h2 className="text-xs text-muted-foreground">{t("about")}</h2>
        {item ? (
          <div className="flex flex-wrap items-center gap-2">
            <ItemTypeBadge type={item.type} />
            <Link
              href={`/items/${item.id}`}
              className="min-w-0 font-medium break-words text-primary underline-offset-4 hover:underline"
            >
              {item.title}
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("itemUnavailable")}
          </p>
        )}
      </section>

      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <MessageCircle className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">{t("started")}</p>
        <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
      </div>
    </div>
  );
}
