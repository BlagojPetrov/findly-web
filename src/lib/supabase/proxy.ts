import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

// Refreshes the Supabase auth session and writes updated cookies onto the
// response produced by the i18n proxy. Returns the signed-in user's id (from
// the verified JWT) so the proxy can make optimistic redirect decisions.
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
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

  return { userId: data?.claims.sub ?? null };
}
