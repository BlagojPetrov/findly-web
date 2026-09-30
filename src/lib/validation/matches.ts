import { z } from "zod";
import { MATCH_STATUSES } from "@/lib/matches";
import { msg } from "./messages";

// Owners of either report change only a match's status (§14): confirm or
// dismiss a suggestion, or put a confirmed or dismissed match back.
export const matchStatusSchema = z.object({
  matchId: z.uuid({ error: msg("invalidValue") }),
  status: z.enum(MATCH_STATUSES, { error: msg("invalidValue") }),
});
