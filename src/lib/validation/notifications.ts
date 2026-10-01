import { z } from "zod";
import { msg } from "./messages";

// A user marks one of their notifications read or unread (only read_at can
// change, §15) or deletes it.
export const notificationIdSchema = z.object({
  notificationId: z.uuid({ error: msg("invalidValue") }),
});

export const notificationReadSchema = notificationIdSchema.extend({
  read: z.enum(["true", "false"], { error: msg("invalidValue") }),
});
