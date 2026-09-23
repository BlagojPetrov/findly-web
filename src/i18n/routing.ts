import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["mk", "en"],
  defaultLocale: "mk",
  // Macedonian URLs have no prefix (/items), English ones do (/en/items).
  localePrefix: "as-needed",
});
