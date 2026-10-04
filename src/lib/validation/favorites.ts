import { z } from "zod";
import { msg } from "./messages";

// A user saves a report to their favorites or removes it (§17).
export const favoriteSchema = z.object({
  itemId: z.uuid({ error: msg("invalidValue") }),
});
