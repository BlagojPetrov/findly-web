import { z } from "zod";

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
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
});
