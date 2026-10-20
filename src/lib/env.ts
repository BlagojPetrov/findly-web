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

type Env = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  NEXT_PUBLIC_SITE_URL: string;
};

// A base URL (no path). Throws with the variable's name, like a failed
// schema check would.
function baseUrl(name: keyof Env, value: string | undefined, hint: string) {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new Error(`${name}: invalid URL`);
  }
  if (url.pathname !== "/") throw new Error(`${name}: ${hint}`);
  return value!;
}

// Checked without Zod: this module is in the browser bundle (Supabase
// client, image URLs), and Zod would add ~90 KiB to every page (P11.S5).
export function parseEnv(vars: Partial<Env>): Env {
  if (!vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: required");
  }
  return {
    // Base project URL only; supabase-js appends /rest/v1, /auth/v1, etc.
    NEXT_PUBLIC_SUPABASE_URL: baseUrl(
      "NEXT_PUBLIC_SUPABASE_URL",
      vars.NEXT_PUBLIC_SUPABASE_URL,
      "Use the project base URL (https://<ref>.supabase.co) without /rest/v1",
    ),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: baseUrl(
      "NEXT_PUBLIC_SITE_URL",
      vars.NEXT_PUBLIC_SITE_URL,
      "Use the site's base URL without a path",
    ),
  };
}

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them
// into the browser bundle.
export const env = parseEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: resolveSiteUrl({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelProductionHost: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  }),
});
