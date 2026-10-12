import { CircleAlert, MessageCircle, Search } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversationList } from "@/components/chat/conversation-list";
import { RefreshOnMessages } from "@/components/chat/refresh-on-messages";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import {
  type ConversationSummary,
  unreadConversationCount,
} from "@/lib/conversations";
import { getMyConversations } from "@/lib/queries/conversations";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/messages">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Messages.list",
  });
  return { title: t("title") };
}

// The signed-in user's conversations, newest activity first, with unread
// counts (§16). A failed query shows a message instead of breaking the page.
// New messages and reads re-render it (events from the header's
// subscription). In the (list) group so its loading.tsx does not wrap
// /messages/[id], which answers 404 (F-23).
export default async function MessagesPage({
  params,
}: PageProps<"/[locale]/messages">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireUser("/messages");
  const t = await getTranslations("Messages.list");

  let conversations: ConversationSummary[] | null;
  try {
    conversations = await getMyConversations(user.id);
  } catch (error) {
    console.error(error);
    conversations = null;
  }
  const unread = conversations ? unreadConversationCount(conversations) : 0;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <RefreshOnMessages />
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        {conversations && conversations.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("summary", { count: conversations.length })}
            {unread > 0 && ` · ${t("unreadSummary", { count: unread })}`}
          </p>
        )}
      </div>

      {conversations === null ? (
        <p
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("error")}
        </p>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
          <MessageCircle className="size-8 text-muted-foreground" aria-hidden />
          <div className="grid gap-1">
            <p className="font-medium">{t("empty.title")}</p>
            <p className="text-sm text-muted-foreground">{t("empty.hint")}</p>
          </div>
          <Link
            href="/items"
            className={cn(buttonVariants({ variant: "outline" }), "mt-1")}
          >
            <Search aria-hidden />
            {t("empty.browse")}
          </Link>
        </div>
      ) : (
        <ConversationList conversations={conversations} />
      )}
    </div>
  );
}
