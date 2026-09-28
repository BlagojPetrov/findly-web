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

- Phases 1–4 completed (auth, profile, first deployment; items CRUD with photos, item
  page, `/dashboard`; search, `/items` feed with filters and pagination, SEO, home page
  with latest items). Phase 5 in progress: P5.S1 (Leaflet base map) done; next P5.S2
  (location picker and geocoding).
- Open manual items: minimum password length 8 (F-07); decision on locale
  detection (F-13); optional leaked password protection (F-19); local Turbopack build
  blocked by Windows Application Control (F-22).
- The dev project has **real accounts of the project owner** (email and Google). Test cleanup
  must delete only test users by their own email pattern (`…@findly.test`,
  `findly-e2e-…@mailinator.com`).
- Supabase dev project `lyvudeaxwibgpqsinqyz` (eu-central-1, Postgres 17), linked.
- GitHub: `origin` = https://github.com/BlagojPetrov/findly-web, branch `main`.
  Vercel: https://findly-web-nine.vercel.app — every push to `main` deploys to
  production (uses the same dev Supabase project); `vercel.json` pins functions to `fra1`.

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
  `src/lib/auth-routes.ts` — add every new protected route there. On guest-only
  pages (`/login`, `/register`) the proxy also verifies the user with `getUser()`
  and clears stale sessions (a JWT outlives a deleted account; F-16).
- Forms: action takes `(formData)`; the client form wraps it in `useActionState` and
  keeps non-secret values for `defaultValue`. Use `FormField`, `FormError`,
  `SubmitButton` from `src/components/forms/`. Zod messages are `Validation` keys via
  `msg()` (`@/lib/validation/messages`), with `min(1, msg("required"))` first. Auth
  errors go through `authFailure()`.
- Auth email links go to `/api/auth/confirm` (`token_hash` + `type`, or `code`;
  `locale`; safe `next`). Email templates live in `supabase/templates/` (source of
  truth, pasted into the dashboard; excluded from Prettier). Their links are
  `{{ .RedirectTo }}&token_hash=…`, so every auth call that sends email must pass a
  full `<SITE_URL>/api/auth/confirm?locale=…` redirect that is in the Supabase allow list. Auth actions that
  send email pass `emailRedirectTo`/`redirectTo` to that route. Failed recovery links go
  to `/forgot-password?error=link_invalid`, others to `/verify-email?error=link_invalid`.
- Menu links: `DropdownMenuLinkItem render={<Link href="…" />}`.
- Settings-style pages: `SettingsCard` + `SettingsCardBody`/`SettingsCardFooter`
  (`src/components/profile/settings-card.tsx`); a form wraps body and footer.
- Combine `buttonVariants()` with conflicting classes via `cn(buttonVariants(), "…")`,
  not `buttonVariants({ className })` (no class merging there).
- Unit tests: Vitest, colocated as `src/**/*.test.ts`; `vitest.config.mts` sets placeholder
  env values so `@/lib/env` can be imported. Browser checks: headless Edge via
  `playwright-core` installed in the scratchpad (not the project) against `next start`
  (another port if the user's dev server has 3000) with browser locale `mk-MK`
  (locale detection, F-13); stop that server by its node PID afterwards (stopping the
  background task leaves `next start` running and serving the old build); create temporary users with SQL and delete them
  afterwards. Custom SMTP is on: a sign-up that succeeds **sends a real email**, so
  never sign up with `@findly.test` (it bounces) — use a disposable inbox
  (`…@mailinator.com`) and read the confirmation `token_hash` from
  `auth.one_time_tokens` instead of the email.
- Security: RLS on every table in the same migration that creates it (Supabase grants
  table privileges to anon/authenticated by default). `private.can_write()` in write
  policies, `private.is_admin()` for admin access. Policy helpers go in schema
  `private` (not exposed by the API); `public` functions are only those the app calls
  via `rpc()`. `security definer` functions use `search_path = ''`.
- Storage: public buckets, files under `{uid}/…`; policies on `storage.objects` in the
  bucket's migration (own folder, `private.can_write()` on insert, no update policy — upload
  a new name instead of overwriting). The browser resizes (`@/lib/images`) and uploads
  with the browser client, then an action validates the path, checks `exists()`, saves it
  and removes the old file. Avatars: `@/lib/avatars` (`avatarUrl`, `isOwnAvatarPath`),
  shown with `UserAvatar`. SQL tests that delete from `storage.objects` must first
  `set_config('storage.allow_delete_query', 'true', true)`.
- `profiles` has column-level privileges: select explicit public columns
  (`id, display_name, avatar_path, created_at`), never `select("*")`. The signed-in
  user's own full row (role, is_banned, preferred_locale) comes from
  `rpc("current_profile")`. `preferred_locale` is mirrored to `user_metadata.locale`
  (the auth email templates read that) by `updateProfile`.
