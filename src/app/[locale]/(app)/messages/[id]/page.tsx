import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChatView } from "@/components/chat/chat-view";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import {
  getConversation,
  getLatestMessages,
} from "@/lib/queries/conversations";

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
// nothing to anyone else, so they get the 404 page): who it is with, which
// report it is about, and the chat (the newest messages from the server,
// then live in the browser; §16).
export default async function ConversationPage({
  params,
}: PageProps<"/[locale]/messages/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireUser(`/messages/${id}`);
  const conversation = await getConversation(id, user.id);
  if (!conversation) notFound();

  const [t, latest] = await Promise.all([
    getTranslations("Messages.conversation"),
    getLatestMessages(conversation.id),
  ]);
  const { item, other } = conversation;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <Link
        href="/messages"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>

      <div className="flex items-center gap-3">
        <UserAvatar
          name={other.display_name}
          avatarPath={other.avatar_path}
          className="size-11 shrink-0"
        />
        <div className="grid min-w-0 gap-0.5">
          <h1 className="text-xl font-semibold tracking-tight break-words">
            {t("with", { name: other.display_name })}
          </h1>
          {item ? (
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="sr-only">{t("about")}: </span>
              <ItemTypeBadge type={item.type} />
              <Link
                href={`/items/${item.id}`}
                className="min-w-0 font-medium break-words text-primary underline-offset-4 hover:underline"
              >
                {item.title}
              </Link>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("itemUnavailable")}
            </p>
          )}
        </div>
      </div>

      <ChatView
        conversationId={conversation.id}
        viewerId={user.id}
        otherName={other.display_name}
        initialMessages={latest.messages}
        initialHasMore={latest.hasMore}
        canSend={!user.profile.is_banned}
      />
    </div>
  );
}
