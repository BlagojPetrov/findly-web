import { createServerClient } from "@supabase/ssr";
import { isAuthApiError } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

// Refreshes the Supabase auth session and writes updated cookies onto the
// response produced by the i18n proxy. Returns the signed-in user's id (from
// the verified JWT) so the proxy can make optimistic redirect decisions.
//
// verifyUser: also confirm with Supabase Auth that the user still exists.
// A JWT stays valid until it expires (up to an hour) even after the account
// was deleted, and on /login and /register such a stale session would redirect
// the visitor away — locking them out. Used only there, so other pages keep
// the fast local check.
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
  { verifyUser = false }: { verifyUser?: boolean } = {},
): Promise<{ userId: string | null }> {
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Do not put code between client creation and getClaims(): this call
  // validates the JWT and triggers the token refresh.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;

  if (userId && verifyUser) {
    const { error } = await supabase.auth.getUser();
    // Only a definitive answer (user or session no longer exists) clears the
    // session; a network error or outage must not sign anyone out.
    if (
      isAuthApiError(error) &&
      (error.status === 401 || error.status === 403)
    ) {
      await supabase.auth.signOut({ scope: "local" });
      return { userId: null };
    }
  }

  return { userId };
}
