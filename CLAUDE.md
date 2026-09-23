@AGENTS.md

# Findly Web — project guide

Diploma project: web platform for lost/found item reports with automatic matching.
**`docs/PROJECT_PLAN.md` is the source of truth** for architecture, roadmap, step
status and the next step. Read it before any work.

## Workflow (every step)

1. Read the step in `docs/PROJECT_PLAN.md` (§22) and inspect the code it affects.
2. Briefly explain what the step changes.
3. Implement only that step. Log unrelated findings in §23 instead of fixing them.
4. Run `npm run lint`, `npm run typecheck`, `npm test` (from P2.S1), `npm run build`,
   the step's Verify list, and `npx supabase db advisors --linked` after migrations.
5. Update the plan: step status (§2 and §22), Changelog (§24), Next Recommended Step (§25).
6. Update this file if conventions, commands or project state change.
7. Commit as `P<n>.S<m>: <summary>`, then stop and report. Never start the next
   step without the user's confirmation.

"Continue with the next step" = the step in §25 of the plan.

## Current state

- Phase 1 completed. Phase 2 (Authentication) not started. Next: P2.S1.
- Supabase dev project `lyvudeaxwibgpqsinqyz` (eu-central-1, Postgres 17), linked.
- No GitHub remote yet (P2.S10). Branch `main`.

## Stack and conventions

- Next.js 16 App Router: `proxy.ts` (not middleware), async `params`/`cookies()`,
  global `PageProps`/`LayoutProps`. Check `node_modules/next/dist/docs/` for APIs.
- next-intl: `mk` default (no prefix), `en` at `/en`. Use `Link`/`redirect`/`useRouter`
  from `@/i18n/navigation`. Keep `messages/mk.json` and `messages/en.json` in sync.
- Supabase via `@supabase/ssr`: `@/lib/supabase/server` (server), `@/lib/supabase/client`
  (browser). Publishable key only; never add a service-role key to the app.
- Reads in Server Components (`src/lib/queries/*`); writes via Server Actions
  (`src/actions/*`) validated with Zod (`src/lib/validation/*`), returning
  `ActionResult` with error codes that the UI translates.
- Security: RLS on every table in the same migration that creates it (Supabase grants
  table privileges to anon/authenticated by default). `can_write()` in write policies,
  `is_admin()` for admin access. `security definer` functions use `search_path = ''`.
- UI: shadcn/ui (Base UI primitives; `cn` from `@/lib/utils`), Tailwind 4 tokens in
  `src/app/globals.css`, lucide icons. Server Components by default.
- Match the existing code style; Prettier formats (`npm run format`).

## Commands

| Command                                  | Purpose                                        |
| ---------------------------------------- | ---------------------------------------------- |
| `npm run dev` / `build` / `start`        | Next.js                                        |
| `npm run lint`, `npm run typecheck`      | ESLint, `next typegen && tsc --noEmit`         |
| `npm run db:new -- <name>`               | New migration in `supabase/migrations/`        |
| `npm run db:push`                        | Apply migrations to the linked project         |
| `npm run db:types`                       | Regenerate `src/types/database.ts` (commit it) |
| `npx supabase db query --linked "<sql>"` | Run SQL against the linked project             |
| `npx supabase db advisors --linked`      | Security/performance checks                    |

## Environment notes

- Windows; Bash and PowerShell both available. No Docker, so no local Supabase stack.
- `npx supabase login` needs an interactive terminal: the user runs it in their own
  PowerShell window, not through the agent.
- Never edit applied migrations; never run `supabase config push` (config.toml holds
  local defaults that differ from the hosted project).
- `.env.local` holds `NEXT_PUBLIC_SUPABASE_URL` (base URL, no path),
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
- The Android app (github.com/BlagojPetrov/Findly) is a functional reference only.
