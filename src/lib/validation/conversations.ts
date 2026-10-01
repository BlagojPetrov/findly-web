import { z } from "zod";
import { msg } from "./messages";

// A signed-in user contacts the owner of a report (§16). Only the item is
// sent: the owner comes from the item itself, the requester from the session.
export const startConversationSchema = z.object({
  itemId: z.uuid({ error: msg("invalidValue") }),
});
