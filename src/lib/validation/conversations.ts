import { z } from "zod";
import { MESSAGE_MAX_LENGTH } from "@/lib/chat";
import { msg } from "./messages";

// A signed-in user contacts the owner of a report (§16). Only the item is
// sent: the owner comes from the item itself, the requester from the session.
export const startConversationSchema = z.object({
  itemId: z.uuid({ error: msg("invalidValue") }),
});

// A message in a conversation of the signed-in user (sender from the
// session). Form data turns line breaks into "\r\n"; they are stored as
// "\n", as the browser's field counts them, so a message at the field's
// limit is not too long here. Trimmed like the database's "not only
// whitespace" check; the length limit counts UTF-16 units, which is never
// less than the database's character count.
export const sendMessageSchema = z.object({
  conversationId: z.uuid({ error: msg("invalidValue") }),
  body: z
    .string({ error: msg("required") })
    .overwrite((value) => value.replace(/\r\n?/g, "\n"))
    .trim()
    .min(1, msg("required"))
    .max(MESSAGE_MAX_LENGTH, msg("messageTooLong")),
});

// Marks the other participant's messages in a conversation read.
export const markConversationReadSchema = z.object({
  conversationId: z.uuid({ error: msg("invalidValue") }),
});
