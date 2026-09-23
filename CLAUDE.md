@AGENTS.md

# Findly Web — project guide

Diploma project: web platform for lost/found item reports with automatic matching.
**`docs/PROJECT_PLAN.md` is the source of truth** for architecture, roadmap, step
status and the next step. Read it before any work.

## Workflow (every step)

1. Read the step in `docs/PROJECT_PLAN.md` (§22) and inspect the code it affects.
2. Briefly explain what the step changes.
3. Implement only that step. Log unrelated findings in §23 instead of fixing them.
4. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
   the step's Verify list, and `npx supabase db advisors --linked` after migrations.
5. Update the plan: step status (§2 and §22), Changelog (§24), Next Recommended Step (§25).
6. Update this file if conventions, commands or project state change.
7. Commit as `P<n>.S<m>: <summary>`, then stop and report. Never start the next
   step without the user's confirmation.

"Continue with the next step" = the step in §25 of the plan.

## Current state

- Phase 1 completed. Phase 2 (Authentication) in progress: P2.S1–S4 done. Next: P2.S5.
- Open manual items: minimum password length 8 in the Supabase dashboard (F-07);
  decision on next-intl locale detection (F-13).
- Supabase dev project `lyvudeaxwibgpqsinqyz` (eu-central-1, Postgres 17), linked.
- GitHub: `origin` = https://github.com/BlagojPetrov/findly-web, branch `main`.
  Not deployed to Vercel yet (P2.S10).

## Stack and conventions

- Next.js 16 App Router: `proxy.ts` (not middleware), async `params`/`cookies()`,
  global `PageProps`/`LayoutProps`. Check `node_modules/next/dist/docs/` for APIs.
- next-intl: `mk` default (no prefix), `en` at `/en`. Use `Link`/`redirect`/`useRouter`
  from `@/i18n/navigation`. Keep `messages/mk.json` and `messages/en.json` in sync.
- Supabase via `@supabase/ssr`: `@/lib/supabase/server` (server), `@/lib/supabase/client`
  (browser). Publishable key only; never add a service-role key to the app.
- Reads in Server Components (`src/lib/queries/*`); writes via Server Actions
  (`src/actions/*`) validated with Zod (`src/lib/validation/*`), returning
  `ActionResult` (`@/lib/action-result`: `ok`, `fail`, `validationError`) with error
  codes from the `Errors` messages namespace. User-supplied redirect targets go
  through `safeRedirectPath()` (`@/lib/safe-redirect`).
- Auth: `getCurrentUser()`, `requireUser(next?)`, `requireAdmin(next?)` from
  `@/lib/auth` (server-only, cached per request) in every protected page, layout and
  action. The proxy only does optimistic redirects; its rules are in
  `src/lib/auth-routes.ts` — add every new protected route there.
- Forms: action takes `(formData)`; the client form wraps it in `useActionState` and
  keeps non-secret values for `defaultValue`. Use `FormField`, `FormError`,
  `SubmitButton` from `src/components/forms/`. Zod messages are `Validation` keys via
  `msg()` (`@/lib/validation/messages`), with `min(1, msg("required"))` first. Auth
  errors go through `authFailure()`.
- Combine `buttonVariants()` with conflicting classes via `cn(buttonVariants(), "…")`,
  not `buttonVariants({ className })` (no class merging there).
- Unit tests: Vitest, colocated as `src/**/*.test.ts`. Browser checks: headless Edge via
  `playwright-core` installed in the scratchpad (not the project) against `next start`;
  create temporary users with SQL and delete them afterwards.
- Security: RLS on every table in the same migration that creates it (Supabase grants
  table privileges to anon/authenticated by default). `private.can_write()` in write
  policies, `private.is_admin()` for admin access. Policy helpers go in schema
  `private` (not exposed by the API); `public` functions are only those the app calls
  via `rpc()`. `security definer` functions use `search_path = ''`.
- `profiles` has column-level privileges: select explicit public columns
  (`id, display_name, avatar_path, created_at`), never `select("*")`. The signed-in
  user's own full row (role, is_banned, preferred_locale) comes from
  `rpc("current_profile")`.
- SQL tests: `supabase/tests/<name>.sql` using helpers from `_helpers.sql`
  (`pg_temp.create_user`, `login_as`, `login_as_anon`, `logout`) and `assert`.
  The runner wraps each file in `begin … rollback`.
- UI: shadcn/ui (Base UI primitives; `cn` from `@/lib/utils`), Tailwind 4 tokens in
  `src/app/globals.css`, lucide icons. Server Components by default.
- Match the existing code style; Prettier formats (`npm run format`).

## Commands

| Command                                  | Purpose                                        |
| ---------------------------------------- | ---------------------------------------------- |
| `npm run dev` / `build` / `start`        | Next.js                                        |
| `npm run lint`, `npm run typecheck`      | ESLint, `next typegen && tsc --noEmit`         |
| `npm test` / `npm run test:watch`        | Vitest unit tests                              |
| `npm run db:new -- <name>`               | New migration in `supabase/migrations/`        |
| `npm run db:push`                        | Apply migrations to the linked project         |
| `npm run db:types`                       | Regenerate `src/types/database.ts` (commit it) |
| `npm run db:test [-- <name>]`            | SQL tests against the linked project           |
| `npx supabase db query --linked "<sql>"` | Run SQL against the linked project             |
| `npx supabase db advisors --linked`      | Security/performance checks                    |

## Environment notes

- Windows; Bash and PowerShell both available. No Docker, so no local Supabase stack.
- `npx supabase login` needs an interactive terminal: the user runs it in their own
  PowerShell window, not through the agent.
- Never edit applied migrations; never run `supabase config push` (config.toml holds
  local defaults that differ from the hosted project).
- `db:new` names migrations with the UTC time; make sure the new file sorts after
  the latest existing migration (rename if needed). Dry-run a migration by running
  it inside `begin; … rollback;` with `npx supabase db query --linked -f <file>`
  before `npm run db:push -- --yes`.
- `.env.local` holds `NEXT_PUBLIC_SUPABASE_URL` (base URL, no path),
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
- The Android app (github.com/BlagojPetrov/Findly) is a functional reference only.