- Items: create through `rpc("create_item")`, edit through `rpc("update_item")` (item + images in one
  transaction; returns removed paths to delete). `deleteItem` removes the item's whole folder. Trigger
  errors the app maps: `23514` `occurred_on_in_future` (today = `Europe/Skopje` date),
  `FL429` `daily_item_limit` (20 items / 24 h). Owners cannot hide or edit hidden items;
  admins hide/restore. Trigger functions go in schema `private`. Forms validate with
  `itemSchema({ categoryIds, userId })` (`@/lib/validation/items`); calendar dates use
  `todayInAppTimeZone()` (`@/lib/dates`, Europe/Skopje). Photos: `ImagePicker`
  (`src/components/items/image-picker.tsx`) uploads before submit and posts `imagePaths`
  hidden inputs; block submit while `onPendingChange(true)`. Helpers in `@/lib/item-images`.
  Item writes map database errors with `itemWriteFailure()` (`@/lib/item-errors`);
  categories come from `getCategories()` (`@/lib/queries/categories`). Multi-line
  inputs use `FormTextareaField`. Item reads: `getItem(id)` (`@/lib/queries/items`, RLS
  decides visibility; null → `notFound()`). Type colors: `lost`/`found` tokens
  (`bg-lost/10 text-lost`), `ItemTypeBadge`. Item grids use `ItemCard` (`ItemSummary`
  from `getOwnItems`; `actions` slot sits above the card's stretched link). Owner controls:
  `ItemOwnerActions` (`compact` on cards, `redirectAfterDelete` on the item page).
  Calendar days are formatted with `calendarDay()` + `timeZone: "UTC"`.
- Search: `items.search_text` (trigger-maintained) and `items.search_vector` (generated)
  hold `private.normalize_text()` output; normalize queries with the same function
  (never compare raw text). Full text uses the `simple` config; typos use
  `extensions.word_similarity` / `%>` (trigram index on `search_text`). The feed reads
  through `rpc("search_items")` (§12): generated types claim non-null results, but
  `location_name` and `cover_path` can be null. A migration that puts a `pg_trgm.*`
  setting in a function's `SET` clause must first call `extensions.show_limit()`.
  Feed URL filters: `parseSearchParams()` / `searchQuery()` (`@/lib/validation/search`);
  build feed links from `searchQuery()` so URLs stay canonical (the feed redirects
  other URLs). Feed data: `searchItems(filters, { pageSize? })` (`@/lib/queries/items`), returning
  `ItemSummary` like `getOwnItems`. The filter form (`src/components/search/`) is a
  `next/form` GET form with native controls so it works without JavaScript.
  Paged lists use `Pagination` (`src/components/search/pagination.tsx`, `href(page)`
  callback) and `pageCount`/`pageItems` (`@/lib/pagination`); a page past the end
  redirects to the last page. No `loading.tsx`/Suspense fallback on pages that must work
  without JavaScript or redirect with 307 (F-23): show pending state with
  `LinkPendingMarker`/`FormPendingMarker` (`data-pending`) and style it with
  `group-has-[[data-pending]]/…:`. Sibling elements must not share a `key`.
- Maps: Leaflet via `react-leaflet`. Any module importing `leaflet`/`react-leaflet`
  (even `Marker`) is browser-only: it imports `./base-map` and is exported from
  `@/components/map` (`index.tsx`) with `dynamic(..., { ssr: false, loading: MapLoading })`;
  pages never import react-leaflet. Render maps inside `MapFrame` (label, size via
  `className`; `isolate` keeps Leaflet's z-indexes under the header). Constants
  (`DEFAULT_CENTER`, OSM tile URL/attribution) in `@/lib/map`.
- SEO: public pages set `alternates: localeAlternates(path, locale, query?)` (canonical +
  hreflang) and, when they set `openGraph`, spread `openGraphBase(locale)` (metadata merges
  shallowly); descriptions go through `metaDescription()` (`@/lib/seo`). `(app)`/`(auth)`
  pages are `noindex`; new protected routes in `PROTECTED_PREFIXES` are also disallowed in
  `robots.ts`. Cached public data (sitemap) uses `createPublicClient()`
  (`@/lib/supabase/public`, anon, no cookies); filter it explicitly (e.g. `status = active`).
- Pages in `(app)` set their own width (`mx-auto w-full max-w-2xl` for forms/settings,
  `max-w-5xl` for the dashboard); the layout only adds padding. Signed-in users land on
  `AFTER_SIGN_IN_PATH` (`/dashboard`).
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
- Local `npm run build` currently fails (Turbopack needs the native SWC binary, which
  Windows Application Control blocks; F-22). Verify with `npx next build --webpack`
  until that is resolved; do not change the scripts (Vercel builds normally).
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
