import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Client-safe helpers for the chat (§16): loading messages of one
// conversation (RLS: participants only) and merging the ones that arrive
// from the server, the action and Realtime.

// Messages loaded at once: the newest page on the server, older pages on
// scroll.
export const MESSAGE_PAGE_SIZE = 50;
// Catch-up after a reconnect: at most this many newer messages.
const CATCH_UP_LIMIT = 200;

export const MESSAGE_MAX_LENGTH = 2000;

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export const messageColumns = "id, sender_id, body, created_at";

export function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function time(message: ChatMessage) {
  return Date.parse(message.createdAt);
}

// Oldest first, each message once (the action's result and its Realtime
// event are the same row). Later copies replace earlier ones.
export function mergeMessages(...lists: ChatMessage[][]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const list of lists) {
    for (const message of list) byId.set(message.id, message);
  }
  return [...byId.values()].sort(
    (a, b) => time(a) - time(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

type Client = SupabaseClient<Database>;

// The newest page of messages, or the page before `before` (the created_at
// of the oldest loaded message; clock_timestamp() makes it unique within a
// conversation in practice). Oldest first; hasMore when older ones exist.
export async function fetchMessagesBefore(
  supabase: Client,
  conversationId: string,
  before?: string,
) {
  let query = supabase
    .from("messages")
    .select(messageColumns)
    .eq("conversation_id", conversationId);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE + 1);
  if (error) throw new Error(`Failed to load messages: ${error.message}`);
  const hasMore = data.length > MESSAGE_PAGE_SIZE;
  return {
    messages: data.slice(0, MESSAGE_PAGE_SIZE).reverse().map(toChatMessage),
    hasMore,
  };
}

// Messages newer than `after` (missed while Realtime was disconnected),
// oldest first.
export async function fetchMessagesAfter(
  supabase: Client,
  conversationId: string,
  after: string,
) {
  const { data, error } = await supabase
    .from("messages")
    .select(messageColumns)
    .eq("conversation_id", conversationId)
    .gt("created_at", after)
    .order("created_at", { ascending: true })
    .limit(CATCH_UP_LIMIT);
  if (error) throw new Error(`Failed to load messages: ${error.message}`);
  return data.map(toChatMessage);
}

// A Realtime INSERT payload as a message, or null when it is not a message
// of this conversation.
export function realtimeMessage(
  row: unknown,
  conversationId: string,
): ChatMessage | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Partial<MessageRow> & { conversation_id?: unknown };
  if (
    value.conversation_id !== conversationId ||
    typeof value.id !== "string" ||
    typeof value.sender_id !== "string" ||
    typeof value.body !== "string" ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }
  const message = toChatMessage(value as MessageRow);
  // Without an offset Date.parse() would read the time as local time; the
  // database stores and sends UTC.
  if (!/(Z|[+-]\d\d(:?\d\d)?)$/.test(message.createdAt)) {
    message.createdAt += "Z";
  }
  return message;
}
