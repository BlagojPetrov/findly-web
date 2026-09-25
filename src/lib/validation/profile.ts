import { z } from "zod";
import { routing } from "@/i18n/routing";
import { displayNameSchema } from "./auth";
import { msg } from "./messages";

export const profileSchema = z.object({
  displayName: displayNameSchema,
  // Language of emails (and later notifications) for this user.
  preferredLocale: z.enum(routing.locales, { error: msg("localeInvalid") }),
});
