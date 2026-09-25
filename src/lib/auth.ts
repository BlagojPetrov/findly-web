import "server-only";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type CurrentUser = {
  id: string;
  email: string | null;
  // Sign-in methods linked to the account, e.g. ["email"] or ["google"].
  providers: string[];
  profile: Tables<"profiles">;
};

// The signed-in user with their full profile, or null for guests.
// cache(): layouts, pages and actions in the same request share one lookup.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  // getClaims() verifies the JWT; never trust getSession() on the server.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile, error } = await supabase
    .rpc("current_profile")
    .maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  // A valid token without a profile means the account was deleted.
  if (!profile) return null;

  const providers = claims.app_metadata?.providers;
  return {
    id: claims.sub,
    email: claims.email ?? null,
    providers: Array.isArray(providers) ? providers : [],
    profile,
  };
});

// For protected pages and actions: returns the user or redirects to the
// login page. Pass the current path as `next` to come back after sign-in.
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user) return user;

  return redirect({
    href: next ? { pathname: SIGN_IN_PATH, query: { next } } : SIGN_IN_PATH,
    locale: await getLocale(),
  });
}

// For the admin area: non-admins get a 404 so the area is not advertised.
export async function requireAdmin(next?: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.profile.role !== "admin") notFound();
  return user;
}
