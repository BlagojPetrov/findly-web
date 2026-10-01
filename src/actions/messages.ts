"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { type ActionResult, fail, validationError } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { startConversationSchema } from "@/lib/validation/conversations";

type Client = Awaited<ReturnType<typeof createClient>>;

async function findConversation(
  supabase: Client,
  itemId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("item_id", itemId)
    .eq("requester_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

// Contacts the owner of a report: opens the user's existing conversation
// about the item, or starts one (§16). Ends in a redirect to the chat, so it
// only ever returns errors. The checks here give clear messages; the
// database decides (RLS: requester = the user, the item's real owner, an
// active item, not banned; check: not the owner; trigger: 20 new
// conversations per 24 hours).
export async function startConversation(
  formData: FormData,
): Promise<ActionResult<never>> {
  const parsed = startConversationSchema.safeParse({
    itemId: formData.get("itemId"),
  });
  if (!parsed.success) return validationError(parsed.error);
  const { itemId } = parsed.data;
  const user = await requireUser(`/items/${itemId}`);
  const supabase = await createClient();

  let conversationId: string | null;
  try {
    // RLS: someone else's hidden item is not returned.
    const { data: item, error } = await supabase
      .from("items")
      .select("id, user_id, status")
      .eq("id", itemId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) return fail("not_found");
    if (item.user_id === user.id) return fail("conversation_own_item");

    // An existing conversation stays open, also after the item was
    // resolved and for banned users (they can still read their chats).
    conversationId = await findConversation(supabase, itemId, user.id);
    if (!conversationId) {
      if (user.profile.is_banned) return fail("forbidden");
      if (item.status !== "active") return fail("conversation_item_inactive");

      const { data: created, error: insertError } = await supabase
        .from("conversations")
        .insert({ item_id: itemId, owner_id: item.user_id })
        .select("id")
        .single();
      if (insertError) {
        switch (insertError.code) {
          case "23505": // unique: started at the same time (another tab)
            conversationId = await findConversation(supabase, itemId, user.id);
            if (!conversationId) throw new Error(insertError.message);
            break;
          case "FL429": // daily_conversation_limit
            return fail("conversation_limit");
          case "42501": // RLS: resolved/hidden or banned in the meantime
            return fail("forbidden");
          default:
            throw new Error(`${insertError.code}: ${insertError.message}`);
        }
      } else {
        conversationId = created.id;
      }
    }
  } catch (error) {
    console.error(
      `Starting a conversation about item ${itemId} failed: ${
        error instanceof Error ? error.message : error
      }`,
    );
    return fail("database");
  }

  return redirect({
    href: `/messages/${conversationId}`,
    locale: await getLocale(),
  });
}
