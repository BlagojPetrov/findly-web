import "server-only";
import { z } from "zod";
import { fetchMessagesBefore, fetchUnreadMessageCount } from "@/lib/chat";
import { toConversationSummaries } from "@/lib/conversations";
import { createClient } from "@/lib/supabase/server";

// The signed-in user's conversations for /messages, newest activity first
// (order, unread counts and the owner's "only after the first message" rule
// come from my_conversations(), §9).
export async function getMyConversations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) {
    throw new Error(`Failed to load conversations: ${error.message}`);
  }
  return toConversationSummaries(data, userId);
}

// The conversation the user started about an item (one per item and
// requester), or null. Conversations where the user is the owner are not
// returned: the owner sees them in /messages (P8.S3).
export async function getOwnConversationId(itemId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("item_id", itemId)
    .eq("requester_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Failed to load the conversation about item ${itemId}: ${error.message}`,
    );
  }
  return data?.id ?? null;
}

// Both participants through their own foreign keys (public profile columns
// only). RLS returns the conversation only to its participants, and the item
// only when the viewer may see it (null when deleted or hidden).
const conversationColumns = `
  id, item_id, owner_id, requester_id, created_at,
  item:items (id, type, status, title),
  owner:profiles!conversations_owner_id_fkey (id, display_name, avatar_path),
  requester:profiles!conversations_requester_id_fkey (id, display_name, avatar_path)
`;

// One conversation of the signed-in user with the other participant, or
// null when it does not exist or the user does not take part in it.
export async function getConversation(id: string, userId: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(conversationColumns)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load conversation ${id}: ${error.message}`);
  }
  if (!data) return null;
  const isOwner = data.owner_id === userId;
  return {
    id: data.id,
    createdAt: data.created_at,
    item: data.item,
    isOwner,
    other: isOwner ? data.requester : data.owner,
  };
}

export type ConversationDetail = NonNullable<
  Awaited<ReturnType<typeof getConversation>>
>;

// The newest page of a conversation's messages, oldest first (RLS: only
// participants get any). The chat loads older pages in the browser.
export async function getLatestMessages(conversationId: string) {
  const supabase = await createClient();
  return fetchMessagesBefore(supabase, conversationId);
}

// The header badge's first value: unread messages from others in all of the
// user's conversations, or null when it cannot be loaded (the header then
// shows no badge instead of failing; the browser reloads it).
export async function getUnreadMessageCount(userId: string) {
  const supabase = await createClient();
  try {
    return await fetchUnreadMessageCount(supabase, userId);
  } catch (error) {
    console.error(error);
    return null;
  }
}
