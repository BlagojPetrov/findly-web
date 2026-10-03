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

- Phases 1–6 completed (auth, profile, first deployment; items CRUD with photos, item
  page, `/dashboard`; search, `/items` feed with filters and pagination, SEO, home page
  with latest items; maps: location picker, required location, item map, radius
  filter, `/map` page; automatic matching with explanation, confirm/dismiss and
  weights v2 tuned on a demo dataset). Phase 7 started: notifications schema (P7.S1),
  match notifications trigger (P7.S2), header bell with Realtime (P7.S3), `/notifications`
  page (P7.S4); Phase 7 completed, optional match email (P7.S5) deferred. Phase 8 started:
  messaging schema with a daily conversation limit (P8.S1), contact from the item page
  (P8.S2). Conversation list `/messages` with a header link (P8.S3). Chat view with
  Realtime on `/messages/[id]` (P8.S4). P8.S1–P8.S4 deployed and verified on Vercel at
  `7ae4ae4` (2026-10-02). Read state and live unread badge in the header (P8.S5, local).
  Message notifications (P8.S6, local; its migration is already on the hosted project).
  Phase 8 completed. F-33 (stale `/messages` after the browser's Back button) fixed
  locally. Nothing after `7ae4ae4` is pushed yet (P8.S4 record, P8.S5, P8.S6, F-33 fix):
  push only with the user's approval, then verify on Vercel. Next: P9.S1 (favorites schema).
- Open manual items: minimum password length 8 (F-07); decision on locale
  detection (F-13); optional leaked password protection (F-19).
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
  env values so `@/lib/env` can be imported. Component tests: `*.test.tsx` with
  `// @vitest-environment jsdom`, rendered with `react-dom/client` + `act` inside
  `NextIntlClientProvider` (mk messages); mock server actions, `@/i18n/navigation` and
  browser-only parts (pickers, maps). Example: `src/components/items/item-form.test.tsx`.
- Forms: React resets a form after every action. Controlled radios/checkboxes whose
  state did not change get unchecked by that reset: remount them after each result
  (`key` = result counter) so React writes the current value as the default (F-24). Browser checks: headless Edge via
  `playwright-core` installed in the scratchpad (not the project) against `next start`
  (another port if the user's dev server has 3000) with browser locale `mk-MK`
  (locale detection, F-13); stop that server by its node PID afterwards (stopping the
  background task leaves `next start` running and serving the old build); sign in through
  `form:has(input[name="email"])` (the Google button is a form of its own) and record
  toasts with a `MutationObserver` (they close after 4 s; a CLI SQL call takes longer);
  create temporary users with SQL and delete them
  afterwards. Custom SMTP is on: a sign-up that succeeds **sends a real email**, so
  never sign up with `@findly.test` (it bounces) — use a disposable inbox
  (`…@mailinator.com`) and read the confirmation `token_hash` from
  `auth.one_time_tokens` instead of the email.
- Matches (§14): rows are written only by `security definer` matching functions; owners
  of either item select them and update only `status` (column grant, `can_write()`).
  `private.match_score(lost, found)` holds all candidate rules and returns no row for a
  non-candidate; `private.match_words()` gives the words used for text matching. Weights v2
  (0.15/0.15/0.15/0.55, stored at ≥ 0.60) were tuned on `supabase/seed/demo.sql` (§14).
  Weight or rule changes go in a new migration and update the expectations in
  `supabase/tests/matching.sql`, `compute_matches.sql` and `matching_demo.sql`; evaluate
  with `supabase/seed/demo-evaluation.sql` in a rolled-back transaction. The demo data is
  not loaded on the dev project (it would show on the public site).
  Triggers on `items` run `private.compute_matches(id)` after insert and after changes
  of matching columns (it upserts `suggested` rows, keeps dismissed/confirmed): SQL
  tests that insert matching items get match rows automatically. UI: reads through
  `getItemMatches`/`getUserMatches` (`@/lib/queries/matches`), which map rows with
  `toMatchViews`/`groupMatches` (`@/lib/matches`, client-safe: viewer side, visibility,
  10 suggested per own report); `MatchList`/`MatchCard` in `src/components/matches/`;
  status changes only through `setMatchStatus` (`src/actions/matches.ts`). Never show
  coordinates of the other report (the distance comes from the breakdown).
- Notifications (§15): rows only from `security definer` triggers (no insert grant);
  `data` holds ids only, the UI renders text in the viewer's language. Users select and
  delete their own and update only `read_at` (`can_write()`). The table is in the
  `supabase_realtime` publication (Realtime applies the select policy). Match
  notifications come from trigger `matches_notify` (only on a really new `matches` row):
  `data = { match_id, item_id (recipient's own report), other_item_id }`, unique per
  recipient and pair (`notifications_match_pair_key`; a recreated pair reuses it).
  Deleting an item removes the match notifications about it; ones whose match was
  only dropped or whose other report is hidden stay, so the UI must handle a missing
  match/item. SQL tests that create matches also create notifications.
  Message notifications (trigger `messages_notify`): `data = { conversation_id,
item_id?, sender_id }`, one per recipient and conversation
  (`notifications_message_conversation_key`); unread → more messages change nothing;
  read → the next message replaces it (delete + insert). Reading the chat marks it read
  (statement trigger `messages_read_notifications`); a deleted conversation removes it.
  SQL tests that insert messages also create notifications. The bell shows no toast for
  the chat open in a visible tab (`isConversationPath`); message entries link to
  `/messages/<id>` and show the sender (`profiles` public columns).
  UI: `NotificationBell` (`src/components/notifications/`, in `SiteHeader` with
  `key = user id`; first count from `getUnreadNotificationCount`), state and Realtime in
  `useNotifications` (one channel per mount with a unique topic, INSERT/UPDATE filtered
  by `user_id`, batched reloads, session check, cleanup on unmount), rows rendered by
  `NotificationEntry`. Browser reads through `fetchNotifications`/`fetchUnreadCount`
  (`@/lib/notifications`, always also `.eq("user_id", …)`); writes only through
  `setNotificationRead`/`deleteNotification`/`markAllNotificationsRead`
  (`src/actions/notifications.ts`; each calls `refresh()` from `next/cache` on success,
  so optimistic UI hands over to the re-rendered page). `/notifications` renders
  `NotificationList` (`useOptimistic`) from `getNotificationPage` (20 per page,
  canonical `?page=`). Bell and page talk through window events
  (`NOTIFICATIONS_RECEIVED_EVENT`, `NOTIFICATIONS_CHANGED_EVENT`), never a second
  subscription. Supabase `.range()` past the end returns error `PGRST103` (416), not
  an empty list: handle it in paged queries.
- Messaging (§16): `conversations` (one per item and requester; started only about an
  `active` item of `owner_id`; no user updates/deletes) and `messages` (participants
  only, `sender_id` = self, recipient updates only `read_at`; body ≤ 2000 and not only
  whitespace; `created_at` = `clock_timestamp()`). Trigger errors: `FL429`
  `message_rate_limit` (30 per minute), `FL429` `daily_conversation_limit` (20 new conversations
  per requester in 24 h; advisory lock per requester, so exact under concurrency;
  re-opening an existing conversation is exempt). `last_message_at` is trigger-maintained (null
  before the first message). The list comes from `rpc("my_conversations")` (owner sees
  a conversation only after its first message; item columns null when deleted or
  hidden); read state through `rpc("mark_conversation_read")` (returns the count, 0 for
  banned users). `messages` is in the Realtime publication. Admins have no access.
  Starting: only through `startConversation` (`src/actions/messages.ts`; redirects to
  `/messages/[id]`, returns error codes `conversation_own_item`,
  `conversation_item_inactive`, `conversation_limit`, `not_found`, `forbidden`); the
  owner id always comes from the item. Item page: `ContactButton`
  (`src/components/chat/`), "Open conversation" when `getOwnConversationId` finds one,
  login link for guests, nothing for owners. Reads: `@/lib/queries/conversations`
  (`getConversation` returns the other participant; null → 404; `getMyConversations`
  maps `rpc("my_conversations")` with `toConversationSummaries` from `@/lib/conversations`,
  client-safe: item null when deleted/hidden, last message null before the first).
  `/messages` renders `ConversationList` (`src/components/chat/`) in the RPC's order;
  times via `ConversationTime` (client; `elapsedSince` + `Messages.list.time`, no `Intl`,
  F-30; server time for hydration, then a shared one-minute clock). Server Components
  must not pass `updateInterval` to `useNow` (ignored, logs a warning).
  Chat: the page loads `getLatestMessages` (newest 50) into `ChatView`
  (`src/components/chat/`; one channel per mount with a unique topic, INSERT filtered by
  `conversation_id`, catch-up after every `SUBSCRIBED`/visible tab, older pages by
  `created_at` cursor). Browser reads and merging through `@/lib/chat`
  (`fetchMessagesBefore`/`fetchMessagesAfter`, `mergeMessages` dedupes by id,
  `realtimeMessage` validates payloads). Sending only through `sendMessage`
  (`src/actions/messages.ts`; returns the stored `ChatMessage`; `FL429` →
  `message_rate_limit`). Form data turns line breaks into `\r\n`: schemas for multi-line
  text normalize them before length checks (`sendMessageSchema`). Times of day:
  `clockTime()` (`@/lib/dates`, Europe/Skopje, same on server and browser).
  Read state: `ChatView` marks the other side's messages read only through
  `markConversationRead` (action; never while rendering), only in a visible tab, batched;
  then dispatches `MESSAGES_READ_EVENT`. The header's `MessagesLink`/`useUnreadMessages`
  (key = user id; first count `getUnreadMessageCount`) is the only subscription to all of
  the user's messages (INSERT, UPDATE with `sender_id=neq.<user>`); it reloads
  `fetchUnreadMessageCount` (equals the sum of `my_conversations()` counts) and passes
  Realtime events on as `MESSAGES_CHANGED_EVENT`, which `RefreshOnMessages` on
  `/messages` answers with `router.refresh()`. Never add a second all-messages channel.
  Back/Forward restores pages from the router cache without a request: `RefreshOnMessages`
  keeps the messages version (`noteMessagesChanged`/`currentMessagesVersion` in
  `@/lib/chat`; bumped by `useUnreadMessages` on Realtime events and by `ChatView` after
  a read or send) per `router.bfcacheId` and refreshes a restored, older list once
  (F-33). Code that changes the user's messages in the browser must call
  `noteMessagesChanged()`.
  Banned users cannot mark read (the RPC returns 0).
- Client components must not format dates, relative times or numbers with `Intl` for
  `mk`: Chromium has no Macedonian `Intl` data (F-30; only `PluralRules`). Use messages
  (e.g. `elapsedSince()` from `@/lib/dates` + ICU plurals) or render on the server.
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
  transaction; returns removed paths to delete; both require `lat`/`lng`). `items.location` is
  required; read coordinates from the generated columns `lat, lng` (never parse `location`). `deleteItem` removes the item's whole folder. Trigger
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
  Distance: `search_items(near_lat, near_lng, radius_km, sort => 'nearest')` returns
  `distance_m`; in the URL `lat`/`lng` (4 decimals, `centerParam()`) and `radius`
  (`SEARCH_RADII`); sorts come from `availableSorts()`/`defaultSort({ q, near })`.
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
  (`DEFAULT_CENTER`, OSM tile URL/attribution) in `@/lib/map`. Markers use `markerIcon`
  (`src/components/map/marker-icon.ts`), passed as `icon`. Image imports from
  `node_modules` are `StaticImageData` in webpack but URL strings in Turbopack (Vercel) and
  Vitest: handle both (F-25). `MapFrame` wraps maps in `MapErrorBoundary`: a failing map shows
  a message instead of breaking the page. Read-only item map: `ItemMap`; link out with
  `osmUrl()` (`@/lib/map`). Leaflet workarounds go in `src/components/map/leaflet-fixes.ts`
  (imported by `base-map`; F-27). Mount a map only when it is visible (Leaflet cannot
  size a hidden one, e.g. in the collapsed filter panel). Distances: `distanceDisplay()`.
  `/map`: `MapExplorer` loads `rpc("items_in_bounds")` from the browser (`fetchMapItems()`
  in `@/lib/map-items`, client-safe; debounced, aborting) and passes grouped items to
  `ItemsMap`; its type filter is `?type=` (`@/lib/validation/map`). Pages that redirect to
  a canonical query compare it with `requestQuery()` (`@/lib/validation/search`).
  Geocoding only through `@/lib/geocoding` (`searchAddress`, `reverseGeocode`): it holds
  the shared Nominatim throttle (≥ 1 s between requests, policy) and cache; never call
  Nominatim directly. Location input: `LocationPicker` (`src/components/map/location-picker.tsx`)
  posts `lat`, `lng`, `locationName`.
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
  (`-- @include <path>` inserts another file, e.g. `../seed/demo.sql`)
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
- Never junction/symlink `node_modules` into a `git worktree`: `git worktree remove --force`
  follows the junction and empties the project's `node_modules` (happened in P8.S6;
  restored with `npm ci`). Build an old commit with its own `npm ci` instead.
- Browser checks with two users in separate browser contexts: launch Edge with
  `--disable-background-timer-throttling --disable-renderer-backgrounding
--disable-backgrounding-occluded-windows`, or the window not in front misses its
  timers (Realtime reloads look broken). Chat bubbles carry `data-own="true|false"`.
- Local `npm run build` (Turbopack) works again since 2026-09-30; it failed earlier when
  Windows Application Control blocked the native SWC binary (F-22). If that happens again,
  verify with `npx next build --webpack`; do not change the scripts. webpack and Turbopack
  can differ (F-25): after pushing browser-facing changes (maps, assets), re-run the
  browser check against the Vercel deployment. The Vercel CLI is logged out and the
  repo is private, so confirm a deployment by markup that only the new commit renders
  (fetch a dynamic page, `X-Vercel-Cache: MISS`), never by HTTP 200 alone. There, wait for `load` and
  specific elements, not `networkidle` (prefetches stay open on Vercel, F-26).
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
