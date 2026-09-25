import { z } from "zod";

// Public URL of the site, used for auth email links, OAuth callbacks and
// metadata. Order: NEXT_PUBLIC_SITE_URL, then the Vercel production domain
// (system variable, host only), then localhost for local development.
// A trailing slash is removed so paths can be appended directly.
export function resolveSiteUrl(vars: {
  siteUrl?: string;
  vercelProductionHost?: string;
}) {
  const url =
    vars.siteUrl ||
    (vars.vercelProductionHost
      ? `https://${vars.vercelProductionHost}`
      : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them
// into the browser bundle.
const envSchema = z.object({
  // Base project URL only; supabase-js appends /rest/v1, /auth/v1, etc.
  NEXT_PUBLIC_SUPABASE_URL: z
    .url()
    .refine((url) => new URL(url).pathname === "/", {
      message:
        "Use the project base URL (https://<ref>.supabase.co) without /rest/v1",
    }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().refine((url) => new URL(url).pathname === "/", {
    message: "Use the site's base URL without a path",
  }),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: resolveSiteUrl({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelProductionHost: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  }),
});
