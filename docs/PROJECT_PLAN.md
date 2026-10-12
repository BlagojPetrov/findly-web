# Findly Web — Master Project Plan

> **Веб-платформа за управување и автоматско поврзување на пријави за изгубени и пронајдени предмети**
>
> This document is the single source of truth for the architecture, roadmap and
> progress of the Findly web project. Every step starts by reading it and ends by
> updating it.

- **Last updated:** 2026-10-12
- **Current phase:** Phase 11 — UI polish, testing and final delivery (P11.S1–P11.S2 completed; optional P7.S5 deferred)
- **Next step:** P11.S3 (§22, §25)

---

## Table of contents

1. [How to use this document](#1-how-to-use-this-document)
2. [Current Project Status](#2-current-project-status)
3. [Scope](#3-scope)
4. [Architectural decisions](#4-architectural-decisions)
5. [System architecture](#5-system-architecture)
6. [Frontend architecture](#6-frontend-architecture)
7. [Server / API architecture](#7-server--api-architecture)
8. [Supabase architecture](#8-supabase-architecture)
9. [Database structure](#9-database-structure)
10. [Authentication architecture](#10-authentication-architecture)
11. [RLS and security architecture](#11-rls-and-security-architecture)
12. [Search and filter architecture](#12-search-and-filter-architecture)
13. [Map and location architecture](#13-map-and-location-architecture)
14. [Matching system architecture](#14-matching-system-architecture)
15. [Notifications architecture](#15-notifications-architecture)
16. [Messaging architecture](#16-messaging-architecture)
17. [Favorites architecture](#17-favorites-architecture)
18. [Admin and moderation architecture](#18-admin-and-moderation-architecture)
19. [Internationalization](#19-internationalization)
20. [Testing strategy](#20-testing-strategy)
21. [Deployment strategy](#21-deployment-strategy)
22. [Phases and steps](#22-phases-and-steps)
23. [Audit log and known issues](#23-audit-log-and-known-issues)
24. [Changelog](#24-changelog)
25. [Next Recommended Step](#25-next-recommended-step)

---

## 1. How to use this document

### Step IDs

Steps are identified as `P<phase>.S<step>`, for example `P3.S2` = Phase 3, Step 2.
Commands such as _"Continue with P3.S2"_ or _"Continue with the next step"_ refer
to these IDs. "Next step" always means the step named in
[Next Recommended Step](#25-next-recommended-step).

### Status values

| Status         | Meaning                                                           |
| -------------- | ----------------------------------------------------------------- |
| `NOT STARTED`  | No work done.                                                     |
| `IN PROGRESS`  | Work started but the step's checks have not all passed.           |
| `COMPLETED`    | Implemented, checks passed, committed.                            |
| `NEEDS REVIEW` | Implemented but something must be verified or decided by a human. |

### Workflow for every step

1. **Inspect** the existing implementation and this document (the step's
   dependencies, affected files, and relevant architecture section).
2. **Explain** briefly what the step will change.
3. **Implement only that step.** No unrelated changes; anything discovered on the
   way goes into [Audit log](#23-audit-log-and-known-issues) instead.
4. **Check:** `npm run lint`, `npm run typecheck`, `npm test`,
   `npm run build`, plus the step's own verification list. For migrations also
   `npx supabase db advisors --linked`.
5. **Fix** any issue caused by the step.
6. **Update this document:** step status, [Changelog](#24-changelog), and
   [Next Recommended Step](#25-next-recommended-step). If the implementation
   deviates from the plan, update the relevant architecture section too.
7. **Update `CLAUDE.md`** if conventions, commands or project state changed.
8. **Commit** (one commit per step, message `P<n>.S<m>: <summary>`).
9. **Stop.** Report what changed, how to test it, and any manual configuration.
   Never continue into the next step without confirmation. At the end of a
   phase, also report the phase's Definition of Done.

### Rules for changing the plan

- The plan may change, but only explicitly: edit the section, note the change in
  the Changelog, and mention it in the step report.
- Applied migrations are never edited. Changes to the schema always go in a new
  migration.

---

## 2. Current Project Status

| Phase | Name                                  | Status        |
| ----- | ------------------------------------- | ------------- |
| 1     | Project setup and architecture        | `COMPLETED`   |
| 2     | Authentication                        | `COMPLETED`   |
| 3     | Items CRUD and image upload           | `COMPLETED`   |
| 4     | Feed, search and advanced filters     | `COMPLETED`   |
| 5     | Map and location                      | `COMPLETED`   |
| 6     | Automatic matching                    | `COMPLETED`   |
| 7     | Notifications                         | `COMPLETED`   |
| 8     | Messaging                             | `COMPLETED`   |
| 9     | Favorites                             | `COMPLETED`   |
| 10    | Admin and moderation                  | `COMPLETED`   |
| 11    | UI polish, testing and final delivery | `IN PROGRESS` |

### Step status

| Step   | Title                                          | Status        |
| ------ | ---------------------------------------------- | ------------- |
| P1.S1  | Scaffold Next.js project                       | `COMPLETED`   |
| P1.S2  | Tooling (shadcn/ui, Prettier, scripts)         | `COMPLETED`   |
| P1.S3  | Internationalization (next-intl, mk/en)        | `COMPLETED`   |
| P1.S4  | Supabase clients and proxy session refresh     | `COMPLETED`   |
| P1.S5  | Environment validation                         | `COMPLETED`   |
| P1.S6  | Initial migration (extensions, categories)     | `COMPLETED`   |
| P1.S7  | Base layout and home page                      | `COMPLETED`   |
| P1.S8  | Link Supabase project, push migration, types   | `COMPLETED`   |
| P1.S9  | Phase 1 audit and master plan                  | `COMPLETED`   |
| P2.S1  | Test tooling and action conventions            | `COMPLETED`   |
| P2.S2  | Profiles table, helper functions, RLS          | `COMPLETED`   |
| P2.S3  | Auth helpers and route protection              | `COMPLETED`   |
| P2.S4  | Register and login (email/password)            | `COMPLETED`   |
| P2.S5  | Email verification                             | `COMPLETED`   |
| P2.S6  | Forgot / reset password                        | `COMPLETED`   |
| P2.S7  | Google OAuth                                   | `COMPLETED`   |
| P2.S8  | Profile page and avatar upload                 | `COMPLETED`   |
| P2.S9  | SMTP setup (manual) — done before P2.S5        | `COMPLETED`   |
| P2.S10 | GitHub remote and first Vercel deployment      | `COMPLETED`   |
| P3.S1  | Items and images schema                        | `COMPLETED`   |
| P3.S2  | Item images storage bucket                     | `COMPLETED`   |
| P3.S3  | Item validation schemas                        | `COMPLETED`   |
| P3.S4  | Image picker and upload component              | `COMPLETED`   |
| P3.S5  | Create item page                               | `COMPLETED`   |
| P3.S6  | Item detail page (basic)                       | `COMPLETED`   |
| P3.S7  | Edit, delete, mark resolved                    | `COMPLETED`   |
| P3.S8  | Dashboard ("My reports")                       | `COMPLETED`   |
| P4.S1  | Search normalization and indexes               | `COMPLETED`   |
| P4.S2  | `search_items` SQL function                    | `COMPLETED`   |
| P4.S3  | Search params schema and parsing               | `COMPLETED`   |
| P4.S4  | Items feed page with filters                   | `COMPLETED`   |
| P4.S5  | Item cards, pagination, empty/loading states   | `COMPLETED`   |
| P4.S6  | SEO: metadata, Open Graph, sitemap, robots     | `COMPLETED`   |
| P4.S7  | Home page latest items                         | `COMPLETED`   |
| P5.S1  | Leaflet base map component                     | `COMPLETED`   |
| P5.S2  | Location picker and geocoding                  | `COMPLETED`   |
| P5.S3  | Location in item forms, make location required | `COMPLETED`   |
| P5.S4  | Map on item detail page                        | `COMPLETED`   |
| P5.S5  | Radius filter                                  | `COMPLETED`   |
| P5.S6  | `/map` page                                    | `COMPLETED`   |
| P6.S1  | Matches schema                                 | `COMPLETED`   |
| P6.S2  | Scoring functions                              | `COMPLETED`   |
| P6.S3  | `compute_matches` and triggers                 | `COMPLETED`   |
| P6.S4  | Matches UI with explanation                    | `COMPLETED`   |
| P6.S5  | Dismiss / confirm matches (merged into P6.S4)  | `COMPLETED`   |
| P6.S6  | Demo dataset and weight tuning                 | `COMPLETED`   |
| P7.S1  | Notifications schema                           | `COMPLETED`   |
| P7.S2  | Match notification trigger                     | `COMPLETED`   |
| P7.S3  | Notification bell with Realtime                | `COMPLETED`   |
| P7.S4  | Notifications page                             | `COMPLETED`   |
| P7.S5  | (Optional) Email for new matches — deferred    | `NOT STARTED` |
| P8.S1  | Conversations and messages schema              | `COMPLETED`   |
| P8.S2  | Start conversation from item                   | `COMPLETED`   |
| P8.S3  | Conversation list                              | `COMPLETED`   |
| P8.S4  | Chat view with Realtime                        | `COMPLETED`   |
| P8.S5  | Read state and unread badge                    | `COMPLETED`   |
| P8.S6  | Message notifications                          | `COMPLETED`   |
| P9.S1  | Favorites schema                               | `COMPLETED`   |
| P9.S2  | Favorite toggle                                | `COMPLETED`   |
| P9.S3  | Favorites page                                 | `COMPLETED`   |
| P10.S1 | Reports schema and admin policies              | `COMPLETED`   |
| P10.S2 | Report item UI                                 | `COMPLETED`   |
| P10.S3 | Admin area layout and dashboard                | `COMPLETED`   |
| P10.S4 | Reports queue and item moderation              | `COMPLETED`   |
| P10.S5 | User management (ban/unban)                    | `COMPLETED`   |
| P10.S6 | Category management                            | `COMPLETED`   |
| P11.S1 | Dark mode                                      | `COMPLETED`   |
| P11.S2 | Responsive, accessibility, error boundaries    | `COMPLETED`   |
| P11.S3 | Performance pass                               | `NOT STARTED` |
| P11.S4 | End-to-end tests and CI                        | `NOT STARTED` |
| P11.S5 | Production environment                         | `NOT STARTED` |
| P11.S6 | Demo data and defense preparation              | `NOT STARTED` |

---

## 3. Scope

### In scope

Registration and login, email verification, Google login, user profile,
lost/found reports with images, title, description, category, date, location
(text + coordinates), interactive map, server-side search with filters (text,
type, category, date, status, radius), automatic matching with a score and an
explanation, in-app notifications, favorites, user-to-user messaging per item,
admin/moderation, responsive UI in Macedonian and English, public shareable item
pages with SEO.

### Out of scope (unless explicitly agreed later)

Native mobile apps, web push notifications, payments, phone/SMS login, anonymous
accounts (the Android app had them; the web app lets guests browse without an
account instead), AI/ML image recognition, public user profile pages, account
self-deletion UI (can be done by an admin; revisit if required).

### Android reference (BlagojPetrov/Findly)

Used only as a functional reference, never modified. Concepts reused: 8
categories, LOST/FOUND types, ACTIVE status, per-item conversations, mk/en
strings, brand color `#6C63FF`. Weaknesses deliberately fixed on the web:
client-side search over all items, English-only tokenizer that removed Cyrillic
text before matching, matching by category + text only, device-local favorites,
Firestore rules covering only `items`, single image, no coordinates or event date.

---

## 4. Architectural decisions

| ID    | Decision                                                                                                                                                            | Reason                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| AD-01 | Next.js 16 App Router + TypeScript, no separate backend.                                                                                                            | One codebase, Server Components/Actions cover the API needs.                                                    |
| AD-02 | Supabase for Postgres, Auth, Storage and Realtime.                                                                                                                  | Free tier, SQL + RLS, all needed services in one place.                                                         |
| AD-03 | Business logic that needs data consistency (search, matching, notification creation) lives in Postgres functions and triggers.                                      | Works no matter which client writes; no queue/worker needed; easy to explain in the thesis.                     |
| AD-04 | Reads in Server Components; writes via Server Actions validated with Zod. Route Handlers only where a URL endpoint is required (auth callbacks, optional webhooks). | Single, consistent write path; validation on the server.                                                        |
| AD-05 | RLS is the authorization layer. Server code checks auth for UX and early errors, but correctness never depends on it.                                               | Defense in depth; Supabase grants table privileges to `anon`/`authenticated` by default (see F-03).             |
| AD-06 | Only the publishable key is used in the app. No secret/service-role key in the Next.js app.                                                                         | Every request runs as the real user under RLS. Privileged work happens in `security definer` SQL.               |
| AD-07 | Migrations in `supabase/migrations/`, applied with `supabase db push` to hosted projects. No local Supabase stack.                                                  | Local stack needs Docker, which is out of scope.                                                                |
| AD-08 | next-intl with `localePrefix: "as-needed"`: Macedonian at `/`, English at `/en`.                                                                                    | Macedonian is the primary audience; both languages indexable by search engines.                                 |
| AD-09 | Locations stored as PostGIS `geography(Point, 4326)`.                                                                                                               | Correct distances in meters, indexed radius queries (`ST_DWithin`).                                             |
| AD-10 | Search: normalized text (lowercase, unaccent, Cyrillic→Latin transliteration) with full-text search + trigram similarity.                                           | Postgres has no Macedonian dictionary; users mix Cyrillic and Latin spelling.                                   |
| AD-11 | Matching is a deterministic weighted score (category, distance, date, text) with a stored breakdown.                                                                | Explainable to users and to the thesis committee; tunable.                                                      |
| AD-12 | In-app notifications stored in a table and pushed with Supabase Realtime. No web push.                                                                              | History + live updates without service workers.                                                                 |
| AD-13 | Leaflet + OpenStreetMap tiles, Nominatim geocoding called from the browser (debounced, ≤1 req/s).                                                                   | Free, no API keys.                                                                                              |
| AD-14 | shadcn/ui (Base UI primitives, `cn` package) for components; Tailwind 4 tokens in `globals.css`.                                                                    | Owned component code, consistent design.                                                                        |
| AD-15 | Forms use React 19 `useActionState` + Server Actions; no form library.                                                                                              | Fewer dependencies. Forms wrap the action in a client function to keep entered values, so they need JavaScript. |
| AD-16 | Server Actions return typed results with **error codes**, not translated strings; the UI translates.                                                                | Keeps i18n in one place.                                                                                        |
| AD-17 | Images compressed in the browser (canvas → WebP, max 1600 px) before upload to Supabase Storage.                                                                    | Free tier has 1 GB storage; faster uploads.                                                                     |
| AD-18 | Two Supabase projects: the current one for development, a separate one for production (created in P11.S5).                                                          | Test data and destructive tests never touch production. Free tier allows 2 projects.                            |
| AD-19 | Font Inter (latin + cyrillic) via `next/font`, exposed as `--font-inter`; `--font-sans` points to it.                                                               | Geist has no Cyrillic glyphs.                                                                                   |
| AD-20 | Item URLs are `/items/<uuid>` (no slug).                                                                                                                            | Stable links; title goes in metadata. Revisit only if SEO requires it.                                          |

---

## 5. System architecture

```
Browser
  │  HTML (RSC), Server Action POSTs, Supabase JS (Realtime, Storage uploads)
  ▼
Vercel ── Next.js 16
  ├─ src/proxy.ts            i18n routing + Supabase session refresh (every page request)
  ├─ Server Components       read data with the per-request Supabase server client
  ├─ Server Actions          validate (Zod) → write through Supabase as the user
  ├─ Route Handlers          /api/auth/confirm, /api/auth/callback
  └─ Client Components       map, forms, chat, notification bell, image upload
  │
  ▼
Supabase (project ref lyvudeaxwibgpqsinqyz, eu-central-1, Postgres 17)
  ├─ Postgres   tables + RLS + SQL functions (search, matching) + triggers (notifications)
  ├─ Auth       email/password (confirmation required), Google OAuth
  ├─ Storage    buckets: avatars, item-images
  └─ Realtime   postgres_changes on messages, notifications
External (free): OpenStreetMap tiles, Nominatim geocoding, SMTP provider (Brevo/Resend)
```

---

## 6. Frontend architecture

### Current structure (implemented)

```
messages/mk.json, en.json            translations (mk is the type source)
src/app/favicon.ico, globals.css
src/app/[locale]/layout.tsx          root layout: <html lang>, font, providers, header/footer
src/app/[locale]/page.tsx            home
src/app/[locale]/not-found.tsx       localized 404
src/app/[locale]/[...rest]/page.tsx  catch-all → notFound()
src/components/ui/                   shadcn/ui: button, card, dropdown-menu, input, label, sheet, sonner
src/components/layout/               site-header, site-footer, locale-switcher
src/components/items/category-icon.tsx
src/i18n/                            routing.ts, request.ts, navigation.ts
src/lib/env.ts, utils.ts
src/lib/supabase/                    server.ts, client.ts, proxy.ts
src/proxy.ts
src/types/database.ts                generated
src/global.d.ts                      next-intl type augmentation
```

### Target structure (added by later phases)

```
src/app/[locale]/(auth)/             login, register, verify-email, forgot-password, reset-password
src/app/[locale]/(app)/              protected: dashboard, items/new, items/[id]/edit, messages,
                                     messages/[id], favorites, notifications, profile
src/app/[locale]/items/              public feed + items/[id]
src/app/[locale]/map/                public map
src/app/[locale]/(app)/admin/        admin area (role-guarded, P10.S3)
src/app/api/auth/confirm/route.ts    email link verification (token_hash)
src/app/api/auth/callback/route.ts   OAuth code exchange
src/app/sitemap.ts, robots.ts
src/actions/<feature>.ts             "use server" actions: auth, profile, items, matches, messages, favorites, admin
src/lib/queries/<feature>.ts         server-only read functions
src/lib/validation/<feature>.ts      Zod schemas shared by forms and actions
src/lib/auth.ts                      getCurrentUser(), requireUser(), requireAdmin()
src/components/<feature>/            auth, items, map, matches, chat, notifications, admin
```

Route groups `(auth)` and `(app)` do not change URLs; they only share layouts.

### Conventions

- Server Components by default; `"use client"` only for interactivity (map, forms
  with state, Realtime, uploads). Client components receive data as props.
- Navigation uses `Link`, `redirect`, `useRouter` from `@/i18n/navigation`, never
  from `next/link` / `next/navigation` directly (except `notFound`,
  `useSearchParams`).
- Next.js 16: `params`, `searchParams`, `cookies()` are async; use the global
  `PageProps<"/route">` / `LayoutProps<"/route">` helpers; `middleware.ts` is
  `proxy.ts`. Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- List/filter state lives in the URL (`searchParams`), so it is shareable and SEO
  friendly.
- Every page that uses `params.locale` calls `setRequestLocale(locale)`.
- Styling: Tailwind utilities + shadcn tokens (`bg-primary`, `text-muted-foreground`, …).
  Lost/found colors will be added as tokens in P3.S6 (orange = lost, green = found,
  as in the Android app).

### Route map

| Route                                                                                                                             | Access          | Phase |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----- |
| `/`                                                                                                                               | public          | 1, 4  |
| `/login`, `/register`, `/forgot-password`                                                                                         | guests          | 2     |
| `/verify-email`, `/reset-password`                                                                                                | public          | 2     |
| `/profile`                                                                                                                        | signed in       | 2     |
| `/items`                                                                                                                          | public          | 4     |
| `/items/[id]`                                                                                                                     | public (active) | 3, 4  |
| `/items/new`, `/items/[id]/edit`                                                                                                  | signed in/owner | 3     |
| `/dashboard`                                                                                                                      | signed in       | 3     |
| `/map`                                                                                                                            | public          | 5     |
| `/notifications` ✓ (`?page=` from 2)                                                                                              | signed in       | 7     |
| `/messages/[id]` ✓ (chat since P8.S4)                                                                                             | participants    | 8     |
| `/messages` ✓                                                                                                                     | signed in       | 8     |
| `/favorites`                                                                                                                      | signed in       | 9     |
| `/admin` ✓, `/admin/reports` ✓ (`?view=hidden`, `?page=`), `/admin/users` ✓ (`?q=`, `?banned=1`, `?page=`), `/admin/categories` ✓ | admin           | 10    |

All routes also exist under `/en/...`.

---

## 7. Server / API architecture

### Reads

- Server Components call functions in `src/lib/queries/*` (marked
  `import "server-only"`), which use `createClient()` from
  `@/lib/supabase/server`. RLS decides what each user can see.
- Complex reads (search, map bounding box, conversation list) are Postgres
  functions called with `supabase.rpc(...)` and declared `security invoker` so RLS
  still applies.
- Interactive reads that change with every map move (`/map`, P5.S6) call the
  RPC from the browser with `@/lib/supabase/client` (publishable key, the
  visitor's session, so RLS is the same); the helpers stay client-safe
  (`@/lib/map-items`). The header bell (P7.S3) reads notifications the same way
  (`@/lib/notifications`), because Realtime events and the panel refresh in the
  browser; its first unread count comes from the server
  (`@/lib/queries/notifications`).

### Writes — Server Actions

Every action in `src/actions/*.ts` follows the same shape:

```ts
"use server";
export async function createItem(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser(); // 1. authenticate (redirects if signed out)
  const parsed = itemSchema.safeParse(fromFormData(formData)); // 2. validate
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient(); // 3. write as the user (RLS applies)
  const { data, error } = await supabase.from("items").insert({...}).select("id").single();
  if (error) return fail("database"); // 4. map errors to codes
  revalidatePath(...); // 5. refresh affected pages
  return ok({ id: data.id });
}
```

`ActionResult<T>` (added in P2.S1, `src/lib/action-result.ts`):

```ts
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorCode; fieldErrors?: Record<string, string[]> };
```

- `ErrorCode` is derived from the keys of the `Errors` namespace in
  `messages/mk.json` (e.g. `unauthorized`, `forbidden`, `validation`,
  `not_found`, `rate_limited`, `database`, `unknown`, plus feature codes such as
  `conversation_limit`). Adding a code means adding
  its translation in both files; the UI shows it with `useTranslations("Errors")`.
- Zod messages are keys of the `Validation` namespace, written with
  `msg("passwordTooShort")` from `src/lib/validation/messages.ts` (typos are type
  errors). `FormField` translates `fieldErrors[field][0]`; put
  `min(1, msg("required"))` before other length rules so empty fields say "required".
- Supabase Auth errors go through `authFailure()` (`src/lib/auth-errors.ts`).
- **Forms (P2.S4 pattern):** actions take `(formData)`. The client form calls it
  inside `useActionState` and keeps the non-secret entered values in state for
  `defaultValue` (React resets forms after an action). Shared pieces:
  `src/components/forms/{form-field,form-error,submit-button}.tsx`. `FormError`
  shows the form-level error; for `validation` it only appears when no field
  error is shown, so a failure is never silent.
- Actions never trust IDs from the client for ownership; RLS enforces it and the
  action checks affected row counts.

### Route Handlers

| Route                | Purpose                                                      | Phase |
| -------------------- | ------------------------------------------------------------ | ----- |
| `/api/auth/confirm`  | Verify email/recovery links (`verifyOtp` with `token_hash`). | 2     |
| `/api/auth/callback` | Exchange OAuth `code` for a session (Google).                | 2     |
| `/api/webhooks/*`    | Only if the optional match email (P7.S5) is implemented.     | 7     |

`/api/*` is excluded from the proxy matcher (no i18n rewriting). Handlers
redirect to localized pages using a validated `next` parameter (relative paths
only, to prevent open redirects).

---

## 8. Supabase architecture

### Clients (implemented)

| File                         | Used in                              | Notes                                                               |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| `src/lib/supabase/server.ts` | Server Components, Actions, Handlers | New client per request; cookie writes ignored in Server Components. |
| `src/lib/supabase/client.ts` | Client Components                    | Realtime, Storage uploads.                                          |
| `src/lib/supabase/proxy.ts`  | `src/proxy.ts`                       | `getClaims()` validates the JWT and refreshes the session cookie.   |

All are typed with `Database` from `src/types/database.ts`.

### Environment

| Variable                               | Where                                   |
| -------------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Base URL only, validated (no path).     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...`                    |
| `NEXT_PUBLIC_SITE_URL`                 | Metadata base, sitemap, auth redirects. |

Validated at startup by `src/lib/env.ts`. `.env.local` is gitignored;
`.env.example` documents the variables.

### Migrations and types

- Create: `npm run db:new -- <name>` → `supabase/migrations/<timestamp>_<name>.sql`.
- Apply: `npm run db:push`. Regenerate types: `npm run db:types` (commit the result).
- One migration per step that changes the schema. A migration that creates a
  table also enables RLS and creates its policies and indexes in the same file.
- `supabase/config.toml` is only used by the CLI and a local stack we do not run.
  Its auth values do **not** reflect the hosted project. **Never run
  `supabase config push`** — it would overwrite the hosted auth settings (site
  URL, confirmations). Hosted settings are managed in the dashboard and recorded
  in [§10](#10-authentication-architecture).
- CLI on Windows: `supabase login` needs an interactive terminal; run it in a
  normal PowerShell window. Other CLI commands work non-interactively.

### SQL conventions

- Tables in `public`, snake_case, `id uuid default gen_random_uuid()` (except
  small lookup tables), `created_at`/`updated_at timestamptz`.
- Enums as Postgres enum types for fixed sets (item_type, item_status, …); lookup
  tables where admins can change the values (categories).
- Functions: `set search_path = ''` and fully qualified names. Policy helpers go in schema `private`; `public` holds only functions the app calls via `rpc()`. `security invoker`
  by default; `security definer` only when a function must write rows the caller
  cannot (matching, notifications), and then it validates its inputs itself.
- Extensions live in schema `extensions` (postgis, pg_trgm, unaccent — installed).

### Storage

| Bucket          | Public read | Write rule                                                                                                                             | Phase |
| --------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `avatars` ✓     | yes         | `{user_id}/{uuid}.webp` (or `.jpg`); owner inserts, sees and deletes, no updates; 1 MB, WebP/JPEG (P2.S8).                             | 2     |
| `item-images` ✓ | yes         | `{user_id}/{item_id}/{uuid}.webp` (or `.jpg`); owner inserts, sees, deletes; admin sees, deletes; no updates; 5 MB, WebP/JPEG (P3.S2). | 3     |

Public buckets are acceptable because items are public. Images of hidden items
remain reachable by direct URL (known limitation, documented for the thesis).

### Realtime

`messages` (✓ P8.S1) and `notifications` (✓ P7.S1) are added to the `supabase_realtime` publication.
Realtime respects RLS, so clients only receive their own rows.

---

## 9. Database structure

Legend: **PK** primary key, **FK** foreign key, ✓ implemented.

### Helper functions

| Function                           | Purpose                                                                                | Phase |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ----- |
| `set_updated_at()`                 | Trigger function that sets `updated_at = now()`.                                       | 2     |
| `private.is_admin()`               | `true` if the current user's profile has role `admin`. `security definer`, `stable`. ✓ | 2     |
| `private.can_write()`              | `true` if signed in and not banned. Used in every insert/update policy. ✓              | 2     |
| `current_profile()`                | The signed-in user's full profile row (API-callable). ✓                                | 2     |
| `create_item(...)`                 | Creates an item and its image rows in one transaction (`security invoker`). ✓          | 3     |
| `private.items_*()`                | Item triggers: `resolved_at`, no future `occurred_on`, 20 items / 24 h. ✓              | 3     |
| `handle_new_user()`                | Trigger on `auth.users` insert → creates the `profiles` row.                           | 2     |
| `normalize_text(text)`             | lowercase + unaccent + Cyrillic→Latin transliteration, `immutable`.                    | 4     |
| `search_items(...)`                | Filtered, paginated search (see §12).                                                  | 4     |
| `items_in_bounds(...)`             | Active items inside a map bounding box (see §13). ✓                                    | 5     |
| `private.match_score(lost, found)` | Candidate rules + score and breakdown jsonb of a lost/found pair (see §14). ✓          | 6     |
| `compute_matches(item_id)`         | Recomputes matches for one item.                                                       | 6     |
| `my_conversations()`               | The caller's conversations for `/messages` (see §9 `conversations`). ✓                 | 8     |
| `mark_conversation_read(id)`       | Marks the other participant's messages read, returns the count. ✓                      | 8     |
| `admin_set_banned(user_id, bool)`  | Bans/unbans a user (not self, not admins); `42501` for non-admins. ✓                   | 10    |
| `admin_stats()`                    | One row of counts for the admin dashboard; `42501` for non-admins. ✓                   | 10    |

### Enums

| Enum                  | Values                                                 | Phase |
| --------------------- | ------------------------------------------------------ | ----- |
| `user_role`           | `user`, `admin`                                        | 2     |
| `item_type`           | `lost`, `found`                                        | 3     |
| `item_status`         | `active`, `resolved`, `hidden`                         | 3     |
| `match_status` ✓      | `suggested`, `dismissed`, `confirmed`                  | 6     |
| `notification_type` ✓ | `match`, `message`, `moderation`                       | 7     |
| `report_reason`       | `spam`, `inappropriate`, `fraud`, `duplicate`, `other` | 10    |
| `report_status`       | `open`, `resolved`, `dismissed`                        | 10    |

### `categories` ✓ (P1.S6)

| Column       | Type        | Notes                                      |
| ------------ | ----------- | ------------------------------------------ |
| `id`         | smallint PK | identity                                   |
| `slug`       | text        | unique, `^[a-z0-9-]+$`                     |
| `name_mk`    | text        | 1–50 chars                                 |
| `name_en`    | text        | 1–50 chars                                 |
| `icon`       | text        | lucide icon name, mapped in `CategoryIcon` |
| `sort_order` | smallint    | default 0                                  |
| `created_at` | timestamptz |                                            |

Seed: electronics, documents, wallet, keys, accessories, clothing, pets, other.

P10.S1 added admin insert/update/delete policies. P10.S6
(`20261005204612_category_management.sql`): `slug` is no longer updatable (feed URLs
and the matching functions use it); trigger `categories_protect_other` refuses to
delete `other` (`FL409`, the matching rules treat it as "any category");
`admin_reorder_categories(category_ids)` (security invoker, admins only: `42501`)
sets `sort_order` to 10, 20, … in the array's order and refuses (`22023`) a list
that does not hold every category exactly once; `admin_category_item_counts()`
(security invoker, admins only) counts the reports per category, hidden included.
Icons: `CATEGORY_ICONS` (`@/lib/category-icons`, 24 names) mapped in `CategoryIcon`.

### `profiles` ✓ (P2.S2)

Column privileges: `anon`/`authenticated` may **select only** `id, display_name, avatar_path, created_at` and `authenticated` may **update only** `display_name, avatar_path, preferred_locale` (own row). Always select explicit columns — `select("*")` on `profiles` fails with 42501. The own full row comes from `rpc("current_profile")`. `avatar_path` must start with `<id>/`.

| Column                     | Type        | Notes                                        |
| -------------------------- | ----------- | -------------------------------------------- |
| `id`                       | uuid PK     | FK → `auth.users.id` on delete cascade       |
| `display_name`             | text        | 2–50 chars; from sign-up form or Google name |
| `avatar_path`              | text null   | Storage path in `avatars` (not a URL), P2.S8 |
| `preferred_locale`         | text        | `mk` \| `en`, default `mk` (for emails)      |
| `role`                     | user_role   | default `user`; not updatable by users       |
| `is_banned`                | boolean     | default false; not updatable by users        |
| `created_at`, `updated_at` | timestamptz |                                              |

### `items` ✓ (P3.S1, extended in P4.S1 and P5.S3)

| Column                     | Type                  | Notes                                                                        |
| -------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `id`                       | uuid PK               | generated in the browser before image upload (default `gen_random_uuid()`)   |
| `user_id`                  | uuid                  | FK → profiles on delete cascade; default `auth.uid()`                        |
| `type`                     | item_type             |                                                                              |
| `status`                   | item_status           | default `active`                                                             |
| `title`                    | text                  | 3–100 chars                                                                  |
| `description`              | text                  | 10–2000 chars                                                                |
| `category_id`              | smallint              | FK → categories (restrict)                                                   |
| `occurred_on`              | date                  | when lost/found; not in the future (validated in Zod and a trigger)          |
| `location_name`            | text null             | ≤ 200 chars, human-readable address                                          |
| `location`                 | geography(Point,4326) | nullable in P3, `not null` from P5.S3                                        |
| `lat`, `lng`               | double precision      | P5.S3: stored generated `ST_Y`/`ST_X` of `location` (read by the app)        |
| `search_text`              | text                  | P4.S1: `normalize_text(title ‖ description ‖ location_name)`, set by trigger |
| `search_vector`            | tsvector              | P4.S1: generated from `search_text` (`simple` config)                        |
| `resolved_at`              | timestamptz null      | set when status becomes `resolved`                                           |
| `created_at`, `updated_at` | timestamptz           |                                                                              |

Indexes: `(status, type, created_at desc)`, `(user_id, created_at desc)`,
`(category_id)`, GiST on `location` (P3.S1); GIN on `search_vector`, GIN trigram on
`search_text` (P4.S1).

Implemented in P3.S1 (`20260926180914_items.sql`):

- Privileges: everyone selects; `authenticated` inserts `id, user_id, type, title,
description, category_id, occurred_on, location_name, location` (not `status` —
  items always start `active`) and updates the same columns minus `id`/`user_id`
  plus `status`. `resolved_at` and timestamps are trigger-managed only.
- Triggers (functions in `private`): `set_updated_at`; `items_set_resolved_at`
  (set on → `resolved`, cleared otherwise); `items_check_occurred_on` rejects dates
  after **today in `Europe/Skopje`** (SQLSTATE `23514`, message
  `occurred_on_in_future`); `items_check_daily_limit` rejects the 21st item in
  24 hours (SQLSTATE `FL429`, message `daily_item_limit`; approximate under
  concurrent inserts).
- `create_item(type, title, description, category_id, occurred_on,
location_name?, image_paths?, item_id?)` — `security invoker`, `authenticated`
  only; trims text, blank `location_name` → null, rejects > 5 images, inserts the
  item and its images (position = array index) in one transaction, returns the id.

### `item_images` ✓ (P3.S1)

| Column         | Type        | Notes                                     |
| -------------- | ----------- | ----------------------------------------- |
| `id`           | uuid PK     |                                           |
| `item_id`      | uuid        | FK → items on delete cascade              |
| `storage_path` | text        | unique; `{user_id}/{item_id}/{uuid}.webp` |
| `position`     | smallint    | 0–4; unique per item; 0 = cover image     |
| `created_at`   | timestamptz |                                           |

`storage_path` is checked against `^uuid/uuid/uuid\.(webp|jpg)$` with the second
segment equal to `item_id`; the insert policy requires the first segment to be the
caller's id. `(item_id, position)` is unique **deferrable**, so positions can be
swapped in one statement. Users insert `item_id, storage_path, position` and update
only `position`.

### `matches` (P6.S1)

| Column                     | Type         | Notes                                                                        |
| -------------------------- | ------------ | ---------------------------------------------------------------------------- |
| `id`                       | uuid PK      |                                                                              |
| `lost_item_id`             | uuid         | FK → items on delete cascade                                                 |
| `found_item_id`            | uuid         | FK → items on delete cascade                                                 |
| `score`                    | numeric(4,3) | 0–1                                                                          |
| `breakdown`                | jsonb        | component scores, distance km, day difference, shared words, weights version |
| `status`                   | match_status | default `suggested`                                                          |
| `created_at`, `updated_at` | timestamptz  |                                                                              |

Unique `(lost_item_id, found_item_id)`; indexes on both FKs.

Implemented in P6.S1 (`20260930174554_matches.sql`): the unique constraint is the
index for `lost_item_id`, plus `matches_found_item_id_idx`; checks `score between 0
and 1`, `lost_item_id <> found_item_id`, `breakdown` is a JSON object (default `{}`);
`updated_at` trigger. That the pair is really lost ↔ found is guaranteed by the
matching functions (the only writers). Privileges: `authenticated` selects and
updates only `status` (any value, so an owner may also undo a dismissal); `anon` has
none; no insert/delete grants (rows go with their items through the cascade).
Policies: select and update when the caller owns either item (subquery on `items`,
which always shows users their own items, also hidden ones); update also requires
`can_write()`, so banned owners can read but not change matches. Admins have no
access (moderation works on items, not matches).

### `notifications` ✓ (P7.S1)

| Column       | Type              | Notes                                                                                |
| ------------ | ----------------- | ------------------------------------------------------------------------------------ |
| `id`         | uuid PK           |                                                                                      |
| `user_id`    | uuid              | FK → profiles on delete cascade                                                      |
| `type`       | notification_type |                                                                                      |
| `data`       | jsonb             | IDs only (match_id, item_id, conversation_id); text is rendered in the UI's language |
| `read_at`    | timestamptz null  |                                                                                      |
| `created_at` | timestamptz       |                                                                                      |

Index `(user_id, created_at desc)`; partial index where `read_at is null`.

Implemented in P7.S1 (`20261001114510_notifications.sql`): `data` is a JSON object
(default `{}`); indexes `notifications_user_id_created_at_idx` and
`notifications_user_id_unread_idx` (`(user_id) where read_at is null`). Privileges:
`authenticated` selects, deletes and updates only `read_at` (also back to `null`, mark
unread); `anon` has none; no insert grant (rows come from `security definer`
triggers, P7.S2/P8.S6/P10.S4). Policies: own rows only (admins too); update also
requires `can_write()`, delete does not (as for items). In the `supabase_realtime`
publication.

P7.S2 (`20261001120733_match_notifications.sql`) adds the unique partial index
`notifications_match_pair_key` on `((data->>'other_item_id'), (data->>'item_id'),
user_id) where type = 'match'`: one match notification per recipient and pair (also
used to find the notifications about a deleted item).

### `conversations` ✓ (P8.S1)

| Column            | Type        | Notes                                         |
| ----------------- | ----------- | --------------------------------------------- |
| `id`              | uuid PK     |                                               |
| `item_id`         | uuid null   | FK → items on delete set null (chat survives) |
| `owner_id`        | uuid        | FK → profiles; owner of the item              |
| `requester_id`    | uuid        | FK → profiles; user who started the chat      |
| `last_message_at` | timestamptz | updated by trigger on new message             |
| `created_at`      | timestamptz |                                               |

Unique `(item_id, requester_id)`; check `owner_id <> requester_id`.

Implemented in P8.S1 (`20261001143641_messaging.sql`): `owner_id` and `requester_id`
FK → profiles on delete cascade (a deleted account takes its conversations along);
`requester_id` defaults to `auth.uid()`; `last_message_at` is null until the first
message (trigger `messages_set_last_message_at`, `security definer`, never moves
back). Indexes: the unique constraint (for `item_id`), `conversations_owner_id_idx`,
`conversations_requester_id_idx`. Privileges: `authenticated` selects and inserts
`(item_id, owner_id, requester_id)`; no update/delete; `anon` none. Policies: select
for both participants; insert when `requester_id = auth.uid()`, `can_write()` and the
item is visible to the caller, `active` (not resolved/hidden) and owned by
`owner_id`; the owner contacting themselves fails the check constraint (23514).
Admins have no access (chats are private). Not in the Realtime publication.

Daily limit (`20261001150441_conversation_limit.sql`, after P8.S1): trigger
`conversations_check_daily_limit` (before insert, `security invoker`) allows at most
20 new conversations per requester in a rolling 24 hours (`created_at > now() - 24 h`),
error `FL429` `daily_conversation_limit`. It first takes a transaction-level advisory
lock per requester (`hashtextextended('conversations_daily_limit:' || requester_id, 0)`),
so concurrent inserts of one user are serialized and the limit is exact (checked with
two concurrent sessions: the second waited for the first and was rejected); other
users never wait. An insert of an existing (item, requester) pair skips the count, so
re-opening a conversation (`on conflict do nothing`) works at the limit. Only
conversations a user started count (not those where they are the owner).

`my_conversations()` (`security invoker`, `stable`): `id, item_id, item_title,
item_type, item_status, item_cover_path, is_owner, other_user_id,
other_display_name, other_avatar_path, last_message_body, last_message_sender_id,
last_message_at, unread_count, created_at`, ordered by
`coalesce(last_message_at, created_at) desc`. Item columns are null when the item is
deleted or hidden from the caller. The owner sees a conversation only once it has a
message; the requester sees it from the start.
`mark_conversation_read(conversation_id)` (`security invoker`): sets `read_at` on the
other participant's unread messages and returns the count; 0 for non-participants
and for banned users (reading must not fail for them).

### `messages` ✓ (P8.S1)

| Column            | Type             | Notes                                |
| ----------------- | ---------------- | ------------------------------------ |
| `id`              | uuid PK          |                                      |
| `conversation_id` | uuid             | FK → conversations on delete cascade |
| `sender_id`       | uuid             | FK → profiles                        |
| `body`            | text             | 1–2000 chars                         |
| `read_at`         | timestamptz null | set when the recipient reads it      |
| `created_at`      | timestamptz      |                                      |

Index `(conversation_id, created_at)`.

Implemented in P8.S1: `sender_id` FK → profiles on delete cascade, default
`auth.uid()`; `body` check `char_length(body) <= 2000 and body ~ '[^[:space:]]'`
(`btrim` keeps newlines/tabs; the app trims); `created_at` defaults to
`clock_timestamp()`, so messages of one transaction keep their order. Indexes
`messages_conversation_id_created_at_idx`, `messages_sender_id_created_at_idx` (rate
limit, FK), `messages_conversation_id_unread_idx` (`(conversation_id) where read_at is
null`). Trigger `messages_check_rate_limit`: at most 30 messages per sender per
minute, error `FL429` `message_rate_limit`. Privileges: `authenticated` selects,
inserts `(conversation_id, sender_id, body)`, updates only `read_at`; no delete;
`anon` none. Policies: select for participants (subquery on `conversations`);
insert as `sender_id = auth.uid()` into an own conversation with `can_write()`;
update by the recipient (`sender_id <> auth.uid()`, participant) with `can_write()`.
In the `supabase_realtime` publication.

### `favorites` ✓ (P9.S1)

| Column       | Type        | Notes                  |
| ------------ | ----------- | ---------------------- |
| `user_id`    | uuid        | FK → profiles, cascade |
| `item_id`    | uuid        | FK → items, cascade    |
| `created_at` | timestamptz |                        |

PK `(user_id, item_id)`. Indexes `(user_id, created_at desc)` (favorites page) and
`(item_id)` (cascade). Migration `20261003144124_favorites.sql`.

### `reports` ✓ (P10.S1)

| Column        | Type             | Notes                        |
| ------------- | ---------------- | ---------------------------- |
| `id`          | uuid PK          |                              |
| `reporter_id` | uuid             | FK → profiles                |
| `item_id`     | uuid             | FK → items on delete cascade |
| `reason`      | report_reason    |                              |
| `details`     | text null        | ≤ 500 chars                  |
| `status`      | report_status    | default `open`               |
| `resolved_by` | uuid null        | FK → profiles (admin)        |
| `resolved_at` | timestamptz null |                              |
| `created_at`  | timestamptz      |                              |

Unique `(reporter_id, item_id)` where `status = 'open'` (one open report per user per item).

Implemented in P10.S1 (`20261004150645_moderation.sql`): `reporter_id` defaults to
`auth.uid()` and cascades from profiles; `resolved_by` is `on delete set null`;
`details` is null or at most 500 characters with a non-whitespace character; check
`(status = 'open') = (resolved_at is null)`. Trigger `reports_set_resolution`
(before insert or update of `status`): inserts are always `open`; closing sets
`resolved_by = auth.uid()` and `resolved_at = now()`, reopening clears both.
Indexes: `reports_open_reporter_item_key` (the unique one),
`reports_open_created_at_idx` (queue), `reports_item_id_idx`,
`reports_reporter_id_idx`, `reports_resolved_by_idx`. Privileges: `authenticated`
selects, inserts `(reporter_id, item_id, reason, details)` and updates only
`status`; `anon` has none; no delete.

### Entity relationships

```
auth.users 1─1 profiles
profiles 1─* items *─1 categories
items 1─* item_images
items (lost) 1─* matches *─1 items (found)
profiles 1─* notifications
items 1─* conversations; profiles (owner, requester) 1─* conversations
conversations 1─* messages *─1 profiles (sender)
profiles *─* items via favorites
profiles 1─* reports *─1 items
```

---

## 10. Authentication architecture

### Methods

- Email + password with **required email confirmation**.
- Google OAuth (PKCE).
- Guests can browse public pages; every write requires sign-in.

### Session handling

- `@supabase/ssr` stores the session in cookies.
- `src/proxy.ts` runs on every page request: next-intl routing, then
  `updateSession()` which calls `supabase.auth.getClaims()` (validates the JWT,
  refreshes tokens, writes cookies and cache headers onto the response).
- Server code identifies the user with `getClaims()` (or `getUser()` when fresh
  user data is needed). `getSession()` is never trusted on the server.

### Route protection (P2.S3)

1. **Proxy (optimistic):** after `getClaims()`, requests to protected prefixes
   (`/dashboard`, `/items/new`, `/items/*/edit`, `/profile`, `/messages`,
   `/favorites`, `/notifications`, `/admin`, with or without `/en`) without a user
   are redirected to `/login?next=<path>`. Signed-in users visiting
   `/login`/`/register` are redirected to a safe `next` or to
   `AFTER_SIGN_IN_PATH` (`/dashboard` since P3.S8; `/` before).
   Rules live in `src/lib/auth-routes.ts` (pure, unit-tested); the path is
   URL-decoded before matching. **New protected routes must be added there.**
2. **Server (authoritative):** `getCurrentUser()` / `requireUser(next?)` /
   `requireAdmin(next?)` in `src/lib/auth.ts` (`server-only`, React
   `cache()` per request), called in protected layouts/pages and in every action.
   `requireAdmin()` answers non-admins with 404.
3. **Database (final):** RLS.

### Flows

| Flow                | Implementation                                                                                                                                                                                                                                                                                                                     | Step  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Register            | Action `signUp` → `supabase.auth.signUp({ email, password, options: { data: { display_name, locale }, emailRedirectTo } })` → `/verify-email`                                                                                                                                                                                      | P2.S4 |
| Profile creation    | `handle_new_user()` trigger copies `display_name` (or Google `full_name`) and `locale` from metadata                                                                                                                                                                                                                               | P2.S2 |
| Login               | Action `signIn` → `signInWithPassword`; unconfirmed email → error code `email_not_confirmed` with resend option                                                                                                                                                                                                                    | P2.S4 |
| Email confirmation  | Template (`supabase/templates/confirm-signup.html`) link → `/api/auth/confirm?token_hash=…&type=email&locale=…` → `verifyOtp` → signed in, redirected to `AFTER_SIGN_IN_PATH`. The default template (`?code=`, PKCE) is also accepted but only works in the browser that registered. Failures → `/verify-email?error=link_invalid` | P2.S5 |
| Resend confirmation | `/verify-email` form → action `resendConfirmation` → `auth.resend({ type: "signup", options: { emailRedirectTo } })`; always a neutral success message (Supabase also returns success for unknown addresses); 60 s client cooldown; Supabase's per-address cooldown → `resend_cooldown`                                            | P2.S5 |
| Forgot password     | `/forgot-password` → action `requestPasswordReset` → `resetPasswordForEmail(email, { redirectTo: /api/auth/confirm?locale=…&next=/reset-password })`; template link `?token_hash=…&type=recovery&next=/reset-password`; always neutral; failed links → `/forgot-password?error=link_invalid`                                       | P2.S6 |
| Reset password      | `/reset-password` (any session; guests get a link to request a new email) → action `resetPassword` → `updateUser({ password })` + sign out other sessions                                                                                                                                                                          | P2.S6 |
| Google              | Action `signInWithGoogle` → `signInWithOAuth({ provider: "google", options: { redirectTo: /api/auth/callback?locale=…&next=… } })` → Google → callback `exchangeCodeForSession`; failures → `/login?error=oauth_cancelled` or `oauth_failed`                                                                                       | P2.S7 |
| Logout              | Action `signOut` → redirect home                                                                                                                                                                                                                                                                                                   | P2.S4 |
| Edit profile        | `/profile` → action `updateProfile` (name, language); a changed language is also written to `user_metadata.locale`, which the auth email templates read                                                                                                                                                                            | P2.S8 |
| Avatar              | The browser resizes to 256×256 WebP (`src/lib/images.ts`) and uploads to `avatars/{uid}/{uuid}.webp` with the browser client; action `updateAvatar(path)` checks the path and that the file exists, saves it and deletes the old file; `removeAvatar` clears it                                                                    | P2.S8 |
| Change password     | `/profile` (accounts with an `email` identity) → the same `resetPassword` action as P2.S6; no current password (Supabase lets any session change it, so asking would add no security)                                                                                                                                              | P2.S8 |

Messages from auth actions are generic where needed (for example, "forgot
password" always reports success, so emails cannot be enumerated).

### Hosted auth settings (Supabase dashboard)

| Setting                 | Current (verified 2026-09-24)                                                                                                         | Target                                                                      | Step         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------ |
| Email provider          | enabled                                                                                                                               | enabled                                                                     | —            |
| Confirm email           | on (`mailer_autoconfirm=false`)                                                                                                       | on                                                                          | —            |
| Google provider         | on (P2.S7, verified 2026-09-24)                                                                                                       | on                                                                          | P2.S7        |
| Anonymous sign-ins      | off                                                                                                                                   | off                                                                         | —            |
| Minimum password length | 6 (default)                                                                                                                           | 8                                                                           | P2.S4        |
| Site URL                | `http://localhost:3000` (P2.S9)                                                                                                       | only a fallback since the templates use `RedirectTo`; production URL in P11 | P2.S9        |
| Redirect URLs           | `http://localhost:3000/**`, `https://findly-web-nine.vercel.app/**` (P2.S10, user-confirmed)                                          | same                                                                        | P2.S10       |
| SMTP                    | custom, Brevo (P2.S9, verified by a real sign-up)                                                                                     | custom                                                                      | P2.S9        |
| Email templates         | `confirm-signup.html`, `reset-password.html`, linking to `{{ .RedirectTo }}` (re-pasted in P2.S10, verified by real emails on Vercel) | same                                                                        | P2.S5/S6/S10 |

---

## 11. RLS and security architecture

### Principles

- **Every table has RLS enabled** in the migration that creates it. Supabase gives
  `anon` and `authenticated` full table privileges by default (verified, see
  F-03), so a table without RLS would be writable by anyone.
- Column-level protection with `grant update (col, …)` where users may update only
  some columns (profiles: not `role`/`is_banned`; items: not `user_id`).
- Every insert/update policy includes `can_write()` so banned users cannot write.
- Admin access through `private.is_admin()` in policies. No service-role key in the app.
- RLS helper functions live in schema `private`, which the Data API does not expose; only functions meant to be called by the app are in `public`.
- `security definer` functions: `set search_path = ''`, check their inputs, and
  `revoke execute ... from public, anon` unless they are meant to be called.
- Server Actions validate all input with Zod; the database also has `check`
  constraints (lengths, ranges) as the last line of defense.
- Redirect targets (`next`) accept only relative paths.
- Rate limiting: Supabase Auth has built-in limits; for content, a trigger limits
  new items per user per day (P3.S1, e.g. 20/day), messages per minute and new
  conversations per day (P8.S1).

### Policy matrix

| Table           | select                                                                                                              | insert                                          | update                                                       | delete                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| categories ✓    | everyone                                                                                                            | admin (P10.S1)                                  | admin (P10.S1)                                               | admin, not in use (P10.S1) |
| profiles        | everyone, public columns only (`id, display_name, avatar_path, created_at`); own full row via `current_profile()` ✓ | trigger only                                    | own row, allowed columns; admin: `role`, `is_banned` via RPC | none (cascade from auth)   |
| items ✓         | `status in (active, resolved)` or own or admin                                                                      | own `user_id` and `can_write()`                 | own, not hidden, `can_write()`; admin any (hide/restore)     | own or admin               |
| item_images ✓   | if parent item visible                                                                                              | parent owned, not hidden, own folder, can_write | `position` only; parent owned, not hidden, `can_write()`     | parent owned or admin      |
| matches ✓       | owner of either item (not admins, not anon)                                                                         | definer functions only                          | owner of either item, only `status`, `can_write()`           | none (cascade from items)  |
| notifications ✓ | own                                                                                                                 | definer functions only                          | own, only `read_at`, `can_write()`                           | own                        |
| conversations ✓ | participant                                                                                                         | requester = self, not item owner, `can_write()` | none (trigger updates `last_message_at`)                     | none                       |
| messages ✓      | participant                                                                                                         | participant, `sender_id = self`, `can_write()`  | recipient, only `read_at`, `can_write()`                     | none                       |
| favorites ✓     | own (anon: select grant for `search_items`, no rows)                                                                | own, item visible and not hidden, `can_write()` | none                                                         | own                        |
| reports ✓       | own or admin                                                                                                        | self, `can_write()`, other user's visible item  | admin, only `status`                                         | none                       |

### Security verification per step

- Test each new policy with SQL tests that impersonate users (see §20).
- `npx supabase db advisors --linked` must report no errors.

---

## 12. Search and filter architecture

### Normalization (P4.S1)

`private.normalize_text(text) returns text immutable strict` (P4.S1,
`20260927223351_search.sql`; executable by `anon`/`authenticated` because
`search_items` runs as the caller):

1. `lower()`
2. Macedonian Cyrillic → Latin **without diacritics**: `replace()` for
   џ/ѕ→dz, љ→lj, њ→nj, then `translate()` for the rest (ч→c, ш→s, ж→z, ѓ→g,
   ќ→k, ц→c, ѐ→e, ѝ→i, …).
3. `private.immutable_unaccent()` (unaccent with the dictionary named, so it
   can be immutable): č→c, š→s, ž→z, ǵ→g, ḱ→k.
4. Latin digraphs folded the same way: dzh→dz, zh→z, ch→c, sh→s, gj→g, kj→k.
5. Every run of non-alphanumeric characters → one space; trimmed.

So "Паричник", "paričnik", "parichnik" and "PARICNIK" all become `paricnik`.
The same function normalizes the stored `search_text` and the user's query.
Some letters collide (ц and ч are both `c`), which only makes search slightly
more lenient. (Changed in P4.S1 from the originally planned ч→ch, ш→sh, …:
that mapping could not make "Паричник" equal "paricnik", which the step's
test requires and which is how most people type Macedonian in Latin.)

### `search_items` (P4.S2 ✓, `20260927224223_search_items.sql`; location P5.S5 ✓, `20260929145129_search_items_radius.sql`)

```
search_items(
  q text default null, item_type item_type default null, category_slugs text[] default null,
  item_status item_status default 'active', date_from date default null, date_to date default null,
  near_lat float8 default null, near_lng float8 default null, radius_km float8 default null,
  sort text default 'newest',   -- newest | relevance | nearest
  page_size int default 20, page int default 1
) returns table (id, type, status, title, occurred_on, location_name, created_at,
  category_id, category_slug, category_name_mk, category_name_en, category_icon,
  cover_path, distance_m float8, rank real, total_count bigint)
```

- `security invoker` (plpgsql, `stable`) → RLS applies; `hidden` items are also
  excluded explicitly, so owners and admins never get them in the feed.
  `item_status => null` = active and resolved (the parameter is `item_status`,
  not `status`, because the result has a `status` column).
- Text: `q` is normalized; blank after normalization = no text filter. Match:
  `search_vector @@ plainto_tsquery('simple', q)` (every word) OR
  `q <% search_text` (word similarity ≥ 0.4, set with
  `set pg_trgm.word_similarity_threshold = 0.4` on the function so the trigram
  index can be used). `plainto_tsquery` instead of `websearch_to_tsquery`:
  normalization removes the quotes and minus signs websearch syntax needs.
  `rank` = `ts_rank + word_similarity` (0 without `q`).
- Sort: `newest` = `created_at desc, id desc`; `relevance` = rank first (same as
  newest without `q`); `nearest` = distance first (same as newest without a
  center); anything else → SQLSTATE `22023` `invalid_sort`.
- Location (P5.S5): the center is `near_lat` + `near_lng` (both or neither, in
  range, else `22023` `invalid_center`). With a center every row has
  `distance_m` (`ST_Distance` on geography, meters on the WGS 84 spheroid;
  null without a center). `radius_km` (needs a center, `0 < r ≤ 50`, else
  `22023` `invalid_radius`) keeps items with
  `ST_DWithin(location, center, radius_km * 1000)`, which uses the GiST index
  `items_location_idx`. The old signature was dropped; the app calls the
  function by name, so calls without the new arguments behave as before.
- Pagination: `page_size` clamped to 1–50, `page` to ≥ 1; offset/limit with
  `count(*) over ()` as `total_count` on every row. A page past the end returns
  no rows (no total), so the feed must treat "0 rows on page > 1" as out of range.
- Generated types mark every result column as non-null and `item_status` as not
  nullable; `location_name` and `cover_path` can be null, and the query layer
  (P4.S4) must treat them so.

### URL contract (P4.S3)

`/items?q=&type=lost|found&category=keys,wallet&status=active|resolved|all&from=YYYY-MM-DD&to=YYYY-MM-DD&lat=41.9981&lng=21.4254&radius=1|2|5|10|25|50&sort=newest|relevance|nearest&page=2`
(location added in P5.S5)

Implemented in P4.S3 (`src/lib/validation/search.ts`): `parseSearchParams()`
turns `searchParams` into `SearchFilters`; `searchQuery()` turns filters back
into a query without default values (filter form, pagination, locale switcher
keep them). Rules:

- Every field falls back to its own default when missing or invalid (the rest
  are kept); nothing throws. A repeated parameter counts with its first value.
- `q`: whitespace collapsed, trimmed, at most 100 characters; `""` = none.
- `type`: `lost` | `found` | none. `status`: `active` (default) | `resolved` |
  `all` (→ `item_status => null`).
- `category`: comma list or repeated keys; lower-cased, duplicates removed,
  malformed slugs dropped, unknown slugs dropped when the page passes the
  existing slugs; at most 20.
- `from` / `to`: ISO calendar days; a reversed range is swapped.
- `lat` / `lng` (P5.S5): plain decimals in range, rounded to 4 decimals
  (~11 m; `CENTER_DECIMALS`), as `near: { lat, lng }`; one missing or invalid
  → no center. `radius`: one of `SEARCH_RADII` (km), kept only with a center.
- `sort`: only the available ones (`availableSorts()`: newest always,
  relevance with a query, nearest with a center); default (`defaultSort()`)
  nearest with a center, else relevance with a query, else newest. An
  unavailable or invalid sort becomes the default, which is never written.
- `page`: integer 1–1000, default 1.
- Canonical URLs: `/items` is the default feed; defaults are never written. The
  feed page redirects any other URL for the same filters to the canonical one
  (P4.S4).

---

## 13. Map and location architecture

- Libraries: `leaflet`, `react-leaflet`; optional `react-leaflet-cluster` for
  `/map`. Map components are Client Components loaded with
  `next/dynamic(..., { ssr: false })` because Leaflet needs `window` (P5.S1 ✓).
  Every module importing `leaflet`/`react-leaflet` (even just `Marker`) is
  browser-only: it imports `base-map` directly and is exported from
  `src/components/map/index.tsx` through `dynamic(..., { ssr: false, loading:
MapLoading })`. Pages render it inside `MapFrame` (labelled region, size via
  `className`, `isolate` so Leaflet's z-indexes stay under the header). Shared
  constants live in `@/lib/map` (no Leaflet import). Scroll-wheel zoom is off
  by default so maps do not catch page scrolling. The marker icon is
  `markerIcon` from `src/components/map/marker-icon.ts` (bundled Leaflet images;
  also set as every marker's default); maps pass it explicitly as `icon` (F-25).
  `MapFrame` catches map failures (`MapErrorBoundary`) and shows a message, so a
  page with a map still renders if Leaflet fails (P5.S4 ✓). Item pages link to
  the point on openstreetmap.org (`osmUrl()`).
- Tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with the required
  "© OpenStreetMap contributors" attribution. Default center: Skopje
  (41.9981, 21.4254), zoom 13; Macedonia bounds for "fit".
- **Location picker (P5.S2):** click or drag a marker; "use my location"
  (browser geolocation); address search via Nominatim
  `/search?format=jsonv2&countrycodes=mk&accept-language=<locale>` (debounced
  500 ms, minimum 3 chars); reverse geocoding fills `location_name`. Nominatim
  policy: ≤ 1 request/second, attribution, no bulk use. Implemented (P5.S2 ✓):
  `@/lib/geocoding` (one throttle for all requests, 1.1 s between starts; cache;
  short labels from `addressdetails`) and `LocationPicker`, which posts `lat`,
  `lng` (hidden) and an editable `locationName`.
- Storage: forms send `lat`/`lng`; actions validate ranges and store
  `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` (`private.item_point`
  in `create_item`/`update_item`, P5.S3 ✓). Reads select the stored generated
  columns `items.lat`/`items.lng` (`ST_Y/ST_X`); RPCs return them as well.
- **Radius filter (P5.S5 ✓):** `NearFilter` in the feed's filter form: center
  from "Near me" (approximate geolocation) or a click on a small map
  (`LocationPickerMap` with a `radius` circle, mounted only when opened because
  Leaflet cannot size a map in the collapsed phone panel), posted as `lat`/`lng`;
  radius select 1/2/5/10/25/50 km or any distance (5 km preselected for a first
  center; disabled, so not posted, without one). Cards show the distance
  (`distanceDisplay()` in `@/lib/map`). Distance searches are `noindex`. Without
  JavaScript the radius works only on URLs that already have a center.
- Leaflet 1.9 fix (F-27): `leaflet-fixes.ts` (imported by `base-map`) skips the
  zoom-animation timer of a map removed while zooming.
- **`/map` page (P5.S6 ✓):** `items_in_bounds(min_lat, min_lng, max_lat,
max_lng, item_type, max_rows)` (`20260929170935_items_in_bounds.sql`,
  `security invoker`): active items only, inside a plain lng/lat rectangle
  (planar GiST index `items_location_geom_idx` on `location::geometry`; edges
  included), newest first, at most 300 rows (`max_rows` clamped 1–300) with
  `total_count`; null, out-of-range or reversed bounds → `22023`
  `invalid_bounds`. The page (`/map?type=lost|found`, canonical redirect, in the
  sitemap and the header) renders `MapExplorer`, which loads the visible area
  in the browser 400 ms after the map stops moving (`fetchMapItems()` in
  `@/lib/map-items`, aborting the previous request), keeps the old markers while
  loading, and shows the count, "only the newest 300 of N, zoom in", or a
  failure with retry. `ItemsMap` (browser-only) fits North Macedonia first and
  draws one round marker per point (`itemMarkerIcon()`: type color, primary
  for mixed, count when several items share the point; `groupByPoint()`), with
  a popup listing the items (cover or category icon, type, title link,
  category, date, place). A view across the antimeridian asks for every
  longitude (`clampBounds()`). Changing the type keeps the map mounted and its
  view. Scroll-wheel zoom is on here (the map is the page).
- Privacy note: the exact point chosen by the user is stored and shown. Users are
  told in the form to pick an approximate public place for found items.

---

## 14. Matching system architecture

### When matching runs (P6.S3)

- `after insert` on `items`, and `after update of type, category_id, occurred_on,
location, title, description, status` → `compute_matches(new.id)`.
- If the item becomes `resolved`/`hidden`, its `suggested` matches are left as
  they are but are no longer shown (the UI filters by both items being active).
- `compute_matches` is `security definer` (it must read other users' items and
  write match rows for both owners), deletes and recomputes that item's
  `suggested` matches, and keeps `dismissed`/`confirmed` rows.

Implemented in P6.S3 (`20260930203111_compute_matches.sql`):
`private.compute_matches(item_id)` (internal, not executable by API roles) and the
trigger function `private.items_compute_matches()` (also `security definer`, because
the trigger fires as the user who changed the item). Details:

- Candidates are prefiltered with indexes (opposite type, active, other owner, same
  or `other` category, ±90 days, `st_dwithin` 50 km); `match_score()` applies the
  exact rules and scores them.
- Pairs that already have a `dismissed`/`confirmed` row are skipped and do not take
  one of the 10 places.
- **Upsert instead of delete + insert:** new pairs are inserted, existing
  `suggested` rows get the new score/breakdown only when it changed, and the item's
  other `suggested` rows are deleted. A match keeps its id and `created_at` while it
  stays suggested, so P7 can notify on new rows only.
- A resolved/hidden item is not computed (its matches stay). When the other item of
  such a pair is recomputed, the pair is no longer a candidate and its `suggested`
  row is deleted; reopening the item matches it again.
- The top-10 cap applies to the item being computed; the other item of a pair can
  collect more rows from other items' runs until it is recomputed itself (the UI
  limits what it shows).
- The update trigger has a `when` clause comparing `type, category_id, occurred_on,
lat, lng, title, description, status`, so saving unchanged values does nothing.
- Backfill in the migration (active items, oldest first): 0 matches on the dev
  project (only lost items exist).

### Candidate filter (hard rules)

- Opposite `type`, both `status = active`, different `user_id`.
- Same category, **or** either item in category `other`.
- Date: `found.occurred_on >= lost.occurred_on - 2 days` (something cannot be found
  long before it was lost) and difference ≤ 90 days.
- Distance ≤ 50 km (every item has a location since P5.S3).

### Score (weights version `v2` since P6.S6)

| Component | Weight v2 (v1) | Formula (0–1)                                                                                |
| --------- | -------------- | -------------------------------------------------------------------------------------------- |
| Category  | 0.15 (0.30)    | 1 if same category, 0.5 if one is `other`                                                    |
| Distance  | 0.15 (0.25)    | `exp(-d_km / 5)` (every item has a location)                                                 |
| Date      | 0.15 (0.20)    | `exp(-days_between / 14)`                                                                    |
| Text      | 0.55 (0.25)    | `greatest(similarity(search_text_a, search_text_b), token overlap ratio)` on normalized text |

`score = Σ weight × component`. Stored when `score ≥ 0.60` (v1: 0.55); at most the
top 10 matches per item are kept.

Implemented in P6.S2 (`20260930182118_match_scoring.sql`):
`private.match_score(lost items, found items) returns table (score, breakdown)`
(`stable`, internal: no API role can execute it). It applies the candidate rules
above and returns **no row** for a pair that breaks one, so `compute_matches` can use
it in a lateral join; a first argument that is not `lost` or a second that is not
`found` raises `match_score_types` (`22023`). Details fixed while implementing:

- Category: 0.5 whenever `other` is involved, also when both items are `other`
  (two "other" reports are not really the same kind of thing).
- Date: `days_between` is the absolute difference and the component is
  `exp(-days_between / 14)` (with `max(0, found − lost)` a find reported two days
  before the loss would score a perfect 1).
- Text works on `private.match_words(title, description)`: normalized
  (`normalize_text`, so Cyrillic and Latin spellings meet), distinct, sorted, ≥ 3
  characters, without common Macedonian/English words and the words for
  lost/found. The place name is left out (the distance already counts it). Text =
  `greatest(similarity(words_a, words_b), shared / size of the smaller word set)`.
- Score rounded to 3 decimals; breakdown components to 3 decimals, `distance_km`
  to 1, `shared_words` at most 10, alphabetical.

Fixture results with v1 (`supabase/tests/matching.sql`, same keys described in
Cyrillic and Latin, 1 day and ~1 km apart unless noted): clear match 0.905; 2 days
before the loss 0.892; ~5 km 0.792; category `other` 0.755; 90 days 0.719; different
keys at the same place and day 0.711; ~20 km 0.705; another category, 3 days before
the loss, 91 days, ~60 km, same owner and a resolved item give no row. Weights v1
give 0.69 for category + distance + date alone, so unrelated items of the same
category found nearby on the same day pass the 0.55 threshold (F-29).

With v2 (P6.S6): clear match 0.884; 2 days before 0.874; ~5 km 0.816; `other`
0.809; ~20 km 0.764; 90 days 0.744; different keys at the same place and day
**0.458** (below 0.60, so not stored).

### Tuning on the demo dataset (P6.S6)

**Dataset** (`supabase/seed/demo.sql`): 44 realistic reports by 14 demo users in
Skopje, Bitola, Ohrid/Struga, Kumanovo and Tetovo (more than 50 km from the real
reports), dates relative to today. 14 true pairs, written the way people write:
Cyrillic vs Latin, different words for the same thing ("паричник" / "paricnik",
"Фолксваген" / "VW Volkswagen"), a finder who chose `other` for a backpack, a ring
found 28 days later, a laptop found ~27 km away in Kumanovo, a cat found ~3 km away.
Distractors are the hard case: same category, a few hundred metres to a few km away,
same days (other wallets, phones and headphones, flat keys, a cat and a large dog,
a student card and an ID card, a scarf, a handbag, a watch and glasses in Bitola
that are each other's distractors), plus lost reports without a true pair (umbrella
in `other`, parrot, a brown wallet in Kumanovo). 67 candidate pairs pass the hard
rules.

**Method:** the dataset and `supabase/seed/demo-evaluation.sql` run in a rolled-back
transaction (score, components and rank from both sides of every candidate pair).
Weights (steps of 0.05, each ≥ 0.10) and thresholds were compared on the stored
components. Criterion: every true pair stored and in the top 3 from both sides;
then the widest gap between the weakest true pair and the strongest false pair.

| Weights (cat / dist / date / text), threshold | True pairs stored | True pairs ranked 1st (both sides) | False positives stored | Weakest true | Strongest false |
| --------------------------------------------- | ----------------- | ---------------------------------- | ---------------------- | ------------ | --------------- |
| v1: 0.30 / 0.25 / 0.20 / 0.25, 0.55           | 14 / 14           | 14                                 | 26                     | 0.660        | 0.772           |
| v2: 0.15 / 0.15 / 0.15 / 0.55, 0.60           | 14 / 14           | 14                                 | 0                      | 0.651        | 0.524           |

Text is what separates the pairs: true pairs have a text score of 0.42–0.88,
false ones at most 0.22 (one plausible exception at 0.43, below). v2 is not the
single best set on this data: 0.10 / 0.15 / 0.10 / 0.65 gives a slightly wider gap
(0.148 vs 0.126) but leaves category and date almost without effect, so the
balanced round weights were chosen to avoid fitting 14 pairs too closely.

**False positives:** none stored with v2 (26 with v1: every distractor above).
Closest non-matches with v2 (0.52): the red wallet near the black one, flat keys
2 km from the car keys, Sony headphones next to the lost iPhone, and the brown
wallet lost in Kumanovo vs a brown wallet found in Skopje 26 km away (0.517; a
reasonable suggestion that just misses the threshold).

**Limitations:** a pair now needs a text score of about 0.27 even when category,
place and date are perfect, so two reports that describe the same item with
entirely different words (synonyms, only a brand vs only a type) are missed; the
weakest true pairs are the iPhone described as "мобилен телефон" (0.675, text 0.42)
and the laptop found 27 km away (0.651). The set is small and written by the
developer; the weights should be revisited with real reports. The UI strength
labels (strong ≥ 0.8, good ≥ 0.7, possible below) fit v2: 5 true pairs are strong,
7 good, 2 possible.

`supabase/tests/matching_demo.sql` loads the dataset (via `-- @include`) and
asserts the result: all 14 true pairs stored and in the top 3 from both sides, no
other demo pair stored (it fails on v1 with the 26 false positives).

### Breakdown (stored in `matches.breakdown`)

```json
{
  "version": "v1",
  "category": 1,
  "distance": 0.82,
  "date": 0.93,
  "text": 0.41,
  "distance_km": 1.0,
  "days_between": 1,
  "shared_words": ["crn", "paricnik", "koza"]
}
```

The UI translates this into an explanation, for example: _"Same category ·
1.0 km apart · 1 day apart · Common words: crn, paricnik, koza"_.

Implemented in P6.S4 (`@/lib/matches`, `MatchExplanation`): one chip per reason —
same category / category "Other" (may be related), distance (`distanceDisplay`),
same day / _n_ days apart, up to 5 shared words (+ "and _n_ more"), or without
shared words "Similar descriptions" (text ≥ 0.3) / "little in common". The score is
shown as a word and a percentage: strong ≥ 0.8, good ≥ 0.7, otherwise possible.

### User actions (P6.S4, planned as P6.S5)

- Owners of either item see its matches on the item page (owner only) and the
  dashboard; guests and other users never get the section.
- **Dismiss** (either owner) → `dismissed`, hidden for both; the toast offers
  **Undo**, and the item page lists dismissed matches behind a disclosure with
  **Restore** (→ `suggested`, allowed by the column grant).
- **Confirm** (either owner) → `confirmed`; the card shows a hint to mark the
  report resolved once the item is back, and **Undo** (→ `suggested`). A
  "Contact" call to action arrives with messaging (P8.S2).
- Visibility (`toMatchViews`): suggested/dismissed only while both items are
  active; confirmed while neither is hidden (so it stays after resolving). At most
  10 suggested per own report are shown (the cap from P6.S3). Only place names are
  shown, never coordinates (the distance comes from the breakdown).

### Testing

The scoring function is tested with SQL assertion tests (§20) using fixed
fixtures: a clear match, a category mismatch, a date contradiction, distance
decay, Cyrillic vs Latin text.

---

## 15. Notifications architecture

- **Creation:** only by `security definer` triggers:
  - `matches` insert → notification for both item owners (`type = match`) (P7.S2 ✓,
    `20261001120733_match_notifications.sql`): trigger `matches_notify` (after insert,
    `private.matches_notify()`). `data = { match_id, item_id, other_item_id }`, where
    `item_id` is the recipient's own report. One notification per distinct owner (the
    matching functions never pair one owner's items; if a row did, the owner gets one,
    about the lost report). Only really new rows notify: `compute_matches` rescoring
    goes through `on conflict do update`, which fires no insert trigger; status changes
    are updates. A suggested pair that drops out and is later recreated (new match id) is
    not new to its owners: the unique index `notifications_match_pair_key` keeps one
    notification per recipient and pair, and the recreated pair only moves it to the
    new `match_id` (read state and time kept, no insert, so no Realtime alert). If the
    user has deleted that notification, a recreated pair notifies again. Runs in the
    inserting transaction (a rolled-back match leaves nothing). Banned owners are
    notified too (they may read). No backfill: the match that existed on the dev
    project before P7.S2 has no notification.
  - Item deleted (owner, admin, or with the account) → its matches cascade, and
    trigger `items_delete_match_notifications` (`private.…`, after delete on `items`)
    removes the match notifications about it (other owners' `other_item_id`, the
    owner's own `item_id`). Notifications whose match was only dropped (another
    category, resolved, top-10 cut) or whose other report is hidden/resolved stay: the
    UI (P7.S4) must show them without a working match link (RLS hides what the viewer
    may not see).
  - `messages` insert → recipient (`type = message`), at most one unread message
    notification per conversation (P8.S6 ✓, `20261002170959_message_notifications.sql`):
    trigger `messages_notify` (after insert, `private.messages_notify()`) notifies the
    other participant with `data = { conversation_id, item_id, sender_id }` (`item_id`
    left out once the item is deleted). The unique index
    `notifications_message_conversation_key` keeps one message notification per
    recipient and conversation: while it is unread, more messages change nothing (no
    alert per message); once read, the next message deletes it and inserts a new
    unread one (an insert, so the bell's Realtime INSERT shows a toast). If the
    recipient marks it read at the same moment, the insert's `on conflict … do update`
    waits and makes it unread again, so a new message never leaves only a read
    notification. Reading: trigger `messages_read_notifications` (after update on
    `messages`, statement level with a transition table) marks the recipient's
    message notification of each conversation read once no message from the other
    participant is unread there (`mark_conversation_read()` and direct `read_at`
    updates alike); marking a message unread again leaves it read. Marking the
    notification read does not mark the messages read. Trigger
    `conversations_delete_notifications` removes the message notifications of a
    conversation that goes with an account. Banned recipients are notified (their
    reading marks nothing, P8.S1). No backfill for messages sent before P8.S6.
  - Moderation action on an item → owner (`type = moderation`): trigger
    `items_notify_moderation` (P10.S1), `data = { item_id, action }`. UI (P10.S4 ✓):
    `parseNotificationData` reads `action` (`moderationAction`, unknown → null); the
    entry's title says "A moderator hid your report" / "Your report is visible again"
    (generic title for an unknown action), shows the report and links to it (owners
    see their hidden reports).
  - UI (P8.S6 ✓): `parseNotificationData` also reads `conversation_id`/`sender_id`;
    `fetchNotifications`/`fetchNotificationPage` load the senders' public profile
    columns (`id, display_name`); a message entry shows "Нова порака", "Од {name}"
    and the report ("Пријава: …", left out when gone or hidden) and links to
    `/messages/<conversation_id>` (`notificationHref`, also without the report). The
    bell shows no toast for a message notification about the chat open in a visible
    tab (`isConversationPath(location.pathname, id)`; the chat marks it read at once)
    and reloads on `MESSAGES_READ_EVENT` without waiting for Realtime.
- **Content:** `data` holds only IDs; the UI loads the titles and renders text in
  the viewer's language.
- **Delivery:** `notifications` in the `supabase_realtime` publication. The
  header bell (Client Component) gets the initial unread count from the server
  and subscribes to `INSERT` events filtered by `user_id=eq.<uid>`. A toast is
  shown for new notifications.
  - Implemented in P7.S3 ✓: `NotificationBell` (`src/components/notifications/`,
    rendered by `SiteHeader` for signed-in users with `key = user id`) with
    `useNotifications` and `NotificationEntry`. Badge: hidden at 0, `99+` above 99
    (`badgeCount`); the trigger's label says the count. The popover lists the 20
    newest (`NOTIFICATIONS_PANEL_LIMIT`), loaded on first open with the browser
    client (`fetchNotifications` in `@/lib/notifications`: notifications, then the
    reports `id, type, status, title` and matches `id, status` they refer to, all
    through RLS). A report or match that is gone or hidden from the viewer is
    `null` and described ("no longer available"); the entry links to the own report
    (`/items/<id>#matches-item`) only while it exists. Text is rendered from the
    type in the viewer's language (`Notifications` messages); times use our own
    messages (`elapsedSince`, F-30). Per entry: mark read/unread and delete through
    `setNotificationRead`/`deleteNotification` (`src/actions/notifications.ts`,
    optimistic, then reloaded; a failure shows the error and the reload undoes it);
    following the link closes the panel and marks it read.
  - Realtime: one channel per mounted bell with its own topic
    (`notifications:<uid>:<random>`; `supabase.channel()` would reuse a channel of
    the same topic), `INSERT` and `UPDATE` filtered by `user_id=eq.<uid>` and checked
    again in the handler. Events, `SUBSCRIBED` (first and after a reconnect),
    returning to the tab and `online` are batched (300 ms) into one reload of the
    count (and the list once opened) and one toast for the inserts ("N new
    notifications", with "Show"). Errors or a closed channel show "reconnecting" in
    the panel; Realtime rejoins by itself. Deletes are not subscribed (Realtime
    cannot filter or authorize them); rows deleted elsewhere disappear on the next
    reload. Every query also filters by the expected user id, and each reload first
    checks that the browser session still belongs to that user; if not (signed out
    or another account in another tab), or on `SIGNED_OUT`, the bell clears its
    data, removes its channel and refreshes the page. Unmounting (sign out renders
    no bell; another account gets a new key) removes the channel and the auth
    listener. Local changes bump a version, so a reload that started earlier
    cannot overwrite them.
- **Reading:** `/notifications` lists them (paginated); actions `markRead(id)`,
  `markAllRead()` (update `read_at` — column-level grant).
  - Implemented in P7.S4 ✓: `(app)/notifications/page.tsx` (Server Component,
    `requireUser`), 20 per page newest first (`getNotificationPage` →
    `fetchNotificationPage`: one page with `count: "exact"`; a page past the end is a
    PostgREST 416 `PGRST103`, answered with an empty page and the total). URL: page 1
    without parameter, `?page=n` after; any other query (unknown parameters,
    `page=1`, invalid or repeated values) redirects to the canonical URL, a page past
    the last one to the last page (307, no fallback). A failed query shows a message.
    `NotificationList` (client) renders the page with `NotificationEntry`, the summary
    ("N notifications · M unread") and "Mark all as read"
    (`markAllNotificationsRead`: the user's unread rows, returns the count for the
    toast). Changes are optimistic (`useOptimistic`); every notification action calls
    `refresh()` (`next/cache`), so its response carries the re-rendered page and the
    optimistic state hands over without a flash; a failed action just ends it and
    shows the error. Following an unread entry's link marks it read. Empty state with
    a link to "My reports". The bell has a "See all notifications" link.
  - Bell ↔ page without a second subscription: window events from
    `@/lib/notifications`. The bell dispatches `NOTIFICATIONS_RECEIVED_EVENT` for
    Realtime inserts (the page calls `router.refresh()`); the page dispatches
    `NOTIFICATIONS_CHANGED_EVENT` after its actions (the bell reloads its count and
    list; deletes have no Realtime event).
- **Optional email (P7.S5):** Supabase Database Webhook on `matches` insert →
  `/api/webhooks/match-email` (shared secret) → email through the SMTP provider's
  API. Only if time allows; not required for the core.

---

## 16. Messaging architecture

- One conversation per (item, requester). "Contact" on an item page calls
  `startConversation(itemId)` which returns the existing conversation or creates
  one (unique constraint + `on conflict do nothing` + select).
  - Implemented in P8.S2 ✓: `startConversation(formData)` (`src/actions/messages.ts`,
    Zod `startConversationSchema` from `@/lib/validation/conversations`) ends in a
    redirect to `/messages/[id]` and otherwise returns an error code. Order: validate
    `itemId` → `requireUser("/items/<id>")` → load the item under RLS (missing or
    someone else's hidden item → `not_found`) → own item → `conversation_own_item` →
    the user's existing conversation about it → open it (also when the item is
    resolved/hidden since, or the user is banned: they can still read) → banned →
    `forbidden` → not active → `conversation_item_inactive` → insert
    `{ item_id, owner_id: item.user_id }` (the owner always comes from the item, the
    requester from the session/default). Insert errors: `23505` (another tab started
    it) → open the existing one, `FL429` → `conversation_limit`, `42501` (RLS, e.g.
    resolved or banned in the meantime) → `forbidden`, anything else → `database`
    (logged, never shown). The database stays authoritative (RLS, check, limit
    trigger); the action's checks only give clear messages.
  - Item page: a contact card under the author for other users (`ContactButton`,
    `src/components/chat/contact-button.tsx`, `useActionState` + `SubmitButton` +
    `FormError`): "Контактирај/Contact" for an active report; "Отвори разговор/Open
    conversation" (link) when the viewer already has a conversation about it
    (`getOwnConversationId`, `@/lib/queries/conversations`; also for resolved
    reports); guests get a link to `/login?next=/items/<id>`. Owners never see it;
    resolved reports without a conversation show none. Title and hint depend on the
    report type ("Is this yours?" / "Have you found this item?").
  - `/messages/[id]` (P8.S2, minimal): `requireUser`, `getConversation(id, userId)`
    (invalid uuid or not a participant → 404), shows the other participant and the
    report (link, or "no longer available" when deleted or hidden) and a note that
    messages come next. P8.S4 replaced the note with the chat.
- Conversation list (`/messages`): RPC `my_conversations()` returns the other
  participant, item title/cover, last message, unread count, ordered by
  `last_message_at`.
  - Implemented in P8.S3 ✓: `(app)/messages/page.tsx` (`requireUser("/messages")`)
    loads `getMyConversations(userId)` (`@/lib/queries/conversations`), which maps
    the RPC rows with `toConversationSummaries` (`@/lib/conversations`, client-safe:
    item null when deleted or hidden from the viewer, last message null before the
    first one, `fromMe`, one-line `messagePreview`, `activityAt` = last message or
    start). `ConversationList` (`src/components/chat/conversation-list.tsx`, no
    client state) renders one row per conversation in the RPC's order: avatar and
    name (the row is a stretched link to `/messages/[id]`), relative time worded with
    messages (`elapsedSince`, no `Intl`, F-30; since 2026-10-03 the client component
    `ConversationTime`: server-rendered with the server's time so hydration matches,
    then one shared one-minute clock in the browser — the Server Component's
    `useNow({ updateInterval })` was ignored and logged a warning), the report (type badge and title, "Your
    report" when the viewer owns it, or "not available"), the last message ("You: …"
    for one's own, "No messages yet"), and unread rows highlighted with a count badge
    (`badgeCount`, 99+, screen-reader text). The page shows "N conversations · M with
    unread messages", an empty state with a link to `/items`, and an error message
    when the query fails. No paging (a user starts at most 20 conversations a day).
    The header has a messages icon link next to the bell for signed-in users; its
    unread badge and live updates come in P8.S5.
- Chat (`/messages/[id]`): server loads the last 50 messages; a Client Component
  subscribes to `INSERT` on `messages` filtered by `conversation_id`, appends new
  messages, and loads older ones on scroll.
- Sending: Server Action `sendMessage(conversationId, body)` (Zod: 1–2000 chars)
  → insert under RLS. A trigger updates `conversations.last_message_at`.
  - Implemented in P8.S4 ✓: the page (`requireUser`, `getConversation`, then
    `getLatestMessages` from `@/lib/queries/conversations`) shows a compact header
    (back link to `/messages`, other participant, report link or "no longer
    available") and `ChatView` (`src/components/chat/chat-view.tsx`). Client-safe
    helpers in `@/lib/chat`: `fetchMessagesBefore` (newest page of 50, or the page
    before the oldest loaded `created_at`; fetches 51 to know `hasMore`),
    `fetchMessagesAfter` (catch-up, ≤ 200), `mergeMessages` (each id once, oldest
    first), `realtimeMessage` (checks the payload and its conversation; a time
    without an offset is read as UTC). `ChatView`: one channel per mount with a
    unique topic, `INSERT` filtered by `conversation_id`; after every `SUBSCRIBED`
    and when the tab becomes visible it fetches messages newer than the newest
    loaded (or the newest page when empty); "reconnecting" note while the channel is
    down; older pages when the top comes into view (`IntersectionObserver`, plus a
    button, retry on error) with the scroll position kept; follows new messages when
    the viewer is at the bottom or sent them, otherwise a "N new messages" button;
    day separators (Today/Yesterday/date) and `HH:MM` times in Europe/Skopje
    (`clockTime`, `previousDay` in `@/lib/dates`; no Macedonian `Intl`, F-30);
    banned users get a read-only note instead of the composer. `MessageBubble`: own
    messages right in the primary color, `whitespace-pre-wrap` +
    `overflow-wrap:anywhere`, sender for screen readers. `MessageComposer`:
    controlled textarea (`maxLength` 2000, counter from 1800), Enter sends,
    Shift+Enter adds a line (not during IME composition), the text stays read-only
    until stored and is kept on failure; the sent message is handed to the chat and
    its Realtime echo merged by id. `sendMessage(formData)` (`src/actions/messages.ts`,
    `sendMessageSchema`): line breaks normalized to `\n` (form data sends `\r\n`),
    trimmed, 1–2000; banned → `forbidden`; insert errors `FL429` →
    `message_rate_limit`, `42501` → `forbidden`, `23503` → `not_found`, others →
    `database` (logged); returns the stored message. Read state stays for P8.S5.
- Read state: opening a conversation calls RPC `mark_conversation_read(id)` which
  sets `read_at` on messages from the other participant. Header shows the total
  unread count.
  - Implemented in P8.S5 ✓: `ChatView` marks the other participant's unread
    messages read through the Server Action `markConversationRead(formData)`
    (`src/actions/messages.ts`; validates the id, `requireUser`, the RPC, returns the
    count; errors → `database`, logged; no `refresh()`, which would re-render the
    open chat) — on opening, for messages that arrive while open, and when the tab
    becomes visible again; only while `document.visibilityState` is `visible`;
    several arrivals within 300 ms are one request; messages that arrive during a
    request get another one; a failure leaves them unread (no retry loop). Loaded
    messages carry `readAt` (`messageColumns` includes `read_at`; `unreadFrom()` in
    `@/lib/chat`). After a successful mark the chat dispatches `MESSAGES_READ_EVENT`.
    Header: `MessagesLink` (`src/components/chat/messages-link.tsx`, key = user id)
    with a badge like the bell's (0 hidden, 99+, label "Пораки, N непрочитани" via
    `Header.messagesLabel`), first count from `getUnreadMessageCount`
    (`@/lib/queries/conversations`; null on error = no badge) and `useUnreadMessages`
    (`src/components/chat/use-unread-messages.ts`): the only subscription to all of
    the user's messages — one channel per mount with a unique topic, `INSERT` (RLS
    limits it to the user's conversations) and `UPDATE` filtered by
    `sender_id=neq.<user>` (others' messages read, e.g. in another tab); events,
    `MESSAGES_READ_EVENT`, focus and `online` are batched into one reload of
    `fetchUnreadMessageCount` (`@/lib/chat`: head count of others' messages with
    `read_at` null under RLS — the same rule as `my_conversations()`, so it equals the
    sum of the list's counts); session check and sign-out handling like the bell;
    Realtime events are passed on as `MESSAGES_CHANGED_EVENT`, which
    `RefreshOnMessages` on `/messages` answers with `router.refresh()` (live list
    without a second channel). The browser's Back/Forward buttons restore `/messages`
    from the router cache without a request; `RefreshOnMessages` keeps, per
    `router.bfcacheId`, the messages version (`currentMessagesVersion()` in
    `@/lib/chat`, bumped by `useUnreadMessages` on Realtime events and by `ChatView`
    after a read or a send) the list showed, and refreshes a restored list once when it
    is older (F-33 fix). Fresh visits and restores without changes make no extra
    request. Banned users cannot write, so reading does not mark
    anything for them (`mark_conversation_read()` returns 0, P8.S1); their badge
    stays until they are unbanned.
- Anti-abuse: messages per user per minute limited by trigger; reporting a user
  is part of moderation (P10).
- Schema implemented in P8.S1 ✓ (details in §9 `conversations`/`messages`): a
  conversation can only be started about an `active` item; the owner lists it once
  the first message arrives; at most 30 messages per minute (`FL429`
  `message_rate_limit`); `mark_conversation_read()` returns the number of messages
  it marked (0 for banned users); at most 20 new conversations per user in 24 hours
  (`FL429` `daily_conversation_limit`, exact under concurrency, re-opening exempt).
- Deleting a conversation from one's own list (2026-10-07, branch
  `feature/hide-conversation`; outside the step plan): nothing is deleted globally.
  `hidden_conversations (user_id, conversation_id, hidden_at)` (RLS: users select only
  their own rows; no write grants) is written only by `rpc("hide_conversation")`
  (security definer; participants only — others get `P0002` `not_found`, guests and
  banned users `42501`). It marks the user's unread messages in the conversation read,
  removes their message notification about it and sets `hidden_at` (clock time; again
  on a repeated hide). `my_conversations()` leaves the conversation out until
  `last_message_at > hidden_at` (a new message from either side brings it back with
  normal unread counts and a new notification) or it has an unread message. The chat
  itself stays readable. UI: `DeleteConversationButton` (`src/components/chat/`,
  confirmation `AlertDialog`) on each `/messages` row → `hideConversation`
  (`src/actions/messages.ts`, `refresh()`); the row hides at once through an optimistic
  `[data-removed]` marker (`has-[[data-removed]]:hidden`), then the button calls
  `noteMessagesChanged()` and dispatches `MESSAGES_READ_EVENT`. Migrations
  `20261006215253_hide_conversations.sql` and `20261006215523_hide_conversation_fix.sql`
  (ambiguous `on conflict` target); SQL tests `supabase/tests/hide_conversations.sql`.

---

## 17. Favorites architecture

- Table `favorites (user_id, item_id)`; RLS: own rows only.
- Toggle button (Client Component, optimistic via `useOptimistic`) on item cards
  and item pages → Server Actions `addFavorite` / `removeFavorite` (P9.S2 ✓:
  `FavoriteButton` in `src/components/favorites/`; heart over the photo on feed and
  home cards, button with text on the item page for other users' reports that are
  not hidden; not on the dashboard). Both actions are idempotent (saving twice and
  removing an unsaved report succeed), call `refresh()` so the stored state takes
  over from the optimistic one, and map the insert policy's `42501` to
  `favorite_unavailable` (hidden, deleted or invisible report, or a banned user).
- For guests the button links to `/login?next=/items/<id>` (the report, also from
  feed cards).
- `/favorites` lists favorite items that are still visible; hidden/deleted items
  disappear through RLS/cascade.
- Feed queries return an `is_favorite` flag for the current user (P9.S1 ✓:
  `search_items` returns `is_favorite`, an `exists` on `favorites` with
  `auth.uid()`; always false for visitors). `search_items` is `security invoker`,
  so `anon` has `select` on `favorites` (no policy for `anon`, so no rows).
- Adding requires `can_write()` and an item the user can see that is not hidden
  (also not an own hidden item); removing does not require `can_write()`. A
  favorite stays when its item is hidden later: the favorites page must show only
  visible items (P9.S3). Admins have no access to other users' favorites.
- `/favorites` (P9.S3 ✓): `getFavoritePage(userId, page)` (`@/lib/queries/favorites`)
  reads `favorites` with an inner join `item:items!inner (card columns)` and
  `item.status in (active, resolved)` (RLS still returns a user's own hidden
  reports, so the status filter is what keeps hidden reports out; the inner join
  also keeps them out of the count), most recently saved first, 20 per page
  (`PGRST103` → count only, the page redirects to the last page). No migration.
  Cards use `ItemCard favorite={{ signedIn: true }}`; the heart removes a report and
  the action's `refresh()` re-renders the page without it. Link in the user menu.

---

## 18. Admin and moderation architecture

- **Role:** `profiles.role = 'admin'`. The first admin is set manually with SQL
  (`update profiles set role = 'admin' where id = '<uuid>'`).
- **Guard:** `/admin` layout calls `requireAdmin()`; the proxy also requires a
  session; RLS uses `is_admin()`.
- **Reports:** any signed-in user can report an item (reason + optional details).
  The admin queue lists open reports grouped by item.
- **Moderation actions:** hide/restore item (`status hidden` ↔ previous status),
  resolve/dismiss report, ban/unban user (`is_banned`, via RPC
  `admin_set_banned(user_id, banned)`), manage categories.
- **Effects:** banned users can sign in and read, but `can_write()` blocks all
  writes; the UI shows a banner. Hiding an item notifies its owner.
- **Dashboard stats:** counts of users, active lost/found items, matches,
  confirmed matches, open reports (one RPC `admin_stats()`).
- **Implemented in P10.S1** (`20261004150645_moderation.sql`): `reports` (§9) with
  RLS; admin insert/update/delete policies on `categories` (deleting a category in
  use fails with `23503`, `items.category_id` is `on delete restrict`);
  `admin_set_banned(target_user_id, banned)` (admins cannot ban themselves or
  other admins: `42501`; unknown user `P0002`; returns the new value);
  `admin_stats()` returns `users, banned_users, active_lost_items,
active_found_items, hidden_items, matches` (not dismissed), `confirmed_matches,
open_reports, reported_items`. Both are `security definer` and raise `42501`
  for non-admins (admins cannot read matches through RLS). Trigger
  `items_notify_moderation`: when an item enters or leaves `hidden`, its owner gets
  a `moderation` notification with `data = { item_id, action: "item_hidden" |
"item_restored" }` (not for an admin's own item; editing a hidden item adds
  none). Hidden items keep `resolved_at`, so restoring returns them to their
  previous status: `resolved` when `resolved_at` is set (the original time is
  kept), otherwise `active` (P10.S4 decides it from `resolved_at`).
- **Queue and item moderation (P10.S4 ✓):** `/admin/reports` lists items with open
  flags, the one whose oldest open flag waits longest first (10 items per page), each
  with its flags oldest first (reason, details, reporter, time) and the owner;
  `?view=hidden` lists hidden reports (most recently changed first, 20 per page) with
  "Restore" and what they return to. Actions (`src/actions/admin.ts`, each
  `requireAdmin()`): `hideItem` (hides the report — no-op when already hidden — and
  resolves the flags shown), `restoreItem` (`resolved` when `resolved_at` is set,
  else `active`; no-op when not hidden), `closeReports` (resolve or dismiss the flags
  shown). Only the flag ids the admin saw are closed, so a flag filed after the page
  loaded stays open. Hide + resolve are two statements (no RPC): if the second fails,
  the item stays in the queue as hidden with "Resolve" available.
- **User management (P10.S5 ✓, `20261005195331_admin_users.sql`):** admins cannot read
  other users' `role`, `is_banned` or email (column privileges, `auth.users`), so
  `/admin/users` reads `admin_list_users(search, banned_only, page_size, page_offset)`
  (`security definer`, `42501` for non-admins, `22023` for page size outside 1–100 or
  a negative offset): newest accounts first; `search` is a case-insensitive substring
  of the display name or email (no wildcards); returns public profile columns, email,
  role, ban state, last sign-in, number of reports, open flags about them and
  `total_count` (a page past the end has no rows). Ban/unban only through
  `admin_set_banned()` (P10.S1). Banned users see `BannedNotice` under the header on
  every page (read per request).
- **Categories (P10.S6 ✓):** `/admin/categories` adds (slug fixed afterwards, placed
  last), renames (mk/en), changes the icon, reorders (up/down; the full order is
  saved at once) and deletes unused categories; `other` and categories in use cannot
  be deleted (database errors `FL409`/`23503` → readable messages).

---

## 19. Internationalization

- Locales `mk` (default, no prefix) and `en` (`/en`). Config in
  `src/i18n/routing.ts`; messages loaded in `src/i18n/request.ts`; time zone
  `Europe/Skopje`.
- `messages/mk.json` is the type source (`src/global.d.ts`), so a key missing in
  `mk.json` is a TypeScript error. **Both files must always have the same keys.**
  A unit test (P2.S1) checks that.
- Namespaces per feature: `Metadata`, `Header`, `Footer`, `Home`, `NotFound`,
  then `Auth`, `Profile`, `Items`, `Search`, `Map`, `Matches`, `Notifications`,
  `Messages`, `Favorites`, `Admin`, `Validation`, `Errors`.
- Database content: categories have `name_mk`/`name_en`. User content (titles,
  descriptions, messages) is not translated.
- Language switcher keeps the path and query string; next-intl sets `hreflang`
  alternate links automatically.

---

## 20. Testing strategy

| Level          | Tool                                                                                                                                      | What                                                                                                                            | From   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Static         | ESLint, TypeScript (`next typegen && tsc`)                                                                                                | Every step                                                                                                                      | P1     |
| Build          | `next build`                                                                                                                              | Every step                                                                                                                      | P1     |
| Unit           | Vitest                                                                                                                                    | Zod schemas, search-param parsing, redirect sanitizing, match explanation formatting, image resize math, translation key parity | P2.S1  |
| Component      | Vitest + jsdom (`// @vitest-environment jsdom` in `*.test.tsx`), `react-dom/client` + `act`, server actions and browser-only parts mocked | Form behavior that needs a DOM, e.g. values kept after a failed submit (`item-form.test.tsx`, F-24)                             | F-24   |
| Database / RLS | SQL test scripts in `supabase/tests/*.sql`, run with `npm run db:test` against the **dev** project inside `begin … rollback`              | Policies (impersonating users with `set local role authenticated` + `request.jwt.claims`), triggers, `search_items`, scoring    | P2.S2  |
| Security       | `npx supabase db advisors --linked`                                                                                                       | After every migration                                                                                                           | P1     |
| Manual         | Checklist in each step's "Verify" list                                                                                                    | UI flows in both languages, mobile width                                                                                        | P1     |
| End-to-end     | Playwright                                                                                                                                | Register → verify (via test inbox or pre-confirmed test user) → create item → match appears → message                           | P11.S4 |
| CI             | GitHub Actions: lint, typecheck, unit tests, build                                                                                        | On every push                                                                                                                   | P11.S4 |

SQL tests use `do $$ begin assert …; end $$;` blocks so a failure aborts the
script with a clear message; no pgTAP/Docker needed. They never commit data. A line
`-- @include <path>` (relative to `supabase/tests`) is replaced by that file, e.g.
the demo dataset in `matching_demo.sql` (P6.S6).

---

## 21. Deployment strategy

- **Hosting:** Vercel Hobby, connected to the GitHub repository; every push to
  `main` deploys to production, other branches get preview URLs.
- **First deployment early (P2.S10):** needed so auth redirect URLs and Google
  OAuth can be configured for the real domain, and to catch build problems early.
- **Environments:**

  | Environment | Supabase project                  | Site URL                             |
  | ----------- | --------------------------------- | ------------------------------------ |
  | Local       | dev (`lyvudeaxwibgpqsinqyz`)      | `http://localhost:3000`              |
  | Vercel      | dev until P11.S5, then production | `https://findly-web-nine.vercel.app` |

- **Migrations to production:** manual — `supabase link --project-ref <prod>` →
  `supabase db push` → relink dev. Never automatic from CI.
- **Vercel env vars:** the three `NEXT_PUBLIC_*` variables per environment. If
  `NEXT_PUBLIC_SITE_URL` is missing, `src/lib/env.ts` uses Vercel's
  `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` (trailing slashes are removed).
- **One Supabase project for local and Vercel:** auth email templates link to
  `{{ .RedirectTo }}` (the URL the app sends), so each email returns to the site
  that sent it; both sites must be in the Supabase redirect URLs.
- **Region:** functions run in `fra1` (`vercel.json`), next to Supabase
  (eu-central-1).
- **Free tier limits to keep in mind:** Supabase — 500 MB database, 1 GB storage,
  5 GB egress, 50k monthly active users, **projects pause after 7 days without
  activity** (open the dashboard or app before demos). Vercel Hobby — for
  non-commercial use; check image optimization limits before enabling
  `next/image` optimization for Supabase images (P11.S3).
- **Before the defense (P11.S6):** fresh production project with demo data,
  admin account, Google OAuth and SMTP configured, project un-paused.

---

## 22. Phases and steps

Each step lists: **Depends on**, **Affects**, **Sub-steps**, **Verify** (must pass
before moving on). Every step also runs the standard checks from §1.

---

### Phase 1 — Project setup and architecture — `COMPLETED`

**Goal:** a running, deployable skeleton with i18n, Supabase connection and
database workflow.

#### P1.S1 — Scaffold Next.js project — `COMPLETED`

- **Affects:** `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/*`.
- **Result:** Next.js 16.3.6, React 19.2, TypeScript 5, Tailwind 4, ESLint 9, Turbopack, `src/` dir, `@/*` alias. Branch `main`.

#### P1.S2 — Tooling — `COMPLETED`

- **Affects:** `components.json`, `src/components/ui/*`, `src/lib/utils.ts`, `src/app/globals.css`, `.prettierrc.json`, `.prettierignore`, `.gitattributes`, `.gitignore`.
- **Result:** shadcn/ui (style `base-nova`, Base UI primitives, `cn` package, lucide icons), components: button, card, dropdown-menu, input, label, sheet, sonner. Prettier + Tailwind plugin. LF line endings. `.idea/` ignored. Brand color `#6C63FF` as `--primary`.

#### P1.S3 — Internationalization — `COMPLETED`

- **Affects:** `src/i18n/*`, `messages/*.json`, `src/global.d.ts`, `next.config.ts`, `src/app/[locale]/layout.tsx`, `src/components/layout/locale-switcher.tsx`.
- **Result:** mk default without prefix, en under `/en`, typed messages, locale switcher with plain links preserving the query.

#### P1.S4 — Supabase clients and proxy — `COMPLETED`

- **Affects:** `src/lib/supabase/{server,client,proxy}.ts`, `src/proxy.ts`.
- **Result:** SSR cookie session, `getClaims()` refresh on every page request; matcher excludes `api`, `_next`, `_vercel`, files with extensions.

#### P1.S5 — Environment validation — `COMPLETED`

- **Affects:** `src/lib/env.ts`, `.env.example`.
- **Result:** Zod validation; Supabase URL must be the base URL without a path (added after the `/rest/v1/` misconfiguration).

#### P1.S6 — Initial migration — `COMPLETED`

- **Affects:** `supabase/migrations/20260924000000_init.sql`.
- **Result:** extensions postgis 3.3.7, pg_trgm 1.6, unaccent 1.1 in `extensions`; `categories` with RLS (public select) and 8 seeded rows.

#### P1.S7 — Base layout and home page — `COMPLETED`

- **Affects:** `src/app/[locale]/{layout,page,not-found}.tsx`, `src/app/[locale]/[...rest]/page.tsx`, `src/components/layout/*`, `src/components/items/category-icon.tsx`.
- **Result:** header, footer, localized 404, home page reading categories from Supabase (connection check), errors logged on the server.

#### P1.S8 — Link Supabase project — `COMPLETED`

- **Result:** project `lyvudeaxwibgpqsinqyz` (eu-central-1, Postgres 17.6) linked; migration applied; `src/types/database.ts` generated.

#### P1.S9 — Phase 1 audit and master plan — `COMPLETED`

- **Result:** this document, `CLAUDE.md` project guide, font variable fix (F-01). See [§23](#23-audit-log-and-known-issues).

**Definition of done — Phase 1:** ✅ `npm run dev` shows the home page with 8
categories in mk and en · ✅ unknown URLs show the localized 404 · ✅ lint,
typecheck and build pass · ✅ migration applied to the hosted project, advisors
clean · ✅ plan and `CLAUDE.md` in the repository.

---

### Phase 2 — Authentication — `COMPLETED`

**Goal:** users can register, verify their email, sign in with email or Google,
reset their password and edit their profile; protected routes work.

#### P2.S1 — Test tooling and action conventions — `COMPLETED`

- **Depends on:** Phase 1.
- **Affects:** `package.json` (vitest 5, `@types/node` 24, `test`/`test:watch` scripts), `vitest.config.mts`, `src/lib/action-result.ts`, `src/lib/safe-redirect.ts`, `messages/*.json` (`Errors` namespace), colocated tests `src/**/*.test.ts`.
- **Sub-steps:**
  1. Install Vitest; configure the `@/*` alias; add `npm test`.
  2. `ActionResult`, `ok()`, `fail()`, `validationError()` helpers.
  3. `safeRedirectPath(next)` — only relative paths starting with a single `/`.
  4. Test: `mk.json` and `en.json` have identical key sets.
  5. Test: `safeRedirectPath` rejects `//evil.com`, `https://…`, `/\evil`.
- **Verify:** `npm test` passes; the key-parity test fails if a key is removed from one file (try it, then revert).
- **Result:** 23 unit tests (action results, 20 redirect cases, translation key parity and no empty messages). `ErrorCode` is derived from the keys of `Errors` in `mk.json`, so an untranslated error code is a type error. Removing `Errors.forbidden` from `en.json` made the parity test fail as expected. Deviations: `@types/node` raised from 20 to 24 (Vitest 5 peer requirement; matches Node 24); config is `.mts` because the package is CommonJS; the FormData helper and the `Validation` namespace moved to P2.S4, where the first form schemas need them.

#### P2.S2 — Profiles table, helper functions, RLS — `COMPLETED`

- **Depends on:** P2.S1.
- **Affects:** new migration `*_profiles.sql`, `src/types/database.ts`, `supabase/tests/profiles.sql`, `package.json` (`db:test` script).
- **Sub-steps:**
  1. Enum `user_role`; table `profiles` (§9); `set_updated_at()` trigger.
  2. `handle_new_user()` trigger on `auth.users` (display name from `display_name` or `full_name` metadata, fallback to the part of the email before `@`; locale from metadata, default `mk`).
  3. `is_admin()`, `can_write()` (`security definer`, `stable`, `search_path = ''`).
  4. RLS: public select; update own row; column grants — `authenticated` may update only `display_name`, `avatar_path`, `preferred_locale`.
  5. `db:test` script running `supabase/tests/*.sql` with `supabase db query --linked` inside a rolled-back transaction.
  6. Push migration, regenerate types.
- **Verify:** SQL tests: a user cannot update another profile; cannot set their own `role`/`is_banned`; `can_write()` false when banned; signing up (test via dashboard "Add user") creates a profile row. Advisors clean.
- **Result:** migrations `20260924000100_profiles.sql` and `20260924000200_private_helpers.sql` applied to the dev project; `supabase/tests/_helpers.sql` (create user, `login_as`, `login_as_anon`, `logout`), `supabase/tests/profiles.sql` (profile creation incl. name fallbacks and truncation, column privileges, own/other updates, avatar folder check, insert/delete denied, anon access, banned user, admin detection, cascade delete), `scripts/db-test.mjs` (`npm run db:test [-- <name>]`, exits 1 on failure). A deliberately broken assertion was reported with its message; tests leave no data behind. REST API checked with the publishable key: public columns readable, `role`/`select=*` → 42501, `rpc/is_admin` and `rpc/can_write` not exposed, anonymous PATCH denied.
- **Deviations from the plan:**
  - Added `current_profile()` (public, `security definer`): the only way to read the signed-in user's own `role`, `is_banned`, `preferred_locale`, because those columns are not granted to API roles.
  - `is_admin()` and `can_write()` live in schema `private` (not exposed by the Data API) after the advisors flagged them as callable RPCs. Policies call `private.can_write()` / `private.is_admin()`.
  - Advisors: two accepted warnings remain for `current_profile()` (intentionally callable; returns only the caller's row) — see F-12.
  - Google profile pictures are not imported: `avatar_path` is a storage path; users upload an avatar in P2.S8.
  - Dashboard "Add user" check left as an optional manual test; the trigger is covered by the SQL tests (inserting into `auth.users`).

#### P2.S3 — Auth helpers and route protection — `COMPLETED`

- **Depends on:** P2.S2.
- **Affects:** `src/lib/auth.ts`, `src/lib/supabase/proxy.ts`, `src/proxy.ts`.
- **Sub-steps:**
  1. `getCurrentUser()` (claims + `rpc("current_profile")`), `requireUser()` (redirects to `/login?next=`), `requireAdmin()` (404 for non-admins, based on `current_profile().role`).
  2. `updateSession()` returns the user claims; proxy redirects guests from protected prefixes and signed-in users away from `/login` and `/register` (locale-aware).
  3. Unit tests for the "is protected path" helper (with and without `/en`).
- **Verify:** as a guest, `/profile` and `/en/profile` redirect to the right login URL with `next`; public pages unaffected; unit tests pass.
- **Result:** `src/lib/auth-routes.ts` (+30 unit tests), `src/lib/auth.ts`, `updateSession()` returns `{ userId }`, proxy redirects (refreshed cookies copied, `Cache-Control: private, no-store`), dependency `server-only`. Verified on a production build with a temporary confirmed test user signed in through `@supabase/ssr` (user, temp page and sessions deleted afterwards): guest redirects for `/profile`, `/en/profile`, `/items/new?type=lost`, `/items/<id>/edit`, `/%70rofile`; `/mk/profile` → `/profile` (i18n first); signed-in `/login` → `/`, `/login?next=/profile` → `/profile`, `/en/login?next=//evil.com` → `/en`; `getCurrentUser()` returns the profile for a user and null for a guest; `requireUser()` redirects guests with `next`; `requireAdmin()` 404 for a user, OK after promotion to admin; an invalid session cookie is treated as a guest.
- **Deviations:** signed-in users go to `/` instead of `/dashboard` until P3.S8 (`AFTER_SIGN_IN_PATH`); `/login` and `/profile` still 404 until P2.S4 / P2.S8.

#### P2.S4 — Register and login — `COMPLETED`

- **Depends on:** P2.S3.
- **Affects:** `src/lib/validation/form-data.ts` (FormData → object helper, if multi-value fields need it), `messages/*.json` (`Validation`), `src/app/[locale]/(auth)/{layout,login/page,register/page}.tsx`, `src/components/auth/*`, `src/actions/auth.ts`, `src/lib/validation/auth.ts`, `src/components/layout/site-header.tsx` (+ `user-menu.tsx`), `messages/*.json` (`Auth`).
- **Sub-steps:**
  1. Zod schemas: email, password (8–72 chars), display name (2–50), password confirmation.
  2. Actions `signUp`, `signIn`, `signOut` with error codes (`invalid_credentials`, `email_not_confirmed`, `email_taken`, `weak_password`, `rate_limited`).
  3. Forms with `useActionState`, field errors, pending state.
  4. Header: "Sign in" button for guests; avatar dropdown (profile, dashboard, sign out) for users.
  5. Manual: set minimum password length to 8 in the dashboard.
- **Verify:** register → redirected to `/verify-email`; login with unconfirmed email shows the right message; login with a confirmed user works and header updates; sign out works; both languages; unit tests for schemas.
- **Result:** `src/lib/validation/{messages,auth}.ts`, `src/lib/auth-errors.ts` (`authErrorCode`, `authFailure`), `src/actions/auth.ts` (`signIn`, `signUp`, `signOut` with `scope: "local"`), `src/components/forms/*`, `src/components/auth/{auth-card,login-form,register-form}.tsx`, `(auth)/{layout,login,register,verify-email}` (noindex), `src/components/layout/user-menu.tsx`, header with sign-in/register or user menu. Translations: `Auth`, `Validation`, more `Errors` and `Header` keys. 74 unit tests. Browser check (headless Edge via `playwright-core` in the scratchpad, production build, temporary confirmed + unconfirmed users, deleted afterwards): 23/23 — required/length/match errors, values kept and passwords cleared, `aria-invalid`, address rejected by Supabase shown on the email field, wrong password (mk/en), unconfirmed email, login with `next`, header initials and menu, signed-in `/login` → `/`, sign out, protected page after sign out, no overflow at 360 px, no browser errors.
- **Bugs found and fixed during verification:** Supabase rejects some syntactically valid addresses (`email_address_invalid`, e.g. reserved domains) — this produced a "validation" result with no field error, so nothing was shown; now mapped to the email field, and `FormError` shows a generic message when a validation failure has no field errors. Empty fields said "too short" instead of "required". The mobile header's register button was not hidden (`buttonVariants({ className })` does not merge conflicting classes — use `cn(buttonVariants(), …)`).
- **Deviations:** the static `/verify-email` page was added here (P2.S5 adds resend); no `email_taken` code, because Supabase does not reveal existing emails when confirmation is on — both cases show the same page; the user menu has only sign-out (profile link in P2.S8, dashboard link in P3.S8); `emailRedirectTo` is not set yet (P2.S5), so confirmation links currently land on the Site URL; a successful real sign-up was not tested automatically (the built-in mailer only sends to team members — test manually with your own address).
- **Manual (open):** minimum password length 8 in the dashboard (F-07). The app already enforces 8.

#### P2.S5 — Email verification — `COMPLETED`

- **Depends on:** P2.S4.
- **Affects:** `src/app/api/auth/confirm/route.ts`, `src/app/[locale]/(auth)/verify-email/page.tsx` (exists since P2.S4; add resend), `src/actions/auth.ts` (`resendConfirmation`, `emailRedirectTo` in `signUp`), login form (link to resend when `email_not_confirmed`), Supabase dashboard (templates, URL configuration).
- **Sub-steps:**
  1. Route handler: `verifyOtp({ type, token_hash })`, redirect to a safe `next` or to an error state.
  2. `/verify-email` page: "check your inbox" + resend button (cooldown 60 s).
  3. Manual: "Confirm signup" template (bilingual mk/en) — paste `supabase/templates/confirm-signup.html` (body + subject from its header comment). URL configuration was done in P2.S9.
- **Verify:** new account → email link → signed in and redirected; expired/reused link shows an error page; resend works.
- **Result:** `src/app/api/auth/confirm/route.ts` (token_hash via `verifyOtp`, or `code` via `exchangeCodeForSession`; `locale` + safe `next`; failures logged and sent to `/verify-email?error=link_invalid`), `signUp` passes `emailRedirectTo = SITE_URL/api/auth/confirm?locale=…`, action `resendConfirmation` + `resendSchema`, `src/components/auth/resend-confirmation-form.tsx` (neutral success, 60 s countdown), `/verify-email` error state + resend form, login form link "resend confirmation email" for `email_not_confirmed`, error code `resend_cooldown` (Supabase's per-address cooldown shares its code with the project quota; told apart by message), `supabase/templates/confirm-signup.html` (bilingual via `.Data.locale`). 77 unit tests.
- **Verified:** P2.S9 in the database (real sign-up: email sent, confirmed, signed in). Route on a production build with SQL-created unconfirmed users and `auth.one_time_tokens` rows (no email needed): valid token → session cookie set, email confirmed, redirected to the user's locale; `next=//evil.com` ignored; reused token → `otp_expired` → error page; wrong/missing/bogus token and `code` without verifier (`pkce_code_verifier_not_found`) → error page, reasons logged. Supabase `resend` for an unknown address returns success and creates nothing. Browser (headless Edge): 20/20 — error state (mk/en), resend validation, neutral message, countdown 60 → 58 s, prefilled email, non-email query not displayed, login → resend link prefilled, confirmation link signs the user in, no overflow at 360 px, no browser errors. Test users deleted; the real account was kept.
- **Manual part done (2026-09-24):** the user pasted `supabase/templates/confirm-signup.html` into Supabase and registered with a real address; the email link worked. Database check: 1 user, email confirmed, signed in.

#### P2.S6 — Forgot / reset password — `COMPLETED`

- **Depends on:** P2.S5.
- **Affects:** `(auth)/forgot-password/page.tsx`, `(auth)/reset-password/page.tsx`, `src/actions/auth.ts`, "Reset password" email template.
- **Sub-steps:** request form (always reports success); template link through `/api/auth/confirm?type=recovery&next=/reset-password`; reset form updates the password and signs the user in.
- **Verify:** full reset flow; a reset link cannot be used twice; unknown email gives the same message as a known one.
- **Result:** actions `requestPasswordReset` (`resetPasswordForEmail`, `redirectTo` = `/api/auth/confirm?locale=…&next=/reset-password`, always a neutral success) and `resetPassword` (`updateUser({ password })`, then `signOut({ scope: "others" })` so other devices lose their sessions); schemas `forgotPasswordSchema`, `resetPasswordSchema`; `same_password` → field error `samePassword`; pages `/forgot-password` (form, 60 s cooldown, `?error=link_invalid` state) and `/reset-password` (form for a signed-in user, "request a new link" card for guests); "Forgot password?" link on the login form; `/api/auth/confirm` sends failed recovery links (`type=recovery`, or `next=/reset-password` for the default PKCE template) to `/forgot-password?error=link_invalid`, others still to `/verify-email`; cooldown hook moved to `src/hooks/use-cooldown.ts`; template `supabase/templates/reset-password.html` (bilingual via `.Data.locale`); `email_send_failed` text made generic (not only confirmation). 89 unit tests.
- **Design note:** a session opened from a recovery link has `amr: otp`, the same as a confirmation link (probed on the dev project), and Supabase lets any session change its password without the old one. `/reset-password` therefore accepts any signed-in user; a UI-only gate would add no security. The real control is Supabase's "Secure password change" setting (off), to be considered in P2.S8 (change password on the profile).
- **Verified:** production build, headless Edge, a temporary confirmed `findly-e2e-…@mailinator.com` user (real reset email sent; token read from `auth.one_time_tokens`), deleted afterwards: 28/28 browser checks + route redirects via curl — login link, required/invalid email, identical message for an unknown and a known address, cooldown, link → `/en/reset-password` signed in with the email shown, too short / mismatch / same-as-old password on the right fields, success → continue signed in, another device's refresh token revoked, reused link → `/en/forgot-password?error=link_invalid`, bogus PKCE code with `next=/reset-password` → `/forgot-password?error`, signup link failures still → `/verify-email`, old password rejected and new one works, guest `/reset-password` shows no form, no overflow at 360 px, no browser errors. Only the real account remains.
- **Manual part done (2026-09-24):** the user pasted `supabase/templates/reset-password.html` and reset their password through the email link; confirmed working. Database check: recovery email sent and the account updated.

#### P2.S7 — Google OAuth — `COMPLETED`

- **Depends on:** P2.S4.
- **Affects:** `src/app/api/auth/callback/route.ts`, `src/components/auth/google-button.tsx`, Google Cloud Console, Supabase dashboard.
- **Sub-steps:**
  1. Manual: Google Cloud project → OAuth consent screen → Web client; authorized redirect URI `https://lyvudeaxwibgpqsinqyz.supabase.co/auth/v1/callback`; paste the client ID/secret into Supabase → Auth → Providers → Google.
  2. Button calls `signInWithOAuth` with `redirectTo` = `/api/auth/callback?next=…`.
  3. Callback exchanges the code, redirects safely.
- **Verify:** Google sign-in creates a profile with the Google name; a second sign-in reuses it; cancelling on Google returns to login with a message.
- **Result:** action `signInWithGoogle` (server-side `signInWithOAuth`, PKCE verifier stored in a cookie, `redirectTo` = `/api/auth/callback?locale=…&next=…` with a safe `next`, then redirect to Google), route `src/app/api/auth/callback/route.ts` (`exchangeCodeForSession`; `error=access_denied` → `/login?error=oauth_cancelled`, any other failure → `oauth_failed`, logged; `next` kept), `src/components/auth/{google-button,auth-divider}.tsx`, "Continue with Google" + "or" divider on `/login` (keeps `next`) and `/register`, login page alert for the two error codes. Profile creation needs no change: `handle_new_user()` already falls back to `full_name`/`name`.
- **Verified without Google (provider still off):** production build, headless Edge, 20 checks + curl — button on both pages, request goes to Supabase `/auth/v1/authorize?provider=google` with an S256 code challenge and `redirect_to` = our callback with locale and `next`, verifier cookie set (Supabase then answers "provider is not enabled", as expected); callback: cancel → cancelled message, other errors / bogus code / no params → failed message, `next` kept, `//evil.com` dropped, mk and en; unknown `?error=` values ignored; no overflow at 360 px; no browser errors.
- **Manual part done (2026-09-24):** the user created the Google Cloud OAuth client and enabled the Google provider in Supabase; sign-in, repeated sign-in and cancelling confirmed working. Database check: provider enabled; one `google` identity, whose user has a profile.

#### P2.S8 — Profile page and avatar — `COMPLETED`

- **Depends on:** P2.S4.
- **Affects:** migration `*_avatars_bucket.sql` (bucket + storage policies), `(app)/layout.tsx`, `(app)/profile/page.tsx`, `src/actions/profile.ts`, `src/lib/validation/profile.ts`, `src/components/profile/*`, `src/lib/images.ts` (resize helper, reused in P3.S4).
- **Sub-steps:** edit display name and preferred language; avatar upload (resize to 256 px WebP, path `{uid}/avatar.webp`, upsert); change password for email users; show sign-in method; add "Profile" to the user menu and show the avatar there.
- **Verify:** changes persist; another user cannot overwrite your avatar (storage policy test); invalid names rejected.
- **Result:** migration `20260925204513_avatars_bucket.sql` (public bucket `avatars`, 1 MB, `image/webp`/`image/jpeg`; storage policies: insert into the own top-level folder with `private.can_write()`, select and delete in the own folder, no update policy), `supabase/tests/avatars.sql` (bucket settings, own/other/root/subfolder uploads, no listing/overwrite/delete of other users' files, no in-place updates, avatar_path check, banned and anonymous users). `src/lib/avatars.ts` (paths, public URL, initials), `src/lib/images.ts` (file check, `centerSquare`, `fitWithin`, `resizeImage` → WebP with JPEG fallback; reused in P3.S4), `src/lib/validation/profile.ts`, `src/actions/profile.ts` (`updateProfile`, `updateAvatar`, `removeAvatar`), `(app)/layout.tsx` (noindex) and `(app)/profile/page.tsx` (picture, details, account with sign-in methods, password), `src/components/profile/{user-avatar,avatar-form,profile-form,change-password-form}.tsx`, shadcn `avatar`, `DropdownMenuLinkItem`; the user menu shows the picture and a "Profile" link; `CurrentUser.providers` (from the JWT's `app_metadata`). Vitest gets placeholder env values so modules importing `@/lib/env` can be tested. 129 unit tests.
- **Deviations:** a new file name `{uid}/{uuid}.webp` per upload instead of an upserted `{uid}/avatar.webp`: a fixed name would be served stale from browser/CDN caches, and without an update policy nobody (not even the owner) can overwrite a file. JPEG fallback for browsers that cannot encode WebP. The email language is also synced to `user_metadata.locale`, which fixes F-18. Change password reuses `resetPassword` and does not ask for the current password (see the P2.S6 design note); Supabase's "Secure password change" stays off because it would require an email nonce for sessions older than 24 h.
- **Verified:** migration dry run, `db:test` 2/2, advisors (only the known F-12 warnings and F-19). Production build, headless Edge (`mk-MK`), two SQL-created `@findly.test` users (email-only and simulated Google-only), deleted afterwards with no files left: 66/66 — guest redirect, menu link, account info, too-short/blank name (value kept), name + language saved (trimmed, header updated without reload, UI language unchanged, `user_metadata.locale` synced), wrong type / over 10 MB / undecodable file rejected, a 1600×900 PNG (1.4 MB) stored as a 256×256 WebP of ~1 KB and shown in the header and on the page, replacing deletes the old file, remove clears the path and the file; storage API as the other user: upload into / upsert / update / delete / list the first user's folder all fail, pointing the own profile at another user's file fails, the bucket rejects PNG and files over 1 MB; `/en/profile` in English; password too short / mismatch / same as old rejected, success clears the form, old password rejected, new one works, the other session is revoked, this browser stays signed in; the Google-only account sees no password form; no overflow at 360 px; no browser errors.
- **Redesign (2026-09-25, requested by the user):** SaaS-style settings layout, no behavior change. Header card (large avatar with a camera button and upload overlay, name, email, change/remove, short hint; `avatar-form.tsx` → `profile-header.tsx`, upload logic unchanged), cards via `SettingsCard`/`SettingsCardBody`/`SettingsCardFooter`: "Personal information" (name + language as a segmented radio control, save in the footer), "Account" (email and sign-in method badges, read-only), "Security" (masked password row; "Change password" expands the form with Cancel, focus moves into the form and back; Google-only accounts see a short note). `GoogleLogo` moved to `src/components/auth/google-logo.tsx`. Verified on a production build: the functional suite adapted to the new UI 70/70; screenshots desktop/mobile (375 and 320 px), mk/en, with and without a picture, Google-only account; no overflow.

#### P2.S9 — SMTP setup (manual) — `COMPLETED`

> **Order changed (2026-09-24):** done right after P2.S4 and before P2.S5, because
> the built-in mailer's quota blocked registration (F-15). Email **templates**
> moved into the steps that need them: confirm-signup template → P2.S5,
> reset-password template → P2.S6.

- **Depends on:** P2.S4.
- **Provider:** Brevo free plan (300 emails/day, SMTP relay, a single verified
  sender address is enough — no own domain needed). Resend was not chosen: without
  a verified domain it only delivers to the account owner's own address.
- **Sub-steps (manual, dashboard):**
  1. Brevo: create account, verify a sender address, generate an SMTP key.
  2. Supabase → Authentication → Emails → SMTP Settings: enable custom SMTP
     (host `smtp-relay.brevo.com`, port 587, Brevo SMTP login + key, sender
     name "Findly", sender email = verified Brevo sender).
  3. Supabase → Authentication → Rate Limits: raise "Rate limit for sending emails"
     (e.g. 30/hour).
  4. Supabase → Authentication → URL Configuration: Site URL
     `http://localhost:3000`, redirect URL `http://localhost:3000/**`.
- **Verify:** register in the app with an address that is **not** a Supabase team
  member; the email arrives (check spam once); `auth.users.confirmation_sent_at` is
  set; the link confirms the address (`email_confirmed_at` set). No code changes
  in this step.
- **Result (2026-09-24):** configured by the user (Brevo). Verified in the database: a real registration had `confirmation_sent_at` and `email_confirmed_at` set and the user signed in.

#### P2.S10 — GitHub remote and first Vercel deployment — `COMPLETED`

- **Depends on:** P2.S4 (can be done earlier).
- **Done (2026-09-24):** repository https://github.com/BlagojPetrov/findly-web created; `origin` added; `main` pushed and tracking `origin/main` (verified: same commit locally and remotely).
- **Done (2026-09-25, code):** auth email templates link to `{{ .RedirectTo }}&token_hash=…&type=…` instead of `{{ .SiteURL }}/api/auth/confirm?…` — with one Supabase project for local and Vercel, a fixed Site URL would send every email to one of the two sites (the app already sends `<site>/api/auth/confirm?locale=…[&next=/reset-password]` as the redirect URL); `resolveSiteUrl()` in `src/lib/env.ts` (`NEXT_PUBLIC_SITE_URL` → Vercel production domain → localhost, trailing slash removed, path rejected; 4 unit tests; a build with only the Vercel variable was checked to inline that domain in server and client code); `vercel.json` (region `fra1`); README deployment section; `.env.example` note. P2.S8 commits pushed.
- **Deployed (2026-09-26):** https://findly-web-nine.vercel.app (imported by the user). Verified: `/` and `/en` render (`lang`, titles, categories from Supabase), functions in `fra1` (`X-Vercel-Id`), guest `/profile` and `/en/profile` → login with `next`, unknown page 404, `/api/auth/confirm` with a bogus token → `/en/verify-email?error=link_invalid`, OAuth cancel → `/login?error=oauth_cancelled`, "Continue with Google" reaches Google with `redirect_to` = the Vercel callback (so `NEXT_PUBLIC_SITE_URL` is right); the P2.S8 browser suite against production 70/70 (login, profile, avatar upload/replace/remove from the Vercel origin, storage policies, password change) with SQL-created `@findly.test` users, deleted afterwards. Not verifiable without dashboard access: the redirect URL entry and the re-pasted templates — covered by the real registration/reset below.
- **Manual part done (2026-09-26):** redirect URL added and both templates re-pasted by the user; on the deployed site a real registration (email link opened the Vercel domain and signed in), a password reset and Google sign-in work (user-confirmed; database shows the new email account confirmed and signed in and a new Google account signed in). Production URL: https://findly-web-nine.vercel.app.
- **Sub-steps (all done):**
  1. Vercel: import `BlagojPetrov/findly-web` (preset Next.js); env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` = production URL; deploy.
  2. Supabase → URL Configuration → Redirect URLs: add `https://<vercel-domain>/**` (keep `http://localhost:3000/**`).
  3. Supabase → Email templates: paste the updated `confirm-signup.html` and `reset-password.html` bodies (subjects unchanged).
  4. Real registration and password reset on the deployed site with your own address; Google sign-in there.
- **Verify:** the deployed site loads in both languages; registration/login works on the deployed URL.

**Definition of done — Phase 2:** register → confirm email → sign in → edit
profile works in mk and en, locally and on Vercel · Google login works · password
reset works · guests are redirected from protected pages · RLS tests for profiles
pass · all checks pass · plan updated.

---

### Phase 3 — Items CRUD and image upload — `COMPLETED`

**Goal:** signed-in users can create, edit, resolve and delete lost/found reports
with up to 5 images; everyone can view an item page.

#### P3.S1 — Items and images schema — `COMPLETED`

- **Depends on:** Phase 2.
- **Affects:** migration `*_items.sql`, types, `supabase/tests/items.sql`.
- **Sub-steps:** enums `item_type`, `item_status`; tables `items`, `item_images` (§9); `updated_at` and `resolved_at` triggers; trigger rejecting future `occurred_on`; daily insert limit trigger; RLS per §11 incl. column grants; indexes; SQL function `create_item(...)` (`security invoker`) that inserts the item and its image rows in one transaction.
- **Verify:** SQL tests: owner CRUD works; other users cannot update/delete; banned user cannot insert; hidden items invisible to others; admin sees hidden items (after setting a test admin).

#### P3.S2 — Item images storage bucket — `COMPLETED`

- **Depends on:** P3.S1.
- **Affects:** migration `*_item_images_bucket.sql`.
- **Sub-steps:** public bucket `item-images`, 5 MB limit, MIME `image/webp,image/jpeg`; policies: insert only as `{uid}/{uuid}/{uuid}.(webp|jpg)` and `can_write()`; select/delete own folder or admin; no update policy (files are never overwritten).
- **Changed during implementation:** PNG dropped (the picker always re-encodes to WebP/JPEG and `item_images.storage_path` only accepts `.webp`/`.jpg`); no update policy, as for avatars; admins may see and delete item images for moderation clean-up (P10.S4).
- **Verify:** upload to your own folder works; upload into another user's folder fails.

#### P3.S3 — Item validation schemas — `COMPLETED`

- **Depends on:** P3.S1.
- **Affects:** `src/lib/validation/items.ts`, tests, `messages/*.json` (`Validation`).
- **Verify:** unit tests: lengths, future date rejected, unknown category rejected, max 5 images, lat/lng ranges.
- **Note (from P3.S1):** "today" is the date in `Europe/Skopje`, as in the database trigger. Map `FL429` (`daily_item_limit`) to `rate_limited` (in the action, P3.S5).
- **Implemented:** `itemSchema({ categoryIds, userId })` — a factory, because "known category" and "own image folder" depend on data the action loads (category ids) and on the signed-in user. Fields: `itemId` (uuid from the browser), `type`, `title`, `description`, `categoryId` (string → number), `occurredOn` (ISO date ≤ `todayInAppTimeZone()` from `src/lib/dates.ts`), `locationName` (blank → null), optional `lat`/`lng` (both or neither, ranges; required from P5.S3), `imagePaths` (≤ 5, unique, `isOwnItemImagePath`). `ITEM_LIMITS` holds the lengths for form attributes. Object-level checks (coordinate pair, image paths) run only once the fields are valid (Zod behavior).

#### P3.S4 — Image picker and upload — `COMPLETED`

- **Depends on:** P3.S2, P2.S8 (`src/lib/images.ts`).
- **Affects:** `src/components/items/image-picker.tsx`, `src/lib/images.ts`.
- **Sub-steps:** select/drag multiple images; preview; reorder (cover first); remove; compress to WebP ≤ 1600 px; upload to `{uid}/{itemId}/{uuid}.webp` with progress; the item ID is generated in the browser (`crypto.randomUUID()`) before upload.
- **Verify:** a 6 MB photo uploads as a few hundred KB; more than 5 images blocked; errors shown.
- **Implemented:** `src/lib/item-images.ts` (bucket constants, `newItemImagePath`, `itemImageUrl`, `moveImage`, `takeWithinLimit`, `uploadItemImage`) instead of changes to `images.ts` (reused unchanged). `uploadItemImage` posts to the Storage REST endpoint with `XMLHttpRequest` and the user's access token, because supabase-js has no upload progress; policies apply as usual. `<ImagePicker userId itemId name defaultPaths onPendingChange />` processes one photo at a time (memory on phones), shows a progress bar, retries failed uploads, reorders with arrow buttons (no drag reordering: HTML drag and drop does not work on touch screens), deletes files it uploaded when they are removed, and submits `imagePaths` hidden inputs in order. Messages in the `ImagePicker` namespace.
- **Verified** in headless Edge (temporary page, not committed): a 5.55 MB JPEG was stored as a 231 KB WebP (1600 px, `max-age=31536000`); progress bar and pending state seen; PDF and 6th file rejected with messages; undecodable file reported; reorder changes the submitted order and the cover; removing deletes the file from Storage; mobile and desktop layouts checked; no console errors. Test user and files removed.

#### P3.S5 — Create item page — `COMPLETED`

- **Depends on:** P3.S3, P3.S4.
- **Affects:** `(app)/items/new/page.tsx`, `src/components/items/item-form.tsx`, `src/actions/items.ts` (`createItem`), `messages/*.json` (`Items`).
- **Sub-steps:** type toggle (lost/found, preselected by `?type=`), title, description, category select, date, location name (text; map in P5), images; submit → `create_item` RPC → redirect to the item page.
- **Verify:** item created with images in both languages; validation errors shown per field; a guest is redirected to login.
- **Implemented:** `(app)/items/new/page.tsx` (new item id per visit from the server, `?type=lost|found` preselects, otherwise the user chooses; the date picker's `max` is today in Skopje), `ItemForm` (type cards, title, description, category tiles, date with a label that follows the type, optional location name, `ImagePicker`; submit disabled while photos upload; values kept after errors; success → toast and `router.push('/items/<id>')`), `createItem` in `src/actions/items.ts` (`itemSchema` with category ids from `getCategories()`, checks that every photo exists in the item's folder, `create_item` RPC), `itemWriteFailure()` in `src/lib/item-errors.ts` (`FL429` → `rate_limited`, future date / too many images / deleted category → field errors, `42501` → `forbidden`), `src/lib/queries/categories.ts` (`getCategories`, `categoryName`), `FormTextareaField` + shadcn `Textarea`, `Items` messages, and a "Report an item" link in the user menu (not in the original step; the page had no entry point before P3.S8).
- **Verified** (production build, headless Edge, temporary user, deleted afterwards with its items and files): 27/27 — guest redirect with `next`, `?type=found` preselected, menu link, empty submit shows four field errors and no generic alert, too-short title and future date rejected with values kept, `aria-invalid`, submit disabled while photos upload, a photo path that was never uploaded is rejected and the photos stay in the form, success redirects to `/items/<id>` with a toast (item + 2 image rows in order), English form without photos, no overflow at 360 px, no console errors. The item page itself is P3.S6 (until then the redirect shows the 404 page).

#### P3.S6 — Item detail page (basic) — `COMPLETED`

- **Depends on:** P3.S5.
- **Affects:** `src/app/[locale]/items/[id]/page.tsx`, `src/lib/queries/items.ts`, `src/components/items/{image-gallery,item-type-badge}.tsx`, lost/found color tokens in `globals.css`.
- **Verify:** public item visible to guests; hidden item gives 404 to others; owner sees edit/delete controls; invalid UUID gives 404.
- **Implemented:** `getItem(id)` (`src/lib/queries/items.ts`, cached per request; invalid UUID → null without a query; embeds category, the owner's public profile columns and images sorted cover first), `items/[id]/page.tsx` (public, outside `(app)`; `generateMetadata` with title + description, `noindex` for hidden items; gallery, type and "Resolved" badges, category, date (calendar day formatted in UTC), location name, posted date, owner with avatar, description with line breaks; hidden notice for owner/admin), `ImageGallery` (main photo, previous/next, thumbnails with `aria-current`, placeholder with the category icon), `ItemTypeBadge`, `--lost`/`--found` tokens (light and dark). Owner panel shows **Edit** only; resolve and delete arrive with their actions in P3.S7 (the edit page too — until then the link is a 404).
- **Verified** (production build, headless Edge, two temporary users, deleted with their items and files): 25/25 — owner redirected after create and sees the owner panel; guest sees title, `<title>`, badge, category, date label, location, line breaks, owner, both photos load, next/thumbnail switching; hidden item, invalid id and unknown UUID → HTTP 404 for guest and other user; resolved item shows badge and notice; no-photo placeholder; owner sees the hidden item with notice, without edit link, `noindex`; English labels; no overflow at 360 px.

#### P3.S7 — Edit, delete, mark resolved — `COMPLETED`

- **Depends on:** P3.S6.
- **Affects:** `(app)/items/[id]/edit/page.tsx`, `src/actions/items.ts` (`updateItem`, `deleteItem`, `setItemStatus`), image removal from storage.
- **Verify:** only the owner can edit/delete (try another account); deleting removes storage files; resolved items show a "Resolved" badge.
- **Changed during implementation:** new migration `20260927000103_update_item.sql` with `update_item(item_id, type, title, description, category_id, occurred_on, location_name?, image_paths?)` (`security invoker`, `authenticated` only): updates the item and syncs its image rows (delete missing, insert new, reposition existing via `on conflict (storage_path)`) in one transaction, returns the removed paths; `no_data_found` (`P0002`) when the item is missing, not the caller's, or hidden. Without it an edit would take several requests and could leave an item half-updated. SQL tests: `supabase/tests/items_update.sql`.
- **Implemented:** `(app)/items/[id]/edit/page.tsx` (owner only, not hidden; otherwise 404), `ItemForm` with `mode: "create" | "edit"`, `initialValues`, `initialImagePaths` (cancel link in edit mode), actions `updateItem` (removed photos' files deleted after the save), `setItemStatus` (`active` ⇄ `resolved`, `itemStatusSchema`), `deleteItem` (owner or admin; deletes every file in `<owner>/<item>/`, so abandoned uploads of that item go too), `ItemOwnerActions` on the item page (edit, mark as resolved / reopen, delete with an `AlertDialog`; a hidden item offers only delete), `P0002` → `not_found` in `itemWriteFailure`. After deleting, the owner goes to `/` until the dashboard exists (P3.S8).
- **Verified** (production build, headless Edge, two temporary users, deleted afterwards): 27/27 — owner controls; edit form prefilled with values and photos in order; blank title rejected with photos kept; remove / reorder / add a photo, change title and type → saved, rows in the new order, the removed photo's file deleted only after saving; cancel; resolve (badge, `resolved_at`) and reopen; other user: edit page 404, no controls, and through the API (supabase-js as that user) update, `update_item`, status change, delete and file removal all rejected with the item unchanged; hidden item: only delete, edit page 404; delete dialog cancel; delete removes the item, its rows and all files including an abandoned upload, then 404; no overflow at 360 px; no console errors. `db:test` 5/5, advisors: only F-12/F-19.

#### P3.S8 — Dashboard ("My reports") — `COMPLETED`

- **Depends on:** P3.S7.
- **Affects:** `(app)/dashboard/page.tsx`, `src/components/items/item-card.tsx` (reused in P4), `src/lib/auth-routes.ts` (`AFTER_SIGN_IN_PATH` → `/dashboard`).
- **Verify:** lists own items by status with quick actions; empty state links to "Report item".
- **Implemented:** `getOwnItems(userId)` (`src/lib/queries/items.ts`; all of the user's items newest first, card columns + cover path = the photo with the lowest position; filtered by `user_id` because RLS also returns others' active items; index `items_user_id_created_at_idx`), `ItemSummary` type, `ItemCard` (cover photo or category icon, type and status badges, title as a stretched link to the item page, category, date, location; optional `actions` footer above the link), `(app)/dashboard/page.tsx` (tabs Active / Resolved / Hidden as links with counts, state in `?status=`, invalid values → active; the Hidden tab only when something is hidden; hint on the hidden tab; empty state with "I lost / I found something" → `/items/new?type=…`; per-tab empty message), `ItemOwnerActions` with `compact` (small buttons, icon-only delete) and `redirectAfterDelete` (item page → `/dashboard`; dashboard refreshes in place), "My reports" in the user menu, `AFTER_SIGN_IN_PATH` = `/dashboard`, `calendarDay()` moved to `@/lib/dates`. `Dashboard` messages, `Items.status.active/hidden`, `Header.dashboard`.
- **Changed during implementation:** the `(app)` layout no longer sets a max width; each page does (`max-w-2xl` for profile and the item forms, `max-w-5xl` for the dashboard). Outline `Link` buttons in `ItemOwnerActions` and the empty state use `cn(buttonVariants(…))`: without class merging the base `border-transparent` hid their border (the item page's Edit link had the same bug since P3.S7).
- **Verified** (production build with `--webpack` because of F-22, headless Edge, two temporary users, deleted with their items and files): 40/40 — guest → login with `next` (tab kept); sign-in without `next` and `/login`, `/en/login` while signed in → dashboard; empty state and its links (type preselected); user-menu link; tabs, counts, current tab, newest first; cover = first photo and loads, no-photo card shows the category icon; card fields; quick actions; card click opens the item; resolve / reopen from the dashboard move the item between tabs; hidden tab (hint, badge, only delete); invalid `status`; delete dialog cancel / confirm from the dashboard (item and files gone, stays on the dashboard); delete on the item page → dashboard; the other user sees none of it; English; at 360 px quick actions in one row, all tabs visible, no overflow; profile keeps its width; no console errors.

**Definition of done — Phase 3:** full item lifecycle (create with images → view →
edit → resolve → delete) works for the owner and is blocked for others (UI + RLS
tests) · images compressed · both languages · checks pass.

---

### Phase 4 — Feed, search and advanced filters — `COMPLETED`

**Goal:** a public, server-side searchable feed with filters in the URL, and SEO-ready item pages.

#### P4.S1 — Search normalization and indexes — `COMPLETED`

- **Affects:** migration `*_search.sql`, `supabase/tests/search.sql`.
- **Sub-steps:** `immutable_unaccent()`, `normalize_text()` (§12); `search_text` column + trigger; `search_vector` generated column; GIN indexes; backfill existing rows.
- **Verify:** SQL tests: `normalize_text('Црн Паричник')` = `normalize_text('crn paricnik')`; typo query ranks correctly.
- **Implemented:** migration `20260927223351_search.sql`: `private.immutable_unaccent()`, `private.normalize_text()` (§12; execute for `anon`/`authenticated`), `items.search_text` (not null, set by the `items_set_search_text` trigger on insert and on updates of title/description/location name; users have no privilege on the column), `items.search_vector` (stored generated `to_tsvector('simple', search_text)`), GIN indexes `items_search_vector_idx` and `items_search_text_trgm_idx` (`gin_trgm_ops`), backfill of existing items with `items_set_updated_at` disabled so `updated_at` is unchanged. Types regenerated (`search_text` is required in `Insert`, but items are only inserted through `create_item()`).
- **Changed during implementation:** transliteration without diacritics plus Latin digraph folding instead of ч→ch, ш→sh, … (§12), so the Verify case holds.
- **Verified:** dry run in a rolled-back transaction; `db:test` 6/6 (`search.sql`: Cyrillic / Latin / diacritics / digraph equivalences for every special letter, punctuation, null; anon can normalize; `search_text` on insert and update, unchanged by a status change; full-text match with Cyrillic and Latin queries; typos "parichnk" (score > 0.4), "клучви" and "телефн самсунг" rank the right item first; direct write to `search_text` rejected); both existing items backfilled with `updated_at` untouched; `EXPLAIN` uses both GIN indexes; advisors: only F-12/F-19.

#### P4.S2 — `search_items` function — `COMPLETED`

- **Depends on:** P4.S1.
- **Affects:** migration `*_search_items.sql`, types.
- **Verify:** SQL tests for each filter, pagination totals, hidden items excluded, page size capped at 50.
- **Implemented:** migration `20260927224223_search_items.sql` with `public.search_items()` as described in §12 (execute for `anon`/`authenticated` only), types regenerated, `supabase/tests/search_items.sql`.
- **Changed during implementation:** parameter `item_status` instead of `status`; `plainto_tsquery` instead of `websearch_to_tsquery`; unknown `sort` raises `22023`; radius parameters left for P5.S5 (§12). The migration calls `extensions.show_limit()` before `create function`: until pg_trgm's library is loaded, `pg_trgm.word_similarity_threshold` is a placeholder that the (non-superuser) `postgres` role may not put in a function's `SET` clause (`42501`). Callers are not affected (checked as `anon` in a fresh session).
- **Verified:** dry run; `db:test` 7/7 (`search_items.sql`, test items isolated by date so real items do not interfere: defaults, type, one/two/empty categories, resolved, any status, hidden never returned (as a visitor, as the hidden item's owner and as an admin, even when searched for), inclusive date range, combined filters, Cyrillic / Latin-with-diacritics / typo / unfinished-word queries, description words, no match, punctuation-only query ignored, text search keeps the status filter, newest vs relevance order, relevance without `q`, `sort` null, unknown sort rejected, pages 1–3, page 0, page size 0 → 1, `total_count` on page 2, 55 items with page size 500 → 50 rows, total 55, cover = position 0, null cover, category fields, rank); supabase-js as a visitor through the API (defaults, text query, page size 1000 → capped, invalid sort → `22023`); advisors: only F-12/F-19.

#### P4.S3 — Search params schema and parsing — `COMPLETED`

- **Affects:** `src/lib/validation/search.ts`, tests.
- **Verify:** unit tests: invalid values fall back to defaults; round trip parse → serialize.
- **Implemented:** `src/lib/validation/search.ts`: `SearchFilters` type, `DEFAULT_SEARCH_FILTERS`, `searchParamsSchema({ categorySlugs? })` (Zod; every field has its own fallback), `parseSearchParams(params, { categorySlugs? })` (page `searchParams` or `URLSearchParams`; never throws), `searchQuery(filters)` (URL query without default values, for `Link` `query` or `URLSearchParams`), `defaultSort(q)`, `SEARCH_STATUSES`, `SEARCH_SORTS`, `SEARCH_LIMITS`. Rules in §12 (URL contract).
- **Changed during implementation:** `status` also accepts `all`; the default sort is `relevance` with a query and `newest` without; location parameters wait for P5.S5 (§12).
- **Verified:** `search.test.ts`, 46 tests: defaults; every filter; 15 invalid values each falling back alone; valid fields kept next to invalid ones; repeated parameters; query cleaning; default sort; category lists (case, spaces, empty items, duplicates, unknown and malformed slugs, repeated keys, format-only without known slugs, max 20); reversed dates swapped; `URLSearchParams` input; serialization omits defaults; round trips parse(serialize(f)) = f for 5 filter sets and serialize(parse(url)) canonical for messy URLs. All checks pass (258 unit tests).

#### P4.S4 — Items feed page with filters — `COMPLETED`

- **Depends on:** P4.S2, P4.S3.
- **Affects:** `src/app/[locale]/items/page.tsx`, `src/components/search/*`, `src/lib/queries/items.ts`, `messages/*.json` (`Search`), new shadcn components (select, badge, popover/calendar if needed).
- **Verify:** filters change the URL and results; back button restores filters; works without JavaScript for the basic form.
- **Implemented:** `searchItems(filters)` and `SEARCH_PAGE_SIZE` (20) in `src/lib/queries/items.ts` (maps `SearchFilters` to `rpc("search_items")`, `status: "all"` → `item_status: null`, rows → `ItemSummary`, which is now an explicit type with nullable `location_name`/`coverPath`, shared with `getOwnItems`); `src/app/[locale]/items/page.tsx` (public; metadata; parses the URL with the existing category slugs; **redirects every non-canonical URL to the one `searchQuery()` builds** — empty form fields, repeated `category` keys, invalid values, unknown parameters; result count; results as `ItemCard`s; basic empty message); `src/components/search/search-filters.tsx` (`next/form` GET form: search text, type, categories, date range (max today), status, sort only when there is a text; apply and clear; remounted per URL via `key` so back/forward show the URL's values; on small screens the panel sits behind a CSS-only checkbox toggle with the number of active filters, so it also works without JavaScript); "Browse" link in the header (icon only on phones); `Search` messages.
- **Changed during implementation:** native controls instead of new shadcn components (select, popover, calendar), because they work without JavaScript; P4.S3's parser now forces `sort` to `newest` without a query and `searchQuery()` never writes `sort` then (a cleared search would otherwise keep a meaningless `sort=relevance`).
- **Verified** (production build with `--webpack`, headless Edge, a temporary user with 5 items, deleted afterwards): 43/43 — guest access, title; defaults (active only, never hidden); search by Cyrillic, Latin and typo; count; relevance vs newest; type + categories, status resolved / all, date range through the form, each ending on the canonical URL with the form showing the filters; back ×3 and forward restore URL, results and form; messy and invalid URLs redirect to canonical ones; empty state and clear; card → item page; header link; locale switch keeps the filters; English; without JavaScript at 390 px (CSS toggle, submit, redirect, results, active count); 360 px without overflow (header fits); no console errors. No filter label clipped at 1280 or 360 px.

#### P4.S5 — Item cards, pagination, empty/loading states — `COMPLETED`

- **Affects:** `item-card.tsx` (exists since P3.S8; extend if the feed needs more), `pagination.tsx`, `items/loading.tsx`.
- **Verify:** responsive grid on mobile/desktop; pagination preserves filters.
- **Implemented:** `src/lib/pagination.ts` (`pageCount()`, `pageItems()`: first, last, current ± 1 and gaps, a gap never hides a single page, constant length of 7); `src/components/search/pagination.tsx` (`Pagination`: plain links built by an `href(page)` callback, for the feed `searchQuery({ ...filters, page })`, so filters are kept and page 1 has no `page` parameter; previous/next with `rel`, disabled at the ends; page numbers with `aria-current` from `sm`, "page x of y" on phones); feed page: result range heading ("21–40 of 45 items") when there is more than one page; **a page past the end redirects to the last page** (one extra `searchItems` call for page 1's total; page 1 when nothing matches); empty states: no matches → "Clear filters" link, empty feed → links to report a lost/found item; loading state: `src/components/search/pending-marker.tsx` (`LinkPendingMarker` with `useLinkStatus` in every page link, `FormPendingMarker` with `useFormStatus` in the filter form) marks a running navigation with `data-pending`, and the feed dims its results and shows a spinner with "Loading results…" in the (live) result heading via `group-has-[[data-pending]]/feed:`; the sticky filter panel is capped at the viewport height and scrolls (at 1280×900 it was 860 px tall, so "Apply filters" was below the fold while scrolled); `Search`/`Pagination` messages. `ItemCard` needed no changes.
- **Changed during implementation:** **no `items/loading.tsx` and no Suspense fallback for the results.** Both stream the fallback first on a full page load, and the streamed results are only swapped in by inline JavaScript: without JavaScript the feed stayed on the skeleton forever (P4.S4 requires the feed to work without JavaScript, and crawlers that do not run JavaScript would see no items), and the canonical and out-of-range redirects became streamed client redirects instead of HTTP 307. The page cannot stream only client navigations (Next strips the `RSC` header from `headers()`), so the loading state is the navigation-pending dimming above. Found on the way: `SearchFilters` and a keyed `Suspense` sibling had the same `key`, which made React keep every old form in the DOM (4 forms after 4 navigations); gone with the Suspense, and the check now asserts one form.
- **Verified** (production build with `--webpack`, headless Edge, a temporary user with 45 items dated 2002-05-01, deleted afterwards): 48/48 — 20/20/5 cards on pages 1–3 with range headings, page links 1–3, `aria-current`, disabled previous/next at the ends, filters kept in page links, page 1 without `page`, scroll to top, back restores page 2; applying the filter form from page 2 goes to page 1; `type=lost` page 2 (22 items) and its links keep `type`; page 9 → page 3, `type=lost&page=5` → page 2, no matches on page 4 → page 1 (also as HTTP 307 with curl, and without JavaScript); filtered empty state and "Clear filters" → `/items`; grid 3/2/2/1/1 columns at 1280/1024/768/390/360 px without horizontal overflow, numbered pagination from 640 px and compact below; results dimmed with the spinner while a page link or the filter form waits for a (delayed) server response, not dimmed at rest or afterwards; one filter form after several navigations; filter panel fits the viewport while scrolled; English range heading and labels, links keep `/en`; without JavaScript at 390 px results visible and page links work; no console errors. Pagination unit tests: 18 (`pagination.test.ts`). The empty-feed state (no reports at all) could not be shown against the shared dev database, which has real items.

#### P4.S6 — SEO — `COMPLETED`

- **Affects:** `items/[id]/page.tsx` (`generateMetadata`, canonical, `alternates.languages`), `items/[id]/opengraph-image.tsx` or cover image as OG image, `src/app/sitemap.ts`, `src/app/robots.ts`, JSON-LD (optional).
- **Verify:** page source has correct title/description/OG tags in both languages; `/sitemap.xml` lists active items; `/robots.txt` disallows `/admin` and protected paths.
- **Implemented:** `src/lib/seo.ts` (`localeAlternates(path, locale, query?)`: canonical in the page's locale + hreflang `mk`/`en`/`x-default` (= mk), relative to the layout's `metadataBase`; `openGraphBase(locale)`: site name, `og:locale` `mk_MK`/`en_US` + alternate; `metaDescription()`: whitespace collapsed, cut at a word boundary to ≤ 160 characters with "…"); layout: site-wide Open Graph (`website`); home: alternates; feed: canonical = the canonical filter URL (with its query) and alternates, `noindex, follow` for text searches (`q`), Open Graph; item page: title "Lost: <title>" / "Изгубено: <title>", description "category · place · date. text", canonical + hreflang, Open Graph `article` (url, published/modified time, **cover photo as `og:image`** with alt), Twitter card `summary_large_image` with a photo and `summary` without; hidden items keep `noindex` (owner/admin only) and give other visitors a 404 without item metadata. `src/lib/supabase/public.ts` (`createPublicClient()`: supabase-js without a session or cookies, runs as `anon`); `src/app/sitemap.ts` (home and feed + every **active** item, one entry per locale with `hreflang` alternates, `lastmod` = `updated_at`; read in batches of 1000 up to the 50,000-URL limit; `revalidate = 3600`); `src/app/robots.ts` (allow `/`; disallow `/api/` and every protected prefix from `auth-routes.ts`, now exported as `PROTECTED_PREFIXES`, plus `/items/*/edit`, in both locales; sitemap URL). 9 unit tests (`seo.test.ts`).
- **Changed during implementation:** no generated `opengraph-image.tsx` — the cover photo is the preview image and items without photos have none (a generated image with Cyrillic text would need a bundled font; can be added in P11). No JSON-LD (optional). Sign-in pages stay crawlable with `noindex` instead of being disallowed (a disallowed page's `noindex` is never seen).
- **Verified** (production build with `--webpack`, temporary user with an active item with a photo, a resolved and a hidden item, deleted afterwards): 69/69 on the HTML source, with a browser and a link-preview (`facebookexternalhit`) user agent, all tags inside `<head>`: title, description (≤ 160, "…", no double spaces), canonical, hreflang ×3, `og:title/description/type/url/site_name/locale/locale:alternate/image/image:alt`, article times, Twitter card, indexable; English title/description/canonical/locale; resolved item without photo (no `og:image`, `summary`); hidden item → 404 without its title, `noindex`; feed canonical/hreflang/OG, filtered feed canonical with the query (mk and en), search `noindex, follow`; home `/` and `/en` canonicals; login `noindex`; `robots.txt` (13 disallow checks, `/items` allowed, sitemap URL); `sitemap.xml` lists home, feed and the active item in both locales with hreflang and `lastmod`, not the resolved or hidden item, nothing protected. Browser smoke test of home, feed, search and item pages in both locales: no console errors. Found and fixed during the check: Macedonian long dates end with "г.", which made "2026 г.. text".
- **Note:** the sitemap's Supabase request goes through Next's fetch data cache (revalidated hourly with the route), so a local rebuild can reuse an earlier result; delete `.next/cache/fetch-cache` to force fresh data.

#### P4.S7 — Home page latest items — `COMPLETED`

- **Affects:** `src/app/[locale]/page.tsx`.
- **Verify:** latest lost and found items shown; categories link to filtered feed.
- **Implemented:** home page: hero with a search box (`next/form` GET to `/items`, `q` required, works without JavaScript), "Report an item" and "Browse all items"; "Recently lost" / "Recently found" sections with the 4 newest active reports of each type (`searchItems({ ...DEFAULT_SEARCH_FILTERS, type }, { pageSize: 4 })`, the new optional `pageSize` of `searchItems`; `ItemCard` grid 1/2/4 columns, on phones one swipe row with scroll snap where the next card peeks in), "All lost/found items" links to `/items?type=…`, an empty message per section; category tiles are links to `/items?category=<slug>` built with `searchQuery()`; categories come from `getCategories()` (the P1 connection-check message `Home.categoriesError` is gone, a failure now goes to the error page like elsewhere); "How it works" moved below; `Home` messages.
- **Verified** (production build with `--webpack`, headless Edge, temporary user with 6 lost + 5 found active items and a newer hidden and resolved one, deleted afterwards): 34/34 — 4 newest per type in order, hidden/resolved never shown, badges; "All lost/found" → `/items?type=…` with the filter checked; 8 category links → canonical `/items?category=wallet` (no redirect) with the filter checked; empty hero search not submitted; hero search → `/items?q=…` finding the items; "Report an item" as a guest → `/login?next=/items/new`; "Browse all" → `/items`; card → item page; 4/4/2/2 columns at 1280/1024/768/640 px, swipe row at 390/360 px (next card visible, page 2,728 px tall instead of 5,188 with a column), no horizontal page overflow; English headings and `/en` links and form action; without JavaScript hero search and category links work; no console errors. The empty section message could not be shown against the shared dev database (it has real items of both types).

**Definition of done — Phase 4:** text search works with Cyrillic, Latin and typos ·
every filter is server-side and combinable · shareable URLs · SEO tags and sitemap
present · SQL and unit tests pass.

✅ Met on 2026-09-28: Cyrillic/Latin/typo search (P4.S1–S2 SQL tests, P4.S4 browser
check); type, category, status, date and text filters combined in `search_items()`;
canonical shareable URLs (P4.S3–S5); metadata, hreflang, Open Graph, sitemap and
robots (P4.S6); `db:test` 7/7 and 286 unit tests pass.

---

### Phase 5 — Map and location — `COMPLETED`

**Goal:** coordinates on every report, a location picker, maps on item pages, radius search and a map page.

#### P5.S1 — Leaflet base map component — `COMPLETED`

- **Affects:** `package.json` (leaflet, react-leaflet, @types/leaflet), `src/components/map/base-map.tsx`, `src/components/map/index.ts` (dynamic import).
- **Verify:** map renders client-side, no SSR errors, attribution visible, marker icons load.
- **Implemented:** `leaflet` 1.9.4, `react-leaflet` 5.0.0 (peer React 19), `@types/leaflet`. `src/lib/map.ts` (no Leaflet import: `LatLng`, Skopje `DEFAULT_CENTER`/`DEFAULT_ZOOM` 13, `MACEDONIA_BOUNDS`, OSM tile URL, attribution, max zoom 19). `base-map.tsx`: `MapContainer` + OSM `TileLayer` filling its parent, Leaflet CSS, bundled marker images set as the default icon of every `Marker`, scroll-wheel zoom off by default, `center`/`zoom` are the initial view only. `index.tsx` (JSX, so `.tsx`): `BaseMap` loaded with `next/dynamic({ ssr: false })`, `MapLoading` placeholder (sr-only `Map.loading`), `MapFrame` (labelled region, sizing via `className`, `isolate` so Leaflet's z-index 400–1000 panes and controls stay under the sticky `z-40` header).
- **Changed during implementation:** a page that imports anything from `react-leaflet` (even `Marker`) pulls Leaflet into server rendering and fails with `window is not defined`, so wrapping only `BaseMap` is not enough. Pattern for later steps (§13): each map (`item-map.tsx`, `location-picker.tsx`, `items-map.tsx`) is a browser-only module that imports `base-map` and react-leaflet directly, and `index.tsx` exports it through `dynamic(..., { ssr: false, loading: MapLoading })`; pages render it inside `MapFrame`.
- **Verified** (production build with `--webpack`, headless Edge, temporary `/map-test` page removed afterwards): 28/28 — server HTML has only the placeholder (mk and en text) and the region label, no Leaflet markup; both maps render in the browser; OSM tiles load (256 px from `tile.openstreetmap.org`); attribution visible with the copyright link; marker icon (25×41) and shadow load from `/_next/static/media/`; popup opens; wheel over the map scrolls the page; zoom button works; header covers map panes and zoom control when scrolled under it; no horizontal overflow at 375 px; `/` and `/items` unaffected; no console errors or failed requests.

#### P5.S2 — Location picker and geocoding — `COMPLETED`

- **Affects:** `src/components/map/location-picker.tsx`, `src/lib/geocoding.ts` (Nominatim, debounced).
- **Verify:** click/drag sets coordinates; address search and "use my location" work; reverse geocoding fills the address; ≤ 1 request/second.
- **Implemented:** `src/lib/geocoding.ts`: `searchAddress(query, { locale, signal })` (`countrycodes=mk`, `accept-language`, 5 results, `[]` without a request under 3 characters), `reverseGeocode(point, …)` (null when Nominatim has no address), `formatPlace()` (short "name, street no., suburb, city" label ≤ 200 chars instead of the long `display_name`), one shared `createThrottle()` for all requests (1.1 s between starts; a request aborted while waiting uses no slot), in-memory cache of 50 responses, `GeocodingError`. `location-picker-map.tsx` (browser-only, exported as `LocationPickerMap` from `index.tsx`): click places the pin, draggable pin, moves the view only when a new `view` is passed (search result, own location). `location-picker.tsx` (`LocationPicker`, regular Client Component): address search (500 ms debounce, results as buttons, count announced in a status region, Enter picks the first result and never submits the form), "My location" (browser geolocation; denied/unavailable/unsupported messages), map in `MapFrame` (4:3, 16:9 from `sm`) with the pin's coordinates below it, `locationName` field filled by reverse geocoding (or the search result's label) and editable, hidden `lat`/`lng` (6 decimals, empty without a pin); props `defaultPoint`, `defaultLocationName`, `errors`, `locationNameErrors`, `disabled`. `LocationPicker` messages in mk/en. Not yet used by the item form (P5.S3).
- **Changed during implementation:** interval 1.1 s instead of 1 s so requests also arrive at Nominatim at least a second apart (measured gaps 1.09 s: the timestamp is taken slightly before `fetch` runs).
- **Verified:** 14 new unit tests (labels, URLs, throttle spacing and abort, short queries, cache, HTTP errors, reverse without address). Browser check (production build with `--webpack`, headless Edge, temporary `/picker-test` page with the picker in a form, removed afterwards; real Nominatim): 44/44 — no requests on load; click sets 6-decimal coordinates and reverse geocoding fills a Cyrillic address; dragging the pin moves the point and re-geocodes; manual address edits are posted with `lat`/`lng`; typing "Камен мост" makes a single search request, none under 3 characters; Enter picks the first result without submitting, centres the map and needs no reverse request; "no places" message; "My location" with granted permission sets the device point and re-geocodes, denied shows the message (en); English UI searches with `accept-language=en` and gets Latin labels; three rapid clicks → one reverse request for the last pin; every request ≥ 1 s apart (min 1.09 s, in page and on the network); edit mode shows the default pin, address and a validation error; no horizontal overflow at 375 px; no console errors.

#### P5.S3 — Location in item forms; make location required — `COMPLETED`

- **Depends on:** P5.S2, Phase 3.
- **Affects:** `item-form.tsx`, `src/actions/items.ts`, `src/lib/validation/items.ts`, migration `*_items_location_required.sql` (backfill or delete test rows, then `not null`), `create_item`.
- **Verify:** item cannot be created without a location; edit keeps the location.
- **Implemented:** migration `20260928210206_items_location_required.sql`: backfill of the 4 existing items (all the owner's real reports, named "Кавадарци", so not deleted) with the Kavadarci center from Nominatim (any other item without a point would make the migration fail instead of guessing); `items.location not null`; stored generated `lat`/`lng`; `private.item_point(lat, lng)` (raises `location_invalid`, `23514`, for missing or out-of-range values); `create_item()` and `update_item()` recreated with required `lat`/`lng` after `occurred_on` (the app calls them by name). Types regenerated. `itemSchema` requires both coordinates (`locationRequired` when blank, `locationInvalid` when out of range); `itemWriteFailure` maps `location_invalid` to the `lat` field. `ItemForm`: new "Location" card with `LocationPicker` in place of the `locationName` field (description per type; for found items it asks for a nearby public place, not a home address, since the pin is public); a failed submit keeps the pin. `getItem` selects `lat`/`lng`; the edit page passes them to the form. The picker hides its location error once a new point is chosen.
- **Changed during implementation:** coordinates are read through generated columns instead of `ST_Y/ST_X` in an RPC or view (§13), so every query (item page, later radius filter and `/map`) can select `lat, lng` directly. SQL tests updated for the new signatures (positional calls get `lat, lng`; direct inserts get a `location`).
- **Verified:** dry run in a rolled-back transaction (4 rows backfilled); `db:test` 7/7 with new cases (lat/lng generated, `POINT(lng lat)` stored, missing and out-of-range coordinates rejected, `location` cannot be cleared, `lat` not writable, `update_item` changes the location and rejects a missing latitude); advisors: only F-12/F-19; 301 unit tests. Browser check (production build with `--webpack`, headless Edge, temporary user `p5s3-a@findly.test` deleted afterwards): 23/23 — Location card, privacy note for found items; submit without a point → "Mark the place on the map", other values kept; clicking the map fills the coordinates and address and hides the error; a failed submit keeps the pin and address; create → item page; edit page shows the stored pin (zoom 17) and address; saving without touching the map keeps the location; moving the pin by search and saving stores the new point (`POINT(21.43325 41.997115)` in the database); a tampered edit without coordinates is rejected; English form; no horizontal overflow at 375 px; no console errors. Found F-24 (lost/found choice cleared by a failed submit, pre-existing).

#### P5.S4 — Map on item detail page — `COMPLETED`

- **Affects:** `items/[id]/page.tsx`, `src/components/map/item-map.tsx`.
- **Verify:** marker at the stored location; page still renders if the map fails.
- **Implemented:** `item-map.tsx` (browser-only, exported as `ItemMap` from `index.tsx`): read-only map centered on the item's point at zoom 16 with a fixed pin (`markerIcon`, labelled with the address or title). Item page: "Location" section below the description with the map in `MapFrame` (4:3, 16:9 from `sm`; label per type, e.g. "Map: where the item was lost"), the address and an "Open in OpenStreetMap" link (`osmUrl()` in `@/lib/map`; also the location without JavaScript or when the map fails). `MapFrame` now wraps its map in `MapErrorBoundary` (`map-error-boundary.tsx`): a map whose code does not load or that throws shows "The map could not be shown" and the rest of the page keeps working (applies to every map, including the location picker). Messages: `Map.unavailable`, `Items.detail.mapLabel.{lost,found}`, `Items.detail.openInOsm`.
- **Verified:** unit tests `map.test.ts` (`osmUrl`) and component tests `item-map.test.tsx` (fixed labelled pin with the icon, pin at the map center, failing map replaced by the message with the page kept); 316 unit tests; lint, typecheck, Prettier, webpack build. Browser check (production build with `--webpack`, headless Edge, read-only on a real active item): 24/24 — server HTML has the labelled region, placeholder and OSM link (no Leaflet markup); pin icon 25×41 loaded, labelled, not draggable, its tip at the map center, tiles at zoom 16 for the stored point; OSM link to the stored point; address and attribution visible; English labels; with the Leaflet chunk blocked the page returns 200 with title, description and link and the frame shows the message; 4:3 without horizontal overflow at 375 px; `/items` unaffected; no console errors. Location picker regression check 20/20 (temporary user deleted). Unit-testing a failed `next/dynamic` import is not possible in Vitest (outside Next it resolves to the Pages-router loader, which renders `loading` instead of throwing), so that case is covered by the browser check. On the Vercel deployment (Turbopack, F-25): item map check 24/24 and location picker check 20/20 (temporary user deleted); found F-26.

#### P5.S5 — Radius filter — `COMPLETED`

- **Depends on:** P4.S2.
- **Affects:** `search_items` (new migration), `src/lib/validation/search.ts`, search filter UI.
- **Verify:** SQL test with known distances; UI radius selector; "nearest" sort.
- **Implemented:** migration `20260929145129_search_items_radius.sql`: `search_items()` recreated with `near_lat`, `near_lng`, `radius_km` and `sort => 'nearest'`, returning `distance_m` (§12); invalid centers/radii raise `22023`. Types regenerated. URL contract (`@/lib/validation/search`): `lat`/`lng` → `near` (rounded to 4 decimals), `radius` from `SEARCH_RADII`, `availableSorts()`/`defaultSort({ q, near })`, `centerParam()`; `searchQuery()` writes them canonically. `searchItems()` passes the center and radius and returns `distance` on `ItemSummary`; `ItemCard` shows it ("1.5 km away", `distanceDisplay()` in `@/lib/map`). Filter form: "Distance" group with `NearFilter` (`src/components/search/near-filter.tsx`: "Near me", "On the map" with a radius circle, "Remove", radius select; hidden `lat`/`lng`), sort choices from `availableSorts()`, the center counts as an active filter. `LocationPickerMap` takes an optional `radius` (circle in the theme's primary color). Feed metadata: `noindex` also for distance searches. Messages `Search.near.*`, `Search.sorts.nearest`, `Items.detail.distance`.
- **Changed during implementation:** in the URL, a radius or `sort=nearest` without a center is dropped (redirect) instead of failing; the SQL function raises for such calls so misuse is visible. The feed's filter form remounts on navigation, and a map removed during its zoom animation threw from Leaflet's timer (F-27): fixed for every map in `leaflet-fixes.ts`.
- **Verified:** SQL tests `search_items_radius.sql` (distances within 0.1 % of the WGS 84 values for 0/0.5/1.5/4.5/20/60 km, radius 1/2/5/10/25/50 and fractional, radius + type, another center, nearest order, nearest with radius and pages, total within the radius, nearest without a center = newest, hidden excluded, 11 invalid argument cases, GiST index used) and the updated `search_items.sql`; migration and tests dry-run together in a rolled-back transaction first; advisors: only F-12/F-19. 360 unit tests (new: location parsing/serializing and round trips, `distanceDisplay`, `NearFilter` component tests, `leaflet-fixes`). Browser check (production build with `--webpack`, headless Edge, read-only on the real items in Kavadarci): 41/41 — server HTML has the Distance group with a disabled radius and no center inputs; unrounded center, radius/nearest without a center, invalid center and invalid radius redirect to the canonical URL; 1 km around Kavadarci: 5 items with distances, the one ~430 m away last (nearest), sort choices nearest/newest, radius selected, `noindex`, filter badge; `sort=newest` around a center; 50 km around Skopje: none (Kavadarci ~70 km); any distance: all at 79–80 km; query + center offers three sorts; English labels; "Near me" → 5 km preselected → canonical URL with results and distances; map opens with the circle in the primary color and the pin at the center, radius change re-zooms, click moves the center, apply; "Remove" → `/items`; denied location message; phone: collapsed panel, square map inside it, no horizontal overflow; no console errors. Unmount-during-zoom repro 3/3 clean after the fix (2/3 failed before). Regressions: item map 24/24, location picker 20/20 (temporary user deleted). Production (Vercel, Turbopack, commit `b48dfcd`): migration `20260929145129` listed as applied remotely and `public.search_items` has only the new signature (12 arguments, `distance_m` in the result); radius check 41/41 (server-rendered distances prove the deployed build calls the new signature); Apply right after a radius change 3/3 and zoom control + immediate Apply 5/5 without page errors (F-27 fix active); item map 24/24; location picker 20/20 (temporary user deleted, no orphaned items).

#### P5.S6 — `/map` page — `COMPLETED`

- **Affects:** migration `*_items_in_bounds.sql`, `src/app/[locale]/map/page.tsx`, `src/components/map/items-map.tsx`.
- **Verify:** markers load for the visible area and reload when moving; popups link to items; type filter works.
- **Implemented:** migration `20260929170935_items_in_bounds.sql` (`items_in_bounds()`, planar index `items_location_geom_idx`; §13). Types regenerated. `@/lib/map-items` (client-safe: `MapItem`, `clampBounds`, `groupByPoint`, `fetchMapItems`, `MAP_ITEMS_LIMIT`), `@/lib/validation/map` (`parseMapParams`, `mapQuery`), `requestQuery()` moved to `@/lib/validation/search` (shared by `/items` and `/map`). Components: `item-marker-icon.ts` (`divIcon` in the theme's lost/found/primary colors with a count), `items-map.tsx` (browser-only, exported as `ItemsMap`), `map-explorer.tsx` (`MapExplorer`: debounced loading, status line, retry; `MapItemList` popup content). Page `src/app/[locale]/map/page.tsx`: title, "Show as a list" link to `/items` with the same type, type filter links (`scroll={false}`, `aria-current`), `noscript` hint, metadata with canonical/hreflang/Open Graph. Header link "Map" (icon only on phones), sitemap entries. Messages `MapPage.*`, `Header.map`.
- **Changed during implementation:** the map loads in the browser (a Route Handler or Server Component would add a round trip per move); only active items are shown (resolved reports are history, not something to look for on a map); items at the same point are grouped into one marker instead of adding `react-leaflet-cluster` (the real data had four reports at one point; points apart are separate markers). `clampBounds` first clamped longitudes, which would drop the wrapped part of a view across ±180°; it now asks for every longitude there. Leaflet popups keep Leaflet's white background: dark mode comes in P11.S1 (F-28).
- **Verified:** SQL tests `items_in_bounds.sql` (rectangle with edges, point-sized area, every longitude, type filter, resolved/hidden never shown — also for owner and admin, 300-row cap with total, `max_rows` clamped, newest first, row fields and cover, 11 invalid-bounds cases, planar index used); dry run of migration + tests in a rolled-back transaction first; `db:test` 9/9; advisors: only F-12/F-19. 388 unit tests (new: `map-items`, `validation/map`, `item-marker-icon`, `MapExplorer` component tests with a stand-in map: debounced single request for the last area, grouping and labels, type change reloads the same area, partial and empty counts, failure + retry, abort of a left area, popup links). Browser check (production build with `--webpack`, headless Edge, read-only on the real items in Kavadarci): 43/43 — server HTML (title, map region with placeholder and no Leaflet markup, `noscript` hint, list link, type links with `aria-current`, canonical/hreflang, indexable, invalid type and unknown parameters redirect, English page, sitemap, header link); in the browser one request for the North Macedonia area on load, 5 reports as two markers (four sharing a point: "4", lost color from the theme, labelled, focusable), popup with four item links (type, category, date, place) that open the item; three quick zoom clicks → one request; dragging the map away reloads the new area (after Leaflet's inertia) and the status follows; type filter: "found" requests `item_type=found` for the same area with the view kept, no markers, back to lost and all; blocked RPC → failure message, retry loads; phone (375 px): map 343×520, no horizontal overflow with the new header link, popup fits; English popup links to `/en/items/…`; no console errors. Regressions: radius 41/41, apply-after-zoom race 5/5, item map 24/24, location picker 20/20 (temporary user deleted, no orphaned items). Production (Vercel, Turbopack, commit `ba3f626`; `/map` returned 404 before the deploy): `/map` check 43/43, radius 41/41, zoom + immediate Apply 5/5, item map 24/24, location picker 20/20 (temporary user deleted, no orphaned items).

**Definition of done — Phase 5:** every new item has coordinates · radius search
correct (SQL tests) · map page usable on mobile · Nominatim/OSM policies respected.

---

### Phase 6 — Automatic matching — `COMPLETED`

**Goal:** the system suggests likely lost↔found pairs with a score and a human-readable explanation.

#### P6.S1 — Matches schema — `COMPLETED`

- **Affects:** migration `*_matches.sql` (enum, table, RLS, column grant on `status`), types.
- **Verify:** SQL tests: only owners of either item can see/update a match; nobody can insert directly.
- **Implemented:** migration `20260930174554_matches.sql`: enum `match_status`, table `matches` with constraints, `found_item_id` index, `updated_at` trigger, privileges and two policies (details in §9 `matches`). Types regenerated (`matches`, `match_status`). SQL tests `supabase/tests/matches.sql`.
- **Verified:** dry run in a rolled-back transaction, then pushed; `db:test` 10/10 — `matches.sql`: defaults, 3-decimal score, duplicate pair / same item / score > 1 / negative score / non-object breakdown rejected; anon cannot read; the lost-side owner sees the matches of both lost items, changes the status (`updated_at` refreshed), cannot change score/breakdown/pair, insert or delete; the found-side owner sees only its item's matches (also while the item is hidden), changes their status, cannot change another pair's (0 rows); a banned owner reads but cannot update; a stranger and an admin see nothing and update 0 rows; deleting an item removes its matches and keeps others. Advisors: only F-12/F-19. Lint, typecheck, 388 unit tests, `npm run build` (Turbopack — now works locally, F-22) and `--webpack`. No UI change, so no browser check.

#### P6.S2 — Scoring functions — `COMPLETED`

- **Depends on:** P6.S1, P4.S1, P5.S3.
- **Affects:** migration `*_match_scoring.sql` (`match_score(lost, found)` returning score + breakdown), `supabase/tests/matching.sql`.
- **Verify:** fixture tests from §14 give the expected ordering and component values.
- **Implemented:** migration `20260930182118_match_scoring.sql`: `private.match_words()` and `private.match_score()` (§14; both internal, execute revoked from API roles). No change to generated types (schema `private`).
- **Changed during implementation:** the function returns no row for non-candidates instead of a zero score, so the hard rules live in one tested place; date component uses the absolute difference; `other` on both sides counts 0.5; the place name is excluded from text matching (§14).
- **Verified:** migration and tests dry-run together in a rolled-back transaction first (and a deliberately wrong assert fails the run); `db:test` 11/11 — `matching.sql`: `match_words` (Cyrillic report → sorted normalized words, English common words dropped, empty result); the candidate set (another category, 3 days before the loss, 91 days, ~60 km, same owner, resolved excluded; 2 days before, 90 days, `other`, 20 km included); clear-match breakdown (version, category 1, distance ~1.0 km and exp(−1/5), 1 day and 0.931, six shared words across scripts without lost/found words, text 0.857, score = weighted sum ≈ 0.905); `other` = 0.5 and 0.15 lower; `days_between` absolute (0.867 at 2 days, 0.002 at 90); distance 5 km → 0.368, 20 km → 0.018; different keys: no shared words, text 0.082; full fixture ordering; swapped arguments raise `match_score_types`; users cannot execute the functions. Advisors: only F-12/F-19. Lint, typecheck, 388 unit tests, `npm run build`. Found F-29.

#### P6.S3 — `compute_matches` and triggers — `COMPLETED`

- **Depends on:** P6.S2.
- **Affects:** migration `*_compute_matches.sql`; one-time backfill for existing items.
- **Verify:** creating a matching pair produces one match row; editing the description recomputes; dismissed matches are not recreated; unrelated items produce none.
- **Implemented:** migration `20260930203111_compute_matches.sql`: `private.compute_matches()`, trigger function `private.items_compute_matches()`, triggers `items_compute_matches` (after insert) and `items_recompute_matches` (after update of the matching columns, only when they changed), backfill. SQL tests `supabase/tests/compute_matches.sql`; `matches.sql` now removes the rows the insert trigger creates for its fixture items. No change to generated types.
- **Changed during implementation:** suggested matches are upserted instead of deleted and re-inserted (stable id/`created_at` for P7); details in §14.
- **Verified:** migration and tests dry-run together in a rolled-back transaction (a deliberately wrong assert fails the run), then pushed; `db:test` 12/12 — `compute_matches.sql`: a lost report through `create_item()` alone has no match; the found report creates exactly one suggested lost ↔ found row (score ≈ 0.9, breakdown from `match_score`), visible to both owners; another category, the same owner and ~66 km away give none; a `location_name` change or an unchanged title does not touch the row; a new description keeps id/`created_at`, lowers the score, changes the shared words and refreshes `updated_at`; another category removes the row, changing back recreates it; a dismissed match is neither recreated nor rescored after edits on both sides; a confirmed match is kept; a lost report matches an earlier found one; resolving keeps the row, recomputing the other side drops it, reopening restores it; 12 found reports give 12 rows, recomputing the lost report keeps the 10 best, a dismissed one does not take a place (the 11th moves up); API roles cannot execute the functions. Advisors: only F-12/F-19. Lint, typecheck, 388 unit tests, `npm run build`. No UI change, so no browser check.

#### P6.S4 — Matches UI with explanation — `COMPLETED`

- **Affects:** `src/lib/queries/matches.ts`, `src/components/matches/{match-list,match-card,match-explanation}.tsx`, item page (owner only), dashboard, `messages/*.json` (`Matches`).
- **Verify:** explanation text correct in both languages (unit test for the formatter).
- **Plan change:** P6.S5 (dismiss / confirm) was done in this step at the user's request, together with restoring dismissed and undoing confirmed matches (§14).
- **Implemented:** `@/lib/matches` (client-safe: `parseBreakdown`, `matchReasons`, `matchStrength`, `toMatchViews`, `groupMatches`, `MATCHES_PER_ITEM`), `@/lib/queries/matches` (`getItemMatches`, `getUserMatches`; both items embedded through their foreign keys, no coordinates; `coverPath()` shared with `getOwnItems`), `setMatchStatus` (`src/actions/matches.ts`, `matchStatusSchema` in `@/lib/validation/matches`; updates only `status`, RLS rejection → `forbidden`, 0 rows → `not_found`), components `MatchList` (sections, empty/error/resolved states, dismissed disclosure), `MatchCard`, `MatchExplanation` + `MatchScore`, `MatchActions` (client; confirm, dismiss with Undo toast, restore, undo). Item page: section for the owner (not for hidden items); dashboard: section above the tabs. A failed matches query shows an error message instead of breaking the page. Translations `Matches` (mk/en).
- **Verified:** 37 new unit/component tests (388 → 425): breakdown parsing (malformed fields dropped), reasons and strength, viewer-side mapping (unrelated and invisible rows dropped, visibility per status), grouping and the 10-per-report cap, the action (only `status` sent, validation, not found, forbidden, database), the component in mk and en (explanation texts, percentages, empty/error/resolved states, own-report line on the dashboard only, groups, actions per status, confirm/dismiss/undo/restore calls with refresh and toasts, error toast without refresh). Lint, typecheck, format, `npm run build` and `--webpack`. Browser check (production build, headless Edge `mk-MK`, three temporary `@findly.test` users with reports in Bitola, deleted afterwards): 41/41 — A's dashboard lists 2 matches best first (97 % strong, 67 % possible) with explanation, other report's category/date/place and own-report link, nothing of C's report and no coordinates; confirm (toast, "Confirmed" group, hint, stored), dismiss (stored, disclosure, empty note), Undo from the toast, Restore from the list, undo confirm, keyboard confirm; empty state on a report without matches; a resolved report keeps its confirmed match; English dashboard; B sees A's confirmation and its matches with C, no section on A's report, B's dismissal hides the pair for A; C sees only its 2 matches; guests see no section; no overflow at 360 px; no browser errors. Found and fixed during the checks: the Macedonian word list repeated "и" before "и уште N"; on Vercel the dismiss toast (Sonner default 4 s) could close before its Undo was reached after the refresh, so it now stays 8 s. Production (`a00451d`, Vercel): the same browser suite 41/41; test users deleted afterwards.

#### P6.S5 — Dismiss / confirm — `COMPLETED` (in P6.S4)

- **Affects:** `src/actions/matches.ts`.
- **Verify:** dismissed match disappears for both users; confirmed match shows a "Contact" call to action.
- Done in P6.S4. The "Contact" call to action needs messaging and is added in P8.S2; until then the confirmed card shows the hint and a link to the other report.

#### P6.S6 — Demo dataset and weight tuning — `COMPLETED`

- **Affects:** `supabase/seed/demo.sql` (realistic Macedonian examples; dev project only), weights documented in §14 and in the thesis.
- **Verify:** on the demo dataset the true pairs are in the top 3 for their items; false positives documented.
- **Implemented:** `supabase/seed/demo.sql` (14 demo users `demo-…@findly.test` without a password, 44 reports, 14 true pairs; re-runnable, removable), `supabase/seed/demo-evaluation.sql`, migration `20260930215042_match_weights_v2.sql` (`match_score` weights v2, `compute_matches` threshold 0.60, recompute of all active items), `supabase/tests/matching_demo.sql`, `-- @include` in `scripts/db-test.mjs`; fixture expectations in `matching.sql` and `compute_matches.sql` updated to v2. Results, method and limitations in §14. F-29 fixed.
- **Not done:** the demo data is **not** loaded on the dev project, because the same project serves the public Vercel site and the reports would appear there. It was evaluated only in rolled-back transactions; loading it (`npx supabase db query --linked -f supabase/seed/demo.sql`) is left to the project owner, or to P11.S6 (demo accounts on the production project).
- **Verified:** v1 and v2 evaluated in rolled-back transactions (v1: 26 false positives; v2: 0, all 14 true pairs ranked first from both sides); migration, demo data and evaluation dry-run together, every SQL test dry-run on v2, then pushed; `db:test` 13/13 (`matching_demo.sql` fails on v1 with the 26 false positives and passes on v2); advisors: only F-12/F-19; after the push the one real match on the dev project was rescored with v2 (0.980). Lint, typecheck, 425 unit tests, `npm run build`. No UI change, so no browser check.

**Definition of done — Phase 6:** matches appear automatically after creating a
report · score + explanation shown · owners can dismiss/confirm · SQL tests pass ·
weights and results documented.

---

### Phase 7 — Notifications — `COMPLETED`

**Goal:** users are told about new matches in real time and can review past notifications.

#### P7.S1 — Notifications schema — `COMPLETED`

- **Affects:** migration `*_notifications.sql` (enum, table, RLS, `read_at` column grant, indexes, add to realtime publication).
- **Verify:** SQL tests: users see only their own; cannot insert.
- **Implemented:** migration `20261001114510_notifications.sql`: enum `notification_type`, table `notifications`, two indexes, privileges, three policies (select, update `read_at`, delete; details in §9 `notifications`), `supabase_realtime` publication. Types regenerated (`notifications`, `notification_type`). SQL tests `supabase/tests/notifications.sql`.
- **Verified:** migration and tests dry-run together in a rolled-back transaction (a deliberately wrong assert fails the run), then pushed; `db:test` 14/14 — `notifications.sql`: defaults (id, `{}`, unread, `created_at`), non-object data / missing type / unknown user rejected, both indexes (partial `read_at is null`) and the publication exist; anon cannot read, update or delete; A sees only its 3 (newest first, 2 unread), marks one read and unread again, "mark all read" changes only its 2 unread rows, cannot touch B's row (0 rows), cannot change data/type/recipient/`created_at` or insert, deletes its own but not B's; B's row unchanged; a banned user reads and deletes but cannot mark read; an admin sees and updates nothing of others; deleting a user removes its notifications only. Advisors: only F-12/F-19. Lint, typecheck, 425 unit tests, `npm run build`. No UI change, so no browser check.

#### P7.S2 — Match notification trigger — `COMPLETED`

- **Depends on:** P7.S1, P6.S3.
- **Verify:** a new match creates exactly one notification for each owner.
- **Implemented:** migration `20261001120733_match_notifications.sql`: unique index `notifications_match_pair_key`, `private.matches_notify()` + trigger `matches_notify` (after insert on `matches`), `private.items_delete_match_notifications()` + trigger `items_delete_match_notifications` (after delete on `items`); execute revoked from API roles. SQL tests `supabase/tests/match_notifications.sql`. No change to generated types (schema `private`); no UI change. Design in §15.
- **Plan change:** notifications about a deleted report are removed (not in the original step), so the list never links to reports that no longer exist; a recreated pair reuses its notification instead of notifying again.
- **Verified:** migration dry-run in a rolled-back transaction together with every SQL test (a deliberately wrong assert fails the run), then pushed; `db:test` 15/15 — `match_notifications.sql`: a lone report notifies nobody; a matching report created through `create_item()` gives exactly one unread notification to each owner with `{match_id, own item_id, other_item_id}`, nobody else; each owner sees only its own; rescoring from both sides (row kept, breakdown changed) and confirm/unconfirm leave both notifications unchanged (A's stays read); a pair removed by a category change and recreated with a new id creates no notification, the existing ones point to the new match with the same id, read state and time; a second match of the lost report notifies A (unread) and C, not B; an owner of both items gets one; a rolled-back match leaves no notification; a banned owner is notified; a user cannot insert matches or notifications or mark another's read; users cannot execute either function; deleting B's report removes both notifications about that pair and keeps A's other one; deleting C's account removes A's notification about C's report, not other types; deleting A's report removes A's and D's remaining match notifications. Advisors: only F-12/F-19. Lint, typecheck, 425 unit tests, Prettier, `npm run build` (Turbopack) and `--webpack`. No UI change, so no browser check.

#### P7.S3 — Notification bell with Realtime — `COMPLETED`

- **Affects:** `src/components/notifications/notification-bell.tsx`, header.
- **Verify:** creating a matching item in another browser updates the bell without a reload; the subscription is removed on sign out.
- **Implemented:** `@/lib/notifications` (client-safe: `parseNotificationData`, `toNotificationViews`, `badgeCount`, `notificationHref`, `fetchUnreadCount`, `fetchNotifications`), `@/lib/queries/notifications` (`getUnreadNotificationCount`, server; a failure logs and lets the bell load the count itself), `src/actions/notifications.ts` (`setNotificationRead`, `deleteNotification`; schemas in `@/lib/validation/notifications`; own rows only, RLS rejection → `forbidden`, 0 rows → `not_found`), `elapsedSince()` in `@/lib/dates`, `src/components/notifications/{notification-bell,notification-entry,use-notifications}`, shadcn `popover` (Base UI), header integration, translations `Notifications` (mk/en). Design in §15. No database change.
- **Plan change:** mark read/unread and delete per notification are already in the bell (requested for this step); P7.S4 adds the page, pagination and "mark all read".
- **Verified:** 44 new unit/component tests (425 → 469): payload parsing, view mapping with missing reports/matches, badge text, links, the browser fetchers (user filter, skipped queries, errors), both actions (only `read_at`, own rows, validation, not found, forbidden, database), `elapsedSince`, and the bell in jsdom with a fake Supabase client: count from the server (0 hidden, 99+), one channel with the user's INSERT/UPDATE filter, live badge and one toast for several inserts, other users' events ignored, mk/en list texts (statuses, unavailable reports/match, no link without the own report, no `Intl.RelativeTimeFormat`), loading/empty/error + retry, reconnecting note and catch-up reload, optimistic read/unread with the action's form data, a failed change undone with the error toast, delete, read on following the link, channel and auth listener removed on unmount, a fresh bell for another account, and clearing on a session of another user or `SIGNED_OUT`. Lint, typecheck, Prettier, `npm run build` (Turbopack) and `--webpack`. Browser check (production build, headless Edge `mk-MK`, temporary `bell-a/bell-b@findly.test` users with reports in Bitola, deleted afterwards): 55/55 — guests (mk/en) have no bell; A's bell without badge and the empty panel; a matching found report inserted in the database reaches both of A's tabs over Realtime (badge 1, label, toast) without a reload; entry texts, type badge, relative time in Macedonian, link to `#matches-item`, no coordinates; mark read/unread stored and mirrored in the other tab; the link opens the matches and marks it read; a hidden other report is described as unavailable; delete; a new match appears in the open panel; a deleted report's notification is gone on reopening; English labels, toast and `/en` link; after sign out no bell and no toast for new notifications; B in the same browser sees only B's notifications; 360 px panel inside the viewport without overflow; no browser errors. Found F-30 (Chromium has no Macedonian Intl data), fixed for the bell.

#### P7.S4 — Notifications page — `COMPLETED`

- **Affects:** `(app)/notifications/page.tsx`, `src/actions/notifications.ts`, `messages/*.json` (`Notifications`).
- **Verify:** list, mark read, mark all read; links go to the right item/match.
- **Implemented:** page `src/app/[locale]/(app)/notifications/page.tsx`, `NotificationList` (`src/components/notifications/notification-list.tsx`), `markAllNotificationsRead` and `refresh()` in all notification actions, `fetchNotificationPage` (shared lookup of reports/matches with `fetchNotifications`), `getNotificationPage` + `NOTIFICATIONS_PAGE_SIZE`, the two window events, the bell's "See all" link, translations `Notifications.page`/`seeAll` (mk/en). The route was already protected and disallowed in `robots.ts` (P2.S3). Design in §15. No database change.
- **Verified:** 19 new unit/component tests (469 → 488): `fetchNotificationPage` (range, total, user filter, the 416 case, errors), `markAllNotificationsRead` (own unread rows only, count, forbidden, database, `refresh()` only on success), `refresh()` after the other actions, the bell's "See all" link and both events, and `NotificationList` in jsdom (mk/en summary and times, optimistic read/unread/delete/mark-all with the action's form data, the server's page taking over, a failed change undone with the error, mark-all disabled without unread, read on following a link, the changed event, refresh on received notifications and not after unmount). Lint, typecheck, Prettier, `npm run build` and `--webpack`. Browser check (production build, headless Edge `mk-MK`, temporary `bell-a/bell-b@findly.test` users, 2 real matches and 21 seeded older notifications, deleted afterwards): 55/55 — guests are sent to `/login?next=/notifications`, robots disallows both locales; empty state, `noindex`, title; 20 + 3 entries over two pages, newest first, days and a calendar date, missing other report described, the moderation entry; canonical redirects (`page=1`, `abc`, `9` → last page, unknown and repeated parameters, all 307); mark read/unread stored, summary and bell follow; mark all read (toast with the count, both pages stored, bell cleared, button disabled); a new match appears on the open page over Realtime; deleting the last entries of page 2 lands on page 1; a link opens `#matches-item` and marks it read; "See all" in the bell; English page; B sees only its own; no overflow at 360 px; no browser errors. The P7.S3 bell suite still passes 55/55. Found and fixed during the check: a page past the end showed the error message (PostgREST 416) instead of redirecting.

#### P7.S5 — (Optional) Email for new matches — deferred

- **Affects:** `src/app/api/webhooks/match-email/route.ts`, Supabase database webhook, env secret.
- **Verify:** only if implemented; email in the user's preferred language.
- **Status:** optional and not needed for the Phase 7 definition of done; deferred (2026-10-01) so messaging can start. Can be done later (e.g. before P11.S5) if time allows; it needs a secret and a webhook, and the SMTP provider's daily limit applies.

**Definition of done — Phase 7:** real-time match notifications with history and read state.

---

### Phase 8 — Messaging — `COMPLETED`

**Goal:** the owner of an item and an interested user can chat in real time.

#### P8.S1 — Conversations and messages schema — `COMPLETED`

- **Affects:** migration `*_messaging.sql` (tables, RLS, triggers for `last_message_at` and rate limit, `my_conversations()`, `mark_conversation_read()`, realtime publication).
- **Verify:** SQL tests: non-participants see nothing; users cannot send as someone else; the owner cannot start a conversation with themselves.
- **Implemented:** migration `20261001143641_messaging.sql`: tables `conversations` and `messages`, indexes, privileges and policies, triggers `messages_check_rate_limit` (30/min, `FL429`) and `messages_set_last_message_at`, RPCs `my_conversations()` and `mark_conversation_read()`, `messages` in the `supabase_realtime` publication (details in §9). Types regenerated. SQL tests `supabase/tests/messaging.sql`. No UI change.
- **Plan change:** a conversation can only be started about an `active` item (not resolved or hidden); the owner lists a conversation only once it has a message; `owner_id`/`requester_id` cascade with the accounts; `messages.created_at` uses `clock_timestamp()`; the whitespace check uses a regex (`btrim` keeps newlines).
- **Verified:** migration and test dry-run together in a rolled-back transaction (a deliberately wrong assert fails the run), then pushed; `db:test` — `messaging.sql` passes: defaults, unique pair, self-conversation and unknown user rejected, empty/whitespace-only/2001-character bodies rejected (2000 accepted), `last_message_at` set and never moved back, messages cascade with the conversation, indexes and publication; anon has no access to tables or RPCs; B starts a conversation (requester defaults to B, no chosen id, a second start rejected / `on conflict do nothing`), cannot use a wrong owner, a resolved/hidden item, no item, another requester, set `last_message_at`, update or delete; the list before the first message (B only: item title/type/status/cover, other participant, no messages); sender defaults to B, who cannot send as A, backdate, edit or delete; the sender cannot mark its own messages read; A lists it once there is a message (unread 1), cannot contact itself (23514), marks read/unread only B's messages and only `read_at`; `mark_conversation_read` 1 then 0; unread counts per side; a stranger sees nothing and cannot write or mark read; the 31st message within a minute fails with `message_rate_limit`, older ones do not count; ordering by latest activity; a banned user reads but cannot send, start or mark read (`mark_conversation_read` → 0); an admin sees nothing; a hidden item is null for the requester and visible to its owner; deleting the item keeps the chat without it; deleting an account removes its conversations; API roles cannot execute the trigger functions. All other SQL tests pass except `matching_demo.sql` (F-31: a real report on the dev project, not this step). Advisors: only F-12/F-19. Lint, typecheck, 488 unit tests, Prettier, `npm run build`. No UI change, so no browser check.
- **Follow-up (separate commit):** daily conversation limit, migration `20261001150441_conversation_limit.sql` (20 new conversations per requester in 24 hours, `FL429` `daily_conversation_limit`, per-requester advisory lock; details in §9 `conversations`). Verified: dry-run with `conversation_limit.sql` and `messaging.sql` (a deliberately wrong assert fails the run), then pushed; `conversation_limit.sql`: 20 one by one, the 21st rejected and nothing added; re-opening an existing conversation (`on conflict do nothing`) is not limited, a duplicate still fails as unique; messages unaffected; no backdating (insert or update), delete, disabling the trigger, `session_replication_role`, executing the trigger function, or starting one for another user; the advisory lock is held until the transaction ends; another user is unaffected; 21 rows in one statement fail as a whole, 20 pass, then the next fails; window boundary (1 s inside counts, exactly 24 h does not); being the owner of 24 conversations does not count. Live concurrency check (temporary `conc-*@findly.test` users, 19 prefilled conversations, 2 temporary items, all deleted afterwards): two sessions created the 20th at the same time — the second waited for the first to commit and got `daily_conversation_limit`, total exactly 20. `db:test` 17/17; advisors only F-12/F-19; lint, typecheck, 488 unit tests, Prettier, `npm run build` and `--webpack`. Types unchanged (schema `private`). No existing rows changed (none existed).

#### P8.S2 — Start conversation from item — `COMPLETED`

- **Affects:** `src/actions/messages.ts` (`startConversation`), item page "Contact" button.
- **Verify:** clicking twice opens the same conversation; guests go to login.
- **Implemented:** `src/actions/messages.ts` (`startConversation`), `src/lib/validation/conversations.ts` (`startConversationSchema`), `src/lib/queries/conversations.ts` (`getOwnConversationId`, `getConversation`), `src/components/chat/contact-button.tsx`, contact card on `src/app/[locale]/items/[id]/page.tsx`, minimal `src/app/[locale]/(app)/messages/[id]/page.tsx`, translations `Errors.conversation_own_item/conversation_item_inactive/conversation_limit`, `Items.contact`, `Messages.conversation` (mk/en). No database change (P8.S1 and its limit already enforce everything). `/messages` was already protected and disallowed in `robots.ts` (P2.S3). Design in §16.
- **Decisions:** the action redirects on success (like `signIn`) and returns only errors; an existing conversation is opened even when the report is no longer active or the user is banned (reading stays allowed); new conversations only for active reports; the owner id always comes from the item. The Macedonian hint avoids a gendered pronoun ("Испратете порака на {name}"). The confirmed match card keeps linking to the other report, whose page now has the contact card; a separate button on the card is not added.
- **Verified:** 29 new unit/component tests (488 → 517): the action (owner from the item, never from the form; existing conversation opened without insert, also for resolved/hidden reports and banned users; invalid id before auth; guests sent to login with `next`; not found; own item; resolved/hidden; banned; `FL429` → `conversation_limit`; `23505` → the other request's conversation; `42501` → forbidden; database errors hidden and logged) and `ContactButton` (posts only `itemId`, disabled with spinner while pending, every error in mk, the limit in en, retry after an error). Lint, typecheck, Prettier, `npm run build` and `--webpack`, `db:test` 17/17. Browser check (production build on port 3100, headless Edge `mk-MK`, desktop 1280 px and mobile 390 px, temporary `chat-*@findly.test` users and 3 reports in Struga with no matches, all deleted afterwards): 45/45 — guest card and link to login with `next`, back on the item after sign-in; "Контактирај" opens `/messages/<id>` (button disabled while pending, one row in the database); the item page then shows "Отвори разговор" to the same chat; two tabs clicking at once open the same conversation (one row); resolved report without conversation has no card; English link and heading; owner sees no card and opens the chat as participant; the limit user gets the Macedonian and English limit messages, stays on the page, no raw database text, still 20 rows; banned user gets the permission message and no row; another user's chat and an invalid id are 404, guests are redirected to login with `next`; a hidden report is 404 but its chat opens with "no longer available"; full-width buttons and no horizontal overflow on mobile, auto width on desktop; `noindex`; no browser errors.
- **Production (2026-10-01):** `614b79d`, `c8d666b`, `575ddff`, `e449c06` pushed to `main` as a fast-forward (`e136060..e449c06`, no rewrite). Deployment confirmed by the served code, not only HTTP 200: a fresh render (`X-Vercel-Cache: MISS`) of a real active report shows the P8.S2 contact card and login link, which exist only from `e449c06` (the Vercel CLI is logged out and the private repo's GitHub API is not readable without a token, so the deployment's commit is inferred from that markup; no newer commit exists). The same browser check against https://findly-web-nine.vercel.app: 45/45 (desktop 1280 px, mobile 390 px, mk/en). Extra stale-page check: 10/10 — the requester opens an active report, it is resolved or hidden in the database afterwards, and the still-visible Contact button gets "no longer active" / "not found" (mk desktop, en mobile), stays on the page, no row created, no browser errors. Temporary `chat-*@findly.test` users and reports (Struga, no matches) deleted afterwards; 0 conversations/messages left, no matches or notifications changed. No problems found.

#### P8.S3 — Conversation list — `COMPLETED`

- **Affects:** `(app)/messages/page.tsx`, `src/components/chat/conversation-list.tsx`, `messages/*.json` (`Messages`).
- **Verify:** ordered by latest message; unread counts correct.
- **Implemented:** `src/app/[locale]/(app)/messages/page.tsx`, `src/components/chat/conversation-list.tsx`, `src/lib/conversations.ts` (`toConversationSummaries`, `messagePreview`, `unreadConversationCount`), `getMyConversations` in `src/lib/queries/conversations.ts`, messages icon link in `src/components/layout/site-header.tsx`, translations `Messages.list`, `Header.messages` (mk/en). No database change (`my_conversations()` from P8.S1 orders and counts). `/messages` was already protected and disallowed in `robots.ts`. Design in §16.
- **Verified:** 20 new unit/component tests (517 → 537): the mapper (fields, order kept, own last message, no messages yet → start time, deleted and hidden reports, the owner's hidden report, numeric unread count), the preview, the unread conversation count, and `ConversationList` in jsdom (order and links, report, last message and time, unread highlight with badge and screen-reader text, 99+, "Вие:", no messages, unavailable report, "Ваша пријава", times now/hours/days/date without Intl, English). Lint, typecheck, Prettier, `npm run build` and `--webpack`. Browser check (production build on port 3100, headless Edge `mk-MK`, desktop 1280 px and mobile 390 px, temporary `list-*@findly.test` users, 4 reports in Struga with no matches and 5 conversations, all deleted afterwards): 35/35 — guests are sent to login with `next` and have no header link; the header link opens `/messages`; heading, title, `noindex`, summary "4 разговори · 2 со непрочитани пораки"; order by latest activity (a conversation without messages by its start time), and the owner's conversation without messages is not listed; unread counts 2/1/0/0 with highlight, badge and screen-reader text; own last message prefixed; "my report"; a hidden and a deleted report shown as not available; relative times (Macedonian plural "пред 31 минута") and a date for 12 days; clicking anywhere on a row opens the chat; a new message moves its conversation to the top with 1 unread and updates the summary; English texts and `/en` links; the other participant and a requester before the first message see only their own; empty state with a link to the reports; no overflow on mobile; no browser errors.
- **Production (2026-10-02):** deployed with P8.S4 (`7ae4ae4`); the P8.S3 browser check against Vercel passed 35/35 (details under P8.S4).

#### P8.S4 — Chat view with Realtime

- **Affects:** `(app)/messages/[id]/page.tsx`, `src/components/chat/{chat-view,message-bubble,message-composer}.tsx`, `src/actions/messages.ts` (`sendMessage`).
- **Verify:** two browsers exchange messages instantly; older messages load on scroll; long text wraps.
- **Implemented:** `src/app/[locale]/(app)/messages/[id]/page.tsx` (chat instead of the P8.S2 note, compact header with back link), `src/components/chat/{chat-view,message-bubble,message-composer}.tsx`, `src/actions/messages.ts` (`sendMessage`), `src/lib/chat.ts`, `sendMessageSchema` in `src/lib/validation/conversations.ts`, `getLatestMessages` in `src/lib/queries/conversations.ts`, `clockTime`/`previousDay` in `src/lib/dates.ts`, translations `Messages.chat`, `Messages.conversation.back`, `Errors.message_rate_limit`, `Validation.messageTooLong` (mk/en; the "coming soon" texts removed). No database change (P8.S1 enforces participants, sender, length, whitespace and the 30/min limit; `messages` was already in the Realtime publication). Design in §16.
- **Decisions:** no optimistic bubble: the text stays in the read-only field until the server has stored it (a failed send never loses it), then the stored row is shown at once; the older-page cursor is `created_at` only (`clock_timestamp()` makes equal times within a conversation practically impossible); times use `en-GB` digits in Europe/Skopje so server and browser render the same; the scroller is `min(40rem, 100dvh − 20rem)` tall so the composer stays in view on desktop and phones.
- **Verified:** 64 new unit/component tests (537 → 601): `@/lib/chat` (merge order/dedupe/offsets, Realtime payload checks and UTC fallback, page and catch-up queries, `hasMore`, errors), `sendMessageSchema` (trim, CRLF → LF, 2000 with a line break, whitespace only, ids), `clockTime`/`previousDay`, `sendMessage` (sender never from the form, validation before auth, banned, every error code, no raw text, logging), `MessageComposer` in jsdom (empty disabled, Enter/Shift+Enter/button, read-only while pending, no double send, error kept with the text, field error, counter without digit grouping, English) and `ChatView` in jsdom (sides, times, screen-reader senders, day labels mk/en, wrapping classes, beginning/empty states, subscription filter, catch-up after subscribing, Realtime append once and other conversations ignored, sent message merged with its echo, older page with the scroll position kept, retry, following at the bottom vs. "2 new messages", own message always followed, reconnecting note, read-only, channel removed on unmount). Lint, typecheck, Prettier, `npm run build` and `--webpack`. Browser check (production build on port 3100, headless Edge `mk-MK`, A at 1280 px and B at 390 px in separate browser contexts, temporary `chat4-*@findly.test` users, a report in Struga with no matches, a conversation with 120 messages over 2.5 days and an empty one, all deleted afterwards): 55/55 — guests to login with `next`; header, report link, `noindex`, note gone; newest 50 in order on both sides, own on the right, `HH:MM` in Macedonia, day separators ending with "Денес", opened at the bottom, composer visible without page scrolling (desktop and mobile); scrolling up loads 50 + 20 older messages keeping the view, then "Почеток на разговорот", 1…120 without gaps; B's message reaches A in about 1 s over Realtime (left side, current time; Realtime sends `created_at` with an offset), A scrolled up gets "1 нова порака" and the button scrolls down; no duplicate from the echo, one row; Shift+Enter keeps the line break on the other side; trimmed; whitespace only disabled; 2000 characters (counter, no 2001st) and 2000 with a line break stored with `\n`; long text wraps without horizontal overflow on desktop and mobile; the 31st message in a minute is refused with the Macedonian rate-limit message, the text kept, no raw database text; a message sent while A was offline appears once after reconnecting (headless Edge kept the socket, so the reconnecting note did not show); reload shows the live messages; the empty conversation's state is replaced by the first message; someone else's chat is 404; a banned user reads without a composer; English texts; back link to `/messages`; no browser errors. Found and fixed during the check: line breaks were stored as `\r\n` (form data), which would also have made a 2000-character message with line breaks too long; the composer sat partly below the fold on a 1280×900 desktop.
- **Production (2026-10-02):** `7baa745`, `6129c41`, `7ae4ae4` pushed to `main` as a fast-forward (`e449c06..7ae4ae4`, no rewrite; P8.S1, the F-31 fix, the conversation limit and P8.S2 were already on `origin/main` since 2026-10-01). The three commits change only docs, translations and the P8.S3/P8.S4 app code and tests (no migrations; all 20 migrations already applied on the hosted project). Deployment confirmed by the served code, not only HTTP 200: a signed-in, uncached render (`X-Vercel-Cache: MISS`, `fra1`) of a temporary conversation contains the P8.S4 chat markup, which exists only from `7ae4ae4`, the tip of `main` (the Vercel CLI is logged out and `gh` is not installed, so the deployment's commit is inferred from that markup). Browser checks against https://findly-web-nine.vercel.app (headless Edge `mk-MK`, temporary `chat-*`/`list-*`/`chat4-*@findly.test` users and reports in Struga with no matches, all deleted afterwards; 0 matches or notifications created): P8.S2 contact 45/45 and stale pages 10/10, P8.S3 list 35/35, P8.S4 chat 55/55 (B → A in about 0.4 s over Realtime; same assertions as the local run, desktop 1280 px and mobile 390 px, mk/en). The only console error was the expected 404 of the stranger check, which the scripts count separately. The conversation list has no paging by design (§16), so there was none to check. The offline step passed by catch-up; headless Edge kept the socket open, so the "reconnecting" note was not seen in a browser (covered by component tests). No problems found.

#### P8.S5 — Read state and unread badge — `COMPLETED`

- **Verify:** opening a chat clears its unread count; the header badge updates.
- **Implemented:** `markConversationRead` and `markConversationReadSchema`, mark-read logic in `ChatView` (`MARK_READ_DELAY_MS`), `readAt` on `ChatMessage`, `unreadFrom`/`fetchUnreadMessageCount`/`MESSAGES_READ_EVENT`/`MESSAGES_CHANGED_EVENT` in `src/lib/chat.ts`, `getUnreadMessageCount`, `src/components/chat/{messages-link,use-unread-messages,refresh-on-messages}.tsx|ts`, `SiteHeader` renders `MessagesLink` (both counts loaded in parallel), `RefreshOnMessages` on `/messages`, translation `Header.messagesLabel` (mk/en; the unused `Header.messages` removed). No database change (`mark_conversation_read()`, the `read_at` grant and Realtime for `messages` exist since P8.S1). Design in §16.
- **Decisions:** reads are marked from the browser through a Server Action (writes only through actions), never while rendering the page (prefetches would mark chats read); only in a visible tab, so a chat left open in a background tab keeps new messages unread; the header hook is the only all-messages subscription and the list follows it through a window event; `markConversationRead` does not call `refresh()` (it would re-render the open chat with every incoming message) — `/messages` is dynamic, so opening it renders fresh, and the list re-renders on Realtime events (also after the browser's back button, checked).
- **Verified:** 26 new unit/component tests (601 → 627): `unreadFrom`, Realtime `read_at`, `fetchUnreadMessageCount` (head count, filters, null, errors), `markConversationRead` (RPC arguments, count, invalid id before auth, hidden and logged errors), `ChatView` read state in jsdom (marks on opening and dispatches the event; nothing when only own or read messages; one request for two arrivals, none for own; waits for a visible tab; arrivals during a request get a second one; failure: no event, no loop; nothing after unmount), `MessagesLink` (link, badge from the server, 0/null hidden, 99+, mk/en labels with plurals, subscription filters, catch-up on subscribe, one reload per burst plus `MESSAGES_CHANGED_EVENT`, reload on `MESSAGES_READ_EVENT` without telling the page, last count kept on errors, hidden for another session and on sign-out, channel removed) and `RefreshOnMessages`. Lint, typecheck, Prettier, `npm run build` and `--webpack`. Browser check (production build on port 3100, headless Edge `mk-MK`, temporary `chat5-*@findly.test` users A (desktop), B and C (390 px), one report in Struga with no matches, two conversations with 3 + 2 unread for A and 1 for C, deleted afterwards): 26/26 — guests have no link; header badge 5 and label "Пораки, 5 непрочитани" from the server; list 3 and 2; opening c1 drops the badge to 2 and marks only B's messages in c1 (C's and A's own untouched); back link and the browser's back button both show the list read; B's new message while A is on `/messages` shows badge 1 and moves c1 to the top with 1 unread; a second tab of A on `/map` follows the read made in the first tab (Realtime UPDATE); with the chat open, a new message is marked read at once and no badge appears; B has no badge; mobile header link visible without overflow; English label "Messages, 1 unread"; a banned user's messages stay unread and the badge stays, after unbanning opening the chat clears it; a stranger gets 404 and nothing is marked; no browser errors. Regression: the P8.S4 chat check 55/55 and the P8.S3 list check 36/36 locally (its expectations updated for P8.S5: the header label now carries the count, and the conversation it opens is read afterwards, so the summary shows 2 instead of 3 unread conversations; plus a check that it is read).

- **Fix F-33 (2026-10-02):** after reading a chat (or sending in it) and pressing the browser's Back button, `/messages` showed the old unread badge and last message. Root cause: Back/Forward restores the list from the client router cache without a server request, and `RefreshOnMessages` only listened for `MESSAGES_CHANGED_EVENT` while mounted; the read's events were handled while the chat was shown, so the restored list refreshed only if a Realtime event happened to arrive after the navigation. Fix: a per-tab messages version in `@/lib/chat` (`noteMessagesChanged`, `currentMessagesVersion`), bumped by `useUnreadMessages` on every Realtime event and by `ChatView` after a successful read and after a sent message; `RefreshOnMessages` stores the version each rendering showed under `router.bfcacheId` (Next.js 16: new for fresh visits, kept by Back/Forward and `refresh()`) and refreshes a restored list once when it is older. No new Realtime channel. Files: `src/lib/chat.ts`, `src/components/chat/{refresh-on-messages,chat-view,use-unread-messages}.tsx|ts` and their tests. Verified: 7 new tests (640 → 647; the three Back-restore tests fail on the old component), the three chat test files 20 runs without a failure; browser regression `bc_back` (headless Edge, 4 rounds each of read → Back and send → Back, Back only after the read and Realtime settled for 3 s, so no late event can help): old build 7/13 (every Back check failed), fixed build 25/25 three times; request count: fresh visit 1 request, Back without changes 0, Back after a read exactly 1 refresh. Regressions on the fixed build: P8.S5 26/26 three times (the Back check that failed before), P8.S6 33/33, P8.S4 55/55, P8.S3 36/36. Lint, typecheck, Prettier, 647 unit tests, `db:test` 18/18, `npm run build` and `--webpack`. Temporary `chat4-*`/`list-*`/`chat5-*`/`chat6-*@findly.test` data deleted.

#### P8.S6 — Message notifications — `COMPLETED`

- **Depends on:** Phase 7.
- **Verify:** one unread notification per conversation, not one per message.
- **Implemented:** migration `20261002170959_message_notifications.sql` (unique index `notifications_message_conversation_key`, triggers `messages_notify`, `messages_read_notifications`, `conversations_delete_notifications`; functions in `private`, not executable by API roles), SQL tests `supabase/tests/message_notifications.sql`; `src/lib/notifications.ts` (`conversationId`/`senderId` in the data, `sender`/`conversationId` on the view, sender names from `profiles`, chat link, `isConversationPath`), `NotificationEntry` (chat icon, "Од {name}"), `useNotifications` (no toast for the open chat, reload on `MESSAGES_READ_EVENT`), translations `Notifications.message.from` and a `Notifications.empty` that mentions messages (mk/en). Types unchanged (schema `private`). Design in §15.
- **Decisions:** one notification row per recipient and conversation, replaced (delete + insert) by the first message after it was read, so every new batch of messages is a real insert with one toast and the list does not grow with a long chat; the notification time is the first unread message of the batch; reading the chat reads the notification (database trigger, so it follows every way of reading), not the other way round; no toast for the chat on screen (it is read at once), decided in the browser from the Realtime row.
- **Verified:** migration and tests dry-run together in a rolled-back transaction (a deliberately wrong assert fails the run), also with `messaging.sql`, `conversation_limit.sql`, `notifications.sql` and `match_notifications.sql`, then pushed; `db:test` 18/18; `message_notifications.sql`: starting a conversation notifies nobody; the first message notifies only the recipient with ids-only data; two more keep the same unread row unchanged; a reply notifies the other side; separate rows per conversation; RLS (own rows only, no insert); `mark_conversation_read` marks only that conversation's notification read, the other side's stays; the next message creates a new unread row; partly read stays unread, all read (direct update) reads it, marking a message unread keeps it read; a notification read by hand is renewed by the next message; a rolled-back or rejected message leaves nothing; a banned recipient is notified and their reading marks nothing; without its item the data has no `item_id`; a second message notification per conversation is rejected; deleting an account removes the other side's notification; API roles cannot execute the functions. Advisors: only F-12/F-19. 13 new unit/component tests (627 → 640): data parsing, views (sender, report gone, only for the message type), chat link, `isConversationPath` (both locales, other pages/ids, regex-safe), sender query (public columns) and its error, bell entries mk/en (sender, report, link, missing parts), no toast for the open chat but for another chat, a hidden tab and another page, reload on `MESSAGES_READ_EVENT`. Lint, typecheck, Prettier, `npm run build` and `--webpack`. Browser check (production build on port 3100, headless Edge `mk-MK` with background timer throttling off so the second window keeps running, temporary `chat6-*@findly.test` users A (1280 px) and B (390 px), one report in Struga with no matches, deleted afterwards): 33/33 — B's first message gives A bell badge 1 and one toast over Realtime, one unread row with ids only, none for B; two more: same row, badge 1, no new toast (messages badge 3); panel entry "Нова порака", "Од Бојан Тест", report, link to the chat; following it opens the chat and clears both badges, notification and messages read; a reply while B has the chat open: no toast, notification read at once; same for A with the chat open (new row, read); A on `/map`: toast and badge again; `/notifications` lists it with sender and link; opening the chat from `/messages` clears the bell without reload; B on `/en/items` (mobile): English toast and entry "New message", "From Ана Тест", panel inside the viewport; no browser errors. Regression: the P8.S5 read check 25/26 — "browser back shows the list read" failed 3 of 3 runs; a build of the previous commit failed it 1 of 2 against the same database, so it is a pre-existing timing dependence (F-33), not caused by this step. The P8.S3/P8.S4 regressions were not re-run (no change to the list or chat code).
- **Review (2026-10-02, with the F-33 fix):** migration and code re-read as a whole. Links: `notificationHref` sends every message notification with a conversation id to `/messages/<id>` (bell and `/notifications`, also without the report). Read: `messages_read_notifications` follows every update of `messages` (the RPC and direct updates), marks only the recipient's notification and only when nothing from the other side is unread; a message arriving during a read either keeps it unread (the read's check sees the committed message) or makes it unread again (the insert's `on conflict … do update` waits for the read's row lock). No repeat per message: the unique index plus `on conflict` keep one row per recipient and conversation (SQL tests; browser: three messages, one row, one toast). Re-ran the P8.S6 browser check 33/33 on the fixed build. No change needed.
- **Note:** the migration is live on the hosted project while the app on Vercel is still P8.S4: until P8.S5/P8.S6 are pushed, production's bell shows message notifications as "Нова порака" linking to the report instead of the chat.

**Definition of done — Phase 8:** real-time chat per item, secure (RLS tests), with unread state and notifications.

**Deployment (Phase 8).** Phase 8 is deployed to production (2026-10-03): `2e3666c`, `8e2f7c5`, `c44877a`,
`defcc18`, `903553d` (F-33 fix) and `a62c026` (conversation times) pushed to `main` as
a fast-forward (`7ae4ae4..a62c026`, no rewrite); Vercel serves `a62c026`. Confirmed by
markup only that commit renders: a signed-in, uncached render of `/messages`
(`X-Vercel-Cache: MISS`, `fra1`) carries `ConversationTime`'s `serverNow` prop and the
P8.S5 header badge. All 21 migrations were already applied (P8.S6 since 2026-10-02).
Smoke tests against https://findly-web-nine.vercel.app (headless Edge `mk-MK`, desktop
and mobile, temporary `@findly.test` users deleted afterwards): conversation list
36/36, chat 55/55, message notifications and sending 33/33, read state and header
badge 26/26, F-33 read → Back (also after a hard refresh) 25/25, timestamps mk/en
without hydration errors or `useNow` warnings in the browser 9/9. After Back the
restored list shows the old unread count for about 0.2 s until its refresh arrives
(the header badge is already right); accepted.

Open manual items:

- Set the minimum password length to 8 in the Supabase dashboard (F-07).
- Decide on locale detection (F-13).
- Optional: leaked password protection (F-19).
- Optional: load the matching demo data on the dev project (it would appear on the
  public site; P6.S6).

---

### Phase 9 — Favorites — `COMPLETED`

#### P9.S1 — Favorites schema — `COMPLETED`

- **Affects:** migration `*_favorites.sql`; `search_items` returns `is_favorite`.
- **Verify:** SQL tests: only own favorites visible/changeable.
- **Implemented:** migration `20261003144124_favorites.sql` (table, indexes, RLS,
  grants; `search_items` recreated with the same arguments and `is_favorite boolean`
  after `distance_m`), SQL tests `supabase/tests/favorites.sql`, column lists in
  `search_items.sql`/`search_items_radius.sql` updated, `src/types/database.ts`
  regenerated. The app does not read `is_favorite` yet (P9.S2). Design in §17.
- **Decisions:** `anon` gets `select` on `favorites` (with no policy, so no rows)
  because `search_items` is `security invoker` and visitors call it; adding a
  favorite requires `can_write()` (banned users cannot add, but can remove) and a
  visible item that is not hidden, checked in the insert policy; own items may be
  saved (the UI decides whether to offer it).
- **Verified:** migration and the favorites/search/bounds tests dry-run together in
  rolled-back transactions (a deliberately wrong assert fails the run), then pushed;
  `db:test` 19/19. `favorites.sql`: defaults, duplicate and unknown item/user
  rejected, indexes; visitors see no rows, cannot add/remove, `is_favorite` false
  and never null; A sees only own, adds resolved and own items, cannot add for B, a
  hidden or unknown item, cannot update, cannot remove B's rows, removes own;
  `search_items` flags exactly the user's favorites; B does not see who saved B's
  items and cannot save an own hidden item; admins see/remove nothing and cannot
  save hidden items; banned users cannot add but remove; deleting an item or an
  account removes its favorites. REST as a visitor: `search_items` returns
  `is_favorite: false`, `favorites` returns `[]`. Advisors: only the known
  `current_profile` warnings and F-19. Lint, typecheck, 654 unit tests,
  `npm run build`.

#### P9.S2 — Favorite toggle — `COMPLETED`

- **Affects:** `src/components/favorites/favorite-button.tsx`, `src/actions/favorites.ts`, item card and item page.
- **Verify:** optimistic toggle; guests redirected to login.
- **Implemented:** `addFavorite`/`removeFavorite` (`src/actions/favorites.ts`,
  `favoriteSchema` in `@/lib/validation/favorites`), `FavoriteButton` (variants
  `icon` for cards, `full` for the item page; `aria-pressed`; error toast and
  rollback on failure), `ItemSummary.isFavorite` mapped from `search_items` in
  `searchItems()`, `ItemCard` prop `favorite={{ signedIn }}` (feed `/items` and home
  page), `isFavorite()` in `@/lib/queries/favorites` for the item page, messages
  `Favorites` and error `favorite_unavailable` (mk/en).
- **Decisions:** the item page shows no button to the owner or on a hidden report
  (the database refuses hidden ones; admins see hidden reports); cards show it on
  every report because `search_items` returns no owner (saving own reports is
  allowed, P9.S1). The dashboard (own reports) shows no heart. Guests' login link
  returns to the report, not the feed. No success toast: the heart is the feedback.
- **Verified:** lint, typecheck, 675 unit tests (658 → 675: actions, button,
  `searchItems` mapping), `npm run build`, Prettier. Headless Edge against
  `next start` (mk-MK, temporary `@findly.test` user created with SQL and deleted
  afterwards) 19/19: guests see login hearts on the feed and the item page, the
  link goes to `/login?next=/items/<id>` and signing in returns to the report;
  signed in, the item page button turns "Зачувано" at once, stays after the action
  and after reload; the feed card shows it saved, un-saves at once without
  navigating, stays un-saved after reload; home page hearts save and un-save (en
  label "Save to favorites"); no hearts on the dashboard; no console errors.
  Advisors: only the known `current_profile` warnings and F-19.
- **Production (2026-10-04):** `f3e30e7` (P9.S1), `32f05dc` (F-34) and `a165b1d`
  (P9.S2) pushed to `main` as a fast-forward (`7180792..a165b1d`, no rewrite).
  Deployment confirmed by the served code: an uncached render (`X-Vercel-Cache:
MISS`, `fra1`) of `/items` contains the guest heart links, which exist only from
  `a165b1d`. All six item pages linked from the feed return 200 in mk and en (they
  returned 500 since the P9.S1 migration, F-34). Headless Edge against
  https://findly-web-nine.vercel.app (temporary `@findly.test` user, deleted
  afterwards; no favorites left) 60/60: guest heart → login → back to the report
  (mk/en); save and remove on the item page, `/items` and the home page, each
  optimistic, without navigation and kept after reload (mk/en); the item page agrees
  with the feed; no favorite UI on the dashboard; no console errors.

#### P9.S3 — Favorites page — `COMPLETED`

- **Affects:** `(app)/favorites/page.tsx`, `messages/*.json` (`Favorites`).
- **Verify:** hidden/deleted items disappear from the list.
- **Implemented:** `/favorites` page (title, description, ICU count, card grid,
  `Pagination`, canonical `?page=` like `/notifications`, empty state with a link to
  `/items`, error alert when the query fails); `getFavoritePage` and
  `FAVORITES_PAGE_SIZE` in `@/lib/queries/favorites`; `itemCardColumns` exported
  from `@/lib/queries/items`; `parsePage` moved from the notifications page to
  `@/lib/pagination` (shared, behavior unchanged); "Favorites" entry with a heart in
  the user menu; messages `Favorites.page.*` and `Header.favorites` (mk/en). No
  migration (`/favorites` was already in `PROTECTED_PREFIXES` and `robots.txt`).
- **Decisions:** newest saved first, no filters or other sorts; removal on the page
  is immediate without an undo toast (the report can be saved again from its
  page); menu link only, no header icon; resolved reports stay listed with their
  badge.
- **Verified:** lint, typecheck, 695 unit tests (675 → 695: `getFavoritePage` query
  shape, later page, past-the-end count, errors, mapping; `isFavorite`;
  `parsePage`), `npm run build`, Prettier; the query checked against the live REST
  API. Headless Edge against `next start` (temporary `fav-p9s3-*@findly.test`
  users with 23 found reports in Struga, 0 matches; all deleted afterwards, nothing
  left) 41 checks: guests → login with `next` (mk/en, with `?page=2`); `robots.txt`;
  empty state mk/en, `noindex`, browse link; menu link; 21 favorites → 20 newest
  first on page 1, count, pressed hearts, page 2 link; `page=1`/`abc`/unknown
  parameters/past the end redirect to the canonical URL; removing the only card on
  page 2 lands on page 1; removing on page 1 drops the card and the count, also
  after reload; saved on an item page → first; own report listed while active, gone
  once hidden; another hidden and a deleted report gone, resolved listed with its
  badge, count 18 while the hidden favorites stay in the table; unsaving on the item
  page and going Back shows the updated list (no stale router cache); English title,
  count and labels; 390 px without horizontal overflow; no console errors. One
  assertion of the script was wrong, not the page: Macedonian plurals put 21 in the
  `one` category, so "21 зачувана пријава" is correct.

**Definition of done — Phase 9:** favorites tied to the account and consistent across devices.

---

### Phase 10 — Admin and moderation — `COMPLETED`

#### P10.S1 — Reports schema and admin policies

- **Affects:** migration `*_moderation.sql` (enums, `reports`, admin policies on reports/categories/profiles — item admin policies already exist since P3.S1, and `deleteItem` already works for admins (P3.S7), `admin_set_banned()`, `admin_stats()`, moderation notification trigger).
- **Verify:** SQL tests: non-admins cannot read others' reports or call admin RPCs; banned user cannot insert anything.
- **Implemented:** migration `20261004150645_moderation.sql` (details in §9
  `reports` and §18), SQL tests `supabase/tests/moderation.sql`,
  `src/types/database.ts` regenerated. No app code yet (P10.S2+).
- **Decisions:** reporting needs another user's item that is visible and not
  hidden (resolved items can be reported); profiles get no admin update policy:
  `role`/`is_banned` change only through `admin_set_banned()` (the first admin is
  still set with SQL); the categories' admin policies are added here, the UI comes
  in P10.S6; hidden items keep `resolved_at` (`items_set_resolved_at` replaced) so a
  restore can return to the previous status; restoring also notifies the owner
  (§18 only required hiding). No daily limit on reports (one open report per user
  and item; revisit in P10.S2 if abuse shows).
- **Verified:** migration and every SQL test file dry-run together in rolled-back
  transactions first (all 20 passed; a deliberately wrong assert fails the run).
  The dry runs found two bugs, fixed before the push: whitespace-only details
  (`btrim` keeps newlines/tabs; now `~ '[^[:space:]]'` as in `messages`) and the
  resolution trigger undoing `on delete set null` of `resolved_by` (it now runs
  only on `status` changes). Pushed; `db:test` 20/20. `moderation.sql`: defaults,
  one open report per user and item, closed reports allow a new one, inserts always
  open, details limits, unknown item, indexes, cascades from item and reporter,
  deleting the admin keeps the report; visitors read no reports, file none, call no
  admin RPCs, add no categories but read them; users file reports (also about
  resolved items) but not about hidden or own items, not for others and not with a
  status, see only their own, cannot change status/reason or delete, cannot call
  admin RPCs or change categories; owners do not see reports about their items;
  banned users cannot insert reports, items, item images, favorites,
  conversations, messages or storage objects, nor update their profile; admins
  see all reports, resolve/reopen/dismiss (resolver and time recorded), change
  nothing else, cannot report their own items, add/rename/reorder/delete unused
  categories but not one in use; `admin_set_banned` bans (the next write is
  blocked at once) and unbans, refuses self, other admins and unknown users;
  `admin_stats` numbers compared before/after the test data; hiding notifies the
  owner once and keeps `resolved_at`, restoring to active/resolved notifies and
  keeps the original time, owner status changes and an admin's own item add none,
  others do not see them. REST as a visitor: `reports` and `rpc/admin_stats` →
  42501, categories still readable. Advisors: the `current_profile` warnings, two
  new intended ones for the admin RPCs (F-12) and F-19. Lint, typecheck, 695 unit
  tests, `npm run build`.

#### P10.S2 — Report item UI

- **Affects:** `src/components/moderation/report-dialog.tsx`, `src/actions/reports.ts`.
- **Verify:** one open report per user per item; confirmation shown.
- **Implemented:** `reportItem` (`src/actions/reports.ts`; `reportItemSchema` in
  `@/lib/validation/reports`: reason from `REPORT_REASONS`, optional details with
  line breaks normalized, trimmed, blank → null, ≤ 500; `23505` →
  `report_duplicate`, `42501` → `report_unavailable`, `refresh()` on success);
  `hasOpenReport` (`@/lib/queries/reports`); `ReportDialog`
  (`src/components/moderation/`) on the item page for the same reports as the
  favorite button (others' reports that are not hidden): a ghost "Flag this report"
  button opens a dialog (5 reasons as required native radios, details textarea);
  success closes it with a toast and the refreshed page shows "You flagged this
  report" instead of the button; guests get a login link back to the report.
  shadcn `dialog` added (`src/components/ui/dialog.tsx`). Messages: `Moderation.report`,
  `Errors.report_duplicate`/`report_unavailable`, `Validation.reportReasonInvalid`/
  `reportDetailsTooLong`. No migration.
- **Decisions:** the UI calls it "flag" ("Flag this report" / "Пријави
  неправилност") because item reports are already called "reports"/"пријави". The
  form mounts inside the dialog, so reopening it starts clean. A closed (resolved or
  dismissed) report shows the button again (the database allows a new one). Still
  no daily limit on reports (§22 P10.S1).
- **Verified:** 22 new unit/component tests (695 → 717): schema (every reason,
  blank details → null, line-break normalization at the limit, too long, invalid
  reason/item), action (inserts as the session user, `23505`/`42501`/other errors,
  field errors without a write), dialog (reasons required, sends item/reason/details,
  toast + close, error and values kept, field errors, note when reported, guest
  link). Lint, typecheck, `npm run build`. Browser check (production build, headless
  Edge, three temporary `rep-p10s2-*@findly.test` users, deleted afterwards): 24/24
  relevant checks — guest login link with `next`; no button for the owner or on
  one's own report; dialog with 5 reasons; submit without a reason blocked by the
  browser (nothing stored); Escape and Cancel close; a report with details is
  stored as the session user with trimmed `\n` details, toast shown, button
  replaced by the note (also after reload); a report filed meanwhile in "another
  tab" → `report_duplicate` in the dialog, values kept, still one open report; a
  dismissed report shows the button again; resolved reports can be flagged; a report
  hidden after the page loaded → `report_unavailable`; English at 375 px: dialog fits,
  reported; a banned user is refused; no browser errors. Two checks of the script
  were wrong, not the app: hiding/restoring the test item with SQL notified its owner
  (P10.S1 trigger, expected), and the page overflows by 14 px at 375 px with or
  without the dialog — the signed-in header, on every page (F-35).

#### P10.S3 — Admin area layout and dashboard

- **Affects:** `src/app/[locale]/admin/{layout,page}.tsx`, `messages/*.json` (`Admin`).
- **Manual:** make your account admin with SQL.
- **Verify:** non-admins get 404; stats are correct.
- **Implemented:** `src/app/[locale]/(app)/admin/{layout,page}.tsx` (inside the
  `(app)` group, unlike the planned `[locale]/admin/`: same URL, and it inherits
  `noindex` and the page padding). The layout calls `requireAdmin("/admin")` (404 for
  non-admins through `[locale]/not-found.tsx`, HTTP 404) and shows the
  "Administration" label and `AdminNav` (`src/components/admin/`, tabs with
  `aria-current`; only "Overview" until P10.S4–P10.S6 add their sections). The page
  checks `requireAdmin()` again (layouts do not re-run on navigation) and shows the
  nine numbers of `admin_stats()` in four groups (users, reports, matching,
  moderation) as tiles, formatted on the server; a failed query shows a message.
  Reads: `getAdminStats()` (`@/lib/queries/admin`). The user menu has an
  "Administration" link for admins (`UserMenu isAdmin`, from `SiteHeader`).
  Messages: `Admin`, `Header.admin`. `/admin` was already in `PROTECTED_PREFIXES`
  and `robots.txt` (P2.S3). No migration.
- **Manual (done 2026-10-05):** the project owner's Google account
  (`petrovblaze48@gmail.com`) was made admin with SQL in the dashboard.
- **Verified:** 4 new unit/component tests (717 → 721): `getAdminStats` (row,
  error), `AdminNav` (current section, other pages, both languages). Lint, typecheck,
  `npm run build`. Browser check (production build, headless Edge, a temporary admin
  and a regular `adm-p10s3-*@findly.test` user, deleted afterwards): 22/22 — guests on
  `/admin` and `/en/admin` → login with `next=/admin`; robots disallows both; a
  regular user gets HTTP 404 with the not-found page and no admin UI, and no menu
  link; the admin reaches `/admin` from the user menu (title, h1, `noindex`, current
  tab); the nine tiles equal counts computed independently with SQL; banning a user
  raises the banned count after a reload; removing the admin role gives 404 on the
  next request (the role is read per request); English at 375 px: two tile columns,
  the content does not overflow (the header still does, F-35); no browser errors.

#### P10.S4 — Reports queue and item moderation

- **Affects:** `admin/reports/page.tsx`, `src/actions/admin.ts`.
- **Verify:** hide/restore item; resolve/dismiss report; owner gets a moderation notification.
- **Implemented:** `src/app/[locale]/(app)/admin/reports/page.tsx` (calls
  `requireAdmin()`; canonical URLs: `?view=hidden`, `?page=` from 2, unknown
  parameters and pages past the end redirect) with two views (§18): open flags
  grouped by item (`getReportQueue`: the oldest `REPORT_QUEUE_MAX_REPORTS` = 500 open
  flags, grouped by `groupReports` from `@/lib/moderation`, 10 items per page; a note
  when the limit cut the list) and hidden reports (`getHiddenItems`, 20 per page,
  `PGRST103` handled); both in `@/lib/queries/admin`, embeds name their foreign keys
  (`profiles!reports_reporter_id_fkey`, `profiles!items_user_id_fkey`). Actions
  `hideItem`/`restoreItem`/`closeReports` (`src/actions/admin.ts`, schemas in
  `@/lib/validation/admin`, `refresh()` on success, `not_found`/`database` errors);
  buttons in `ModerationActions` (`src/components/admin/`: hide with a confirmation
  dialog, resolve/dismiss with the number of flags, restore; toasts). "Flags" tab in
  `AdminNav`. Moderation notifications show what happened (§15). Messages:
  `Admin.nav.reports`, `Admin.reports`, `Admin.moderation`,
  `Notifications.moderation.item_hidden`/`item_restored`; reasons reuse
  `Moderation.report.reasons`. No migration (admins already update `items.status`
  and `reports.status` through RLS since P3.S1/P10.S1).
- **Decisions:** the queue acts per item on the flags shown (no per-flag buttons);
  hiding resolves them, "dismiss" closes them without touching the report; for an
  item that is already hidden the queue offers "resolve" instead of "hide".
  Restoring lives in the hidden view (the item page gets no admin controls). The
  queue loads at most 500 open flags instead of paging in SQL (no RPC; plenty for
  this project). Entries use `overflow-wrap: anywhere` so long unbroken words in
  details or names cannot widen the page.
- **Verified:** 32 new unit/component tests (721 → 753): schemas, `groupReports`,
  `restoredStatus`, `parseModerationAction`, actions (hide + resolve, already hidden,
  not found, errors, restore to active/resolved, not hidden, close only the open
  flags shown), queries (grouping, paging, limit, errors, `PGRST103`),
  `ModerationActions` (confirmation, counts, toasts, errors), `AdminNav`, bell entries
  for both actions. Lint, typecheck, `npm run build`. Browser check (production build,
  headless Edge, temporary `mod-p10s4-*@findly.test` admin, owner and two flaggers,
  deleted afterwards): 41/41 — guest → login with `next`; regular user 404; tab from
  the dashboard, title, `noindex`; groups ordered by oldest flag with count, reasons,
  details (line breaks kept), reporters, owner and status badges; hide: Cancel changes
  nothing, confirm hides, resolves both flags (resolver = admin), notifies the owner
  once, toast, group leaves the queue; dismiss closes only the flag shown (a flag
  filed meanwhile stays open and appears after the refresh); resolve on an already
  hidden item keeps it hidden; hiding a resolved item keeps `resolved_at`; hidden
  view lists them, restore returns to active / resolved with the original time;
  owner notifications (3 hidden, 2 restored) and `/notifications` texts and link;
  canonical redirects (5); empty queue message; English at 375 px: no overflow (after
  the `overflow-wrap` fix; the first run found a long word widening the page), dialog
  fits; no browser errors. No migration, so no advisor run.

#### P10.S5 — User management

- **Affects:** `admin/users/page.tsx`.
- **Verify:** banning blocks writes immediately; the banned user sees a banner.
- **Implemented:** migration `20261005195331_admin_users.sql` (`admin_list_users()`,
  §18), SQL tests `supabase/tests/admin_users.sql`, types regenerated.
  `src/app/[locale]/(app)/admin/users/page.tsx` (`requireAdmin()`; `next/form` GET
  search with `q` and a "Banned only" checkbox `banned=1`; canonical URLs through
  `parseUserFilters`/`userListQuery` in `@/lib/validation/admin`; pages past the end
  redirect): rows with avatar, name, email, badges (You, Admin, Banned), joined and
  last sign-in dates (server-formatted), number of reports and open flags, and
  `BanButton` (`src/components/admin/`; ban after a confirmation dialog, lift without;
  toasts) for users that are neither admins nor the viewer. Reads: `getUserPage`
  (`@/lib/queries/admin`, 20 per page; total of an empty page from a one-row first
  page). Action `setUserBanned` (`src/actions/admin.ts`, `setBannedSchema`; `42501` →
  `forbidden`, `P0002` → `not_found`, `refresh()`). Banner: `BannedNotice`
  (`src/components/layout/`, in the locale layout under the header). "Users" tab in
  `AdminNav`. Messages: `Admin.nav.users`, `Admin.users`, `Moderation.banned`.
- **Decisions:** a migration was needed although §22 listed only the page: the
  list needs columns admins cannot read through the API, and the email (shown only to
  admins) identifies accounts with similar names. Banning does not hide the user's
  reports (the dialog says so; hide them in the queue if needed). The banner appears
  on the next request after a ban (the database refuses writes at once).
- **Verified:** migration and SQL test dry-run together in a rolled-back
  transaction (a deliberately wrong assert fails the run); pushed; `db:test` 21/21
  (`admin_users.sql`: visitors and users refused; email and Cyrillic name search,
  case-insensitive, `%`/`_` literal; newest first; columns and counts (closed flags
  not counted); banned filter; paging with total, past the end; invalid pages; blank
  search lists everyone; a ban shows in the list and blocks the next write, an unban
  allows it; `is_banned` still not readable through the table). Advisors: one new
  intended warning for `admin_list_users` (as the other admin RPCs, F-12), plus the
  known ones. 14 new unit/component tests (753 → 767): schemas and URL helpers, action
  (ban/unban, refusals, invalid input), `getUserPage` (mapping, nullable columns, empty
  page total, errors), `BanButton`, `BannedNotice`, `AdminNav`. Lint, typecheck,
  `npm run build`. Browser check (production build, headless Edge, temporary
  `usr-p10s5-*@findly.test` users, deleted afterwards): 40/40 — guest → login with
  `next`; user 404; tab, title, `noindex`; count equals all profiles; search trimmed
  and canonical, newest first; badges; no ban button for self or other admins; counts;
  Cyrillic name search; banned-only filter and checkbox state; empty result; 5
  canonical redirects; ban: Cancel keeps the user, confirm bans (row, toast,
  database); the user's open session is refused at the next write (favorite) and sees
  the banner after a reload on every page; unban removes the banner and writes work
  again; banning a user who became admin after the page loaded is refused (database
  unchanged); English at 375 px: no overflow, dialog and banner fit; no browser errors.

#### P10.S6 — Category management

- **Affects:** `admin/categories/page.tsx`, categories policies.
- **Verify:** add/rename/reorder; a category in use cannot be deleted.
- **Implemented:** migration `20261005204612_category_management.sql` (§9
  `categories`), SQL tests `supabase/tests/categories.sql`, types regenerated.
  `src/app/[locale]/(app)/admin/categories/page.tsx` (`requireAdmin()`) renders
  `CategoryManager` (`src/components/admin/`: list in display order with icon, both
  names, slug, number of reports and "required for matching" for `other`; up/down
  buttons with `useOptimistic`; edit dialog; delete with confirmation, disabled for
  `other` and categories in use; "Add category" dialog) and `CategoryForm` (slug only
  when adding; names; icon picker over `CATEGORY_ICONS`; values kept after errors).
  Reads: `getAdminCategories` (`@/lib/queries/admin`). Actions
  (`src/actions/categories.ts`, schemas in `@/lib/validation/categories`, `refresh()`):
  `createCategory` (sort order after the last), `updateCategory`, `deleteCategory`,
  `reorderCategories`; errors `category_slug_taken` (`23505`), `category_in_use`
  (`23503`), `category_protected` (`FL409`), `category_list_changed` (`22023`).
  `CategoryIcon` gained 16 icons; `getCategories` also orders by id. "Categories" tab
  in `AdminNav`. Messages: `Admin.nav.categories`, `Admin.categories`, four `Errors`,
  three `Validation` keys.
- **Decisions:** slugs are fixed after creation (enforced by revoking the column
  privilege, not only in the UI); `other` is protected in the database; reordering
  sends the full list to one RPC (atomic, refuses a stale page) instead of swapping
  two rows; both new functions are security invoker (RLS applies, no advisor
  warning). Icons are limited to a fixed list so the bundle stays small.
- **Verified:** migration and SQL tests (`categories.sql` and `moderation.sql`)
  dry-run in rolled-back transactions (a wrong assert fails); pushed; `db:test`
  22/22 (`categories.sql`: visitors/users cannot call either function; counts include
  hidden items; slug update refused, names/icon change; reorder sets 10, 20, …;
  missing, duplicate, unknown and null lists refused and change nothing; `other`
  cannot be deleted by an admin or the table owner; a category in use cannot; an
  unused one can). Advisors: no new warnings. 25 new unit/component tests (767 →
  792): schemas, actions (sort order, error mapping, fields only), query, `moved`,
  `CategoryManager` (usage, delete availability, optimistic move and rollback,
  delete confirmation, add with an error and retry, edit without slug), `AdminNav`.
  Lint, typecheck, `npm run build`. Browser check (production build, headless Edge,
  temporary `cat-p10s6-*@findly.test` admin and user and `p10s6-*` categories; the
  original categories and order restored afterwards): 32/32 — guest → login with
  `next`; user 404; tab, title, `noindex`; list order, counts and delete availability
  equal the database; invalid slug shows a field error and keeps values; add stores
  the category last with a toast; duplicate slug (other case) gives a readable error;
  edit without slug stores name and icon; moving up twice stores the order (10, 20, …)
  and the public feed filter (guest, English) shows the new name in the new order; a
  category added meanwhile makes a reorder fail with a message and change nothing; a
  category in use cannot be deleted, one that became used after the page loaded is
  refused by the database; delete with confirmation; English at 375 px: content does
  not overflow (the admin tabs scroll sideways by design; the header's 14 px is F-35),
  dialog fits; no browser errors. One script error during the run: the public check
  first ran in the admin's context, and visiting `/en` set the locale cookie (F-13
  behaviour), so later Macedonian lookups failed; it now uses a guest context.

**Definition of done — Phase 10:** moderation loop (report → review → action → notification) works and is protected by RLS.

---

### Phase 11 — UI polish, testing and final delivery — `IN PROGRESS`

#### P11.S1 — Dark mode — `COMPLETED` (2026-10-11)

- **Affects:** `next-themes` `ThemeProvider` in the layout, theme toggle in the header.
- **Verify:** no flash of the wrong theme; toasts follow the theme.
- **Implemented:** `ThemeProvider` (`src/components/layout/theme-provider.tsx`, client wrapper of `next-themes`: `attribute="class"`, default `system`, `disableTransitionOnChange`; choice in `localStorage` key `theme`) around the locale layout's content; `<html suppressHydrationWarning>` (next-themes sets the `dark` class and `color-scheme` before hydration). Its inline script is the first element of `<body>`, so the class is set before any content is parsed; on the client it is rendered as `text/plain` (`scriptProps`), which avoids React's development warning about `<script>` in components (Next.js guide "Preventing Flash"). Theme choice: `ThemeMenuGroup` (`src/components/layout/theme-menu-group.tsx`): label + radio items Light / Dark / System (Sun/Moon/Monitor icons) in the account menu (`UserMenu`) between the links and "Sign out". The existing `Toaster` already reads `useTheme()`. Tokens: the dark `--ring` is now the primary violet (it was grey; light focus rings were already violet). Leaflet (F-28): in `.dark`, popups, the popup tip and close button, zoom buttons, the attribution and the map's background use the theme tokens (unlayered rules in `globals.css` with higher specificity than `leaflet.css`); OSM tiles are unchanged. Messages `Header.theme`, `Header.themes.{light,dark,system}` (mk/en).
- **Changed during implementation:** the toggle is in the account menu, not as a separate header button (the owner's choice), so guests always get the system theme. The light theme is unchanged: Leaflet overrides apply only in `.dark`; the audit found no other hard-coded light colours (white badge text on `bg-destructive` and the white marker borders stay readable in both themes).
- **Verified:** 4 new component tests (`theme-menu-group.test.tsx`: options and label in mk, stored theme checked, system before the theme is known, choice calls `setTheme`); 808 unit tests. Browser check (production build with `--webpack`, F-22; headless Edge, temporary `@findly.test` admin, deleted afterwards): 38/38 — server HTML has no theme class and an executable theme script; guest with OS dark → dark, OS light → light (white background unchanged); `<html>` already has `dark` when the header is parsed (system preference, stored choice, and in a new browser session) = no flash; `color-scheme: dark`; menu shows "Тема" with Светла/Темна/Системска, System checked by default; Dark → class + `localStorage`; persists after reload and in a new context; profile save toast has `data-sonner-theme="dark"`; dark mode on `/items`, `/notifications`, `/messages`, `/favorites`, `/admin` (+ reports, users, categories), `/items/new`, item page with the flag dialog; `/map` popup and zoom control use the popover colour in dark and stay white in light; System follows an OS change live; English labels Light/Dark/System; menu fits at 375 px without horizontal overflow; no console errors. Screenshots reviewed (header, menu, dashboard, profile, admin categories, dialog, map popup).

#### P11.S2 — Responsive, accessibility, error boundaries — `COMPLETED` (2026-10-12)

- **Affects:** `error.tsx`, `loading.tsx` per segment, focus states, labels, contrast.
- **Verify:** keyboard-only walkthrough; Lighthouse accessibility ≥ 90; 360 px width works.
- **Implemented:** Error boundaries: `src/app/[locale]/error.tsx` (client; inside the site layout, so header and translations work; title, explanation, the digest as "error code" (production hides server messages), "Try again" = `retry()`, link home; React `<title>`; logs the error) and `src/app/global-error.tsx` for errors of the locale layout itself (own `<html>`/`<body>`, `globals.css`, Inter, `ThemeProvider` so it follows the stored/system theme; texts inline, English for `/en` paths, Macedonian otherwise; plain `<a>` home). Messages `ErrorPage`, `PageLoading`, `Header.skipToContent`. `loading.tsx` (`PageLoading`: spinner + `role="status"`) only on signed-in pages that never redirect canonically or answer 404 (F-23): `/dashboard`, `/profile`, `/messages`; the list moved to `messages/(list)/` so its boundary does not wrap `/messages/[id]` (404 stays HTTP 404). Accessibility: skip link "Прескокни до содржината" as the first focusable element (off-screen until focused) to `<main id="main" tabIndex={-1}>`; light-theme contrast to ≥ 4.5:1 (`--primary`/`--ring` `oklch(0.55 0.23 281)`, `--muted-foreground` 0.53, `--lost` `oklch(0.54 0.18 41)`, `--found` `oklch(0.51 0.125 160)`; dark already passed); item page details `<dl>`: icon inside the `<dt>` (a group may only hold `dt`/`dd`); the mobile filter toggle checkbox is `lg:hidden` with its label (it was an invisible tab stop on wide screens); `UserAvatar` is `aria-hidden` (decorative initials). Responsive: header gaps `gap-2`/`gap-1` and locale links `px-1.5` below `sm` (F-35). F-30: `/map` popup dates (`MapPage.date` + `dayParts()` in `@/lib/dates`) and near-filter radii (`Search.near.km`) use messages instead of `Intl`. F-32: `itemSchema` normalizes description line breaks to `\n` before trimming and length checks.
- **Verified:** 814 unit tests (new `error.test.tsx` for `ErrorPage`/`PageLoading`; schema, `dayParts`, popup date and radius label assertions). Lint, typecheck, `npm run build` (Turbopack works locally again, F-22). Browser check (production build, headless Edge `mk-MK`, temporary `@findly.test` admin, deleted afterwards; a temporary throwing route and a header-triggered layout error, both removed before the commit): 122 checks — page error: HTTP 500, mk/en title, header kept, digest without the message, retry and home; client error: boundary, retry restores; layout error: `global-error` with HTTP 500, `lang`, Inter, Tailwind styles, light/dark from the OS; `/messages/[unknown]` still 404, `/notifications?page=999` and `/favorites?page=0` still 307; skip link first Tab, visible, moves focus to `main`, next Tab inside the page; keyboard walkthrough of 17 pages (home, feed, item, map, dashboard, new report, messages, notifications, favorites, profile, four admin pages, login/register/forgot password): every stop has a visible focus style and a name; account menu opens with Enter, arrows move, Escape returns focus; 360 px without horizontal scroll on 24 pages (signed-in, guest, mk/en), avatar inside the viewport; axe (WCAG 2 A/AA + best practice) clean on 40 page/theme combinations. Final build (hooks removed): 95/96 (the only failure is the console line of the intentional 404). Lighthouse accessibility (mobile): 22 runs, light and dark, guest mk/en and signed-in: 100 everywhere except `/map` 96 (`target-size`: two Leaflet markers overlap at country zoom; accepted). F-30 in Edge: radii "10 km", popup date "5.10.2026". Screenshots reviewed (360 px dashboard and item page, error pages, skip link).
- **Notes:** Lighthouse's unscored `label-content-name-mismatch` still names the account-menu button (it ignores `aria-hidden` on the initials); the initials are not a text label, so it stays. On a full load React reveals streamed content shortly after `load`: browser checks of pages with `loading.tsx` wait for their content, not only `load`.

#### P11.S3 — Performance pass

- **Affects:** images (`next/image` or pre-sized WebP), bundle (map only where used), client message namespaces (F-04).
- **Verify:** Lighthouse performance ≥ 85 on the feed and item page (mobile).

#### P11.S4 — End-to-end tests and CI

- **Affects:** `playwright.config.ts`, `e2e/*.spec.ts`, `.github/workflows/ci.yml`.
- **Verify:** E2E suite passes against a local build; CI green on push.

#### P11.S5 — Production environment

- **Sub-steps:** create the production Supabase project; push all migrations; configure auth (URLs, Google, SMTP, templates, password length); Vercel production env vars; set the admin account.
- **Verify:** full manual walkthrough on production in both languages.

#### P11.S6 — Demo data and defense preparation

- **Sub-steps:** demo accounts and realistic items; screenshots; ERD and architecture diagrams for the thesis; final update of this document and the README.
- **Verify:** demo scenario rehearsed end-to-end (lost report → match notification → chat → resolved).

**Definition of done — Phase 11 (project):** all phases complete · production
deployed and stable · tests and CI green · documentation final.

---

## 23. Audit log and known issues

### Audit 2026-09-24 (end of Phase 1)

**Audited:** git history and working tree; every tracked source file; migrations;
generated types; translations; `supabase/config.toml`; the hosted project
(migration history, extensions, data, grants, RLS behavior with an anonymous
insert attempt, auth settings endpoint, `db advisors`); built CSS.

**Result:** Phase 1 matches the planned architecture. Phase 2 has **not** been
started (no auth code or profile tables exist yet).

| ID   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Status        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| F-01 | next/font variable was named `--font-sans` while `@theme` also defined `--font-sans: var(--font-sans)` on `:root`. It only worked because unlayered CSS wins over the theme layer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Renamed the font variable to `--font-inter`; `--font-sans` now references it (AD-19).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Fixed         |
| F-02 | `supabase/config.toml` holds CLI defaults (`site_url` 127.0.0.1, confirmations off, password length 6) that differ from the hosted project.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Keep the file (the CLI needs it); it is not a source of truth. Never run `supabase config push` (§8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Documented    |
| F-03 | Supabase grants `anon`/`authenticated` all table privileges (INSERT, UPDATE, DELETE, …) on `public` tables by default; the anonymous insert into `categories` was stopped by RLS, not by privileges. The migration's `grant select` is therefore redundant.                                                                                                                                                                                                                                                                                                                                                                                                            | Keep defaults; RLS on every table is mandatory (§11), column grants where needed. Applied migration not edited.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Documented    |
| F-04 | `NextIntlClientProvider` sends all messages to the browser.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Fine while small; limit client namespaces in P11.S3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Open (P11.S3) |
| F-05 | The Supabase URL was configured with `/rest/v1/`, which broke all queries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Fixed in `.env.local`; `env.ts` now rejects URLs with a path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Fixed         |
| F-06 | Default branch is `main` (an earlier instruction said `master`). No GitHub remote yet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Use `main`; remote `origin` = github.com/BlagojPetrov/findly-web, pushed 2026-09-24.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Fixed         |
| F-07 | Hosted minimum password length is 6.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Raise to 8 in P2.S4.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Open (P2.S4)  |
| F-08 | Built-in Supabase email only delivers to project team members.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Custom SMTP (Brevo) configured in P2.S9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Fixed         |
| F-15 | Registration failed on the first attempt with `429 over_email_send_rate_limit` ("email rate limit exceeded"). Verified: one submit = one server action = one `signUp` call; no user created. Cause: the project-wide email quota of the built-in Supabase mailer (a few emails per hour for the whole project), not our code. Our code showed it as "too many attempts" and did not log it.                                                                                                                                                                                                                                                                            | Separate error code `email_rate_limited` with an accurate message; `authFailure()` now logs operational auth errors (rate limits, email failures, unknown) without the email address. Real fix: custom SMTP (P2.S9) and the email rate limit in Supabase → Authentication → Rate Limits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Fixed         |
| F-16 | "Register does nothing": after the account was deleted while the browser kept its session, the header (profile lookup) showed guest links but the proxy (JWT claims only — a JWT stays valid up to an hour) still treated the visitor as signed in and redirected `/register` and `/login` to `/`. Reproduced in the browser (RSC request `307 /register → /`).                                                                                                                                                                                                                                                                                                        | On `/login` and `/register` only, the proxy now also calls `getUser()` when claims exist and, on a definitive 401/403, clears the session (`signOut({ scope: "local" })`) and treats the visitor as a guest; network errors never sign anyone out. Other pages keep the fast claims check; protected pages still reach `/login` via `requireUser()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Fixed         |
| F-17 | Base UI logs "changing the default value state of an uncontrolled FieldControl" when a form keeps entered values after a failed submit (`defaultValue` changes). Submitting and the kept values work; it is a dev-console warning.                                                                                                                                                                                                                                                                                                                                                                                                                                     | Root cause: Base UI `FieldControl` (`useControlled`) reads `defaultValue` only on mount and warns when it changes; our forms refill values after a failed submit by passing a new `defaultValue` (`undefined` → entered value). `FormField` now keys the input on its `defaultValue`, so a new value remounts the input instead of changing it. Reproduced on the dev server before the fix (forgot-password, login) and gone after; kept values unchanged.                                                                                                                                                                                                                                                                                                                                                                                                            | Fixed         |
| F-18 | Google sign-in cannot pass our metadata, so a new Google user's profile gets `preferred_locale = 'mk'` whatever language they used, and their auth emails (templates read `.Data.locale`) are Macedonian.                                                                                                                                                                                                                                                                                                                                                                                                                                                              | The profile page (P2.S8) lets users choose the email language; `updateProfile` writes it to both `profiles.preferred_locale` and `user_metadata.locale` (read by the templates). New Google users still start with `mk` until they change it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Fixed (P2.S8) |
| F-09 | `supabase login` fails in non-interactive shells.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Run it in a normal terminal (documented in §8 and `CLAUDE.md`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Documented    |
| F-11 | `supabase migration new` names files with the **UTC** time, but the init migration was named with the local date (`20260924000000`). Until 2026-09-24 00:00 UTC new files would sort before it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | New migrations must sort after the latest existing file; the profiles migration was renamed to `20260924000100`. Check the name after every `db:new`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Documented    |
| F-13 | next-intl locale detection is on: a visitor whose browser prefers English (`Accept-Language`) or who last used English (`NEXT_LOCALE` cookie) is redirected from `/…` to `/en/…`. `/` is therefore not always Macedonian.                                                                                                                                                                                                                                                                                                                                                                                                                                              | **Decision needed.** Keep (standard, convenient) or set `localeDetection: false` in `src/i18n/routing.ts` so `/` is always Macedonian and English only via the switcher. Recommendation: disable, for a Macedonian-first site with predictable URLs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Open          |
| F-14 | Next.js renders a hidden route announcer with `role="alert"`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Browser tests must look for alerts inside the form (`form [role=alert]`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Documented    |
| F-12 | Advisors warn that `current_profile()` (a `security definer` function in `public`) is callable by `anon`/`authenticated`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Intentional: it returns only the caller's own row (nothing for anon). Accepted warning. P10.S1 adds the same warning (authenticated only) for `admin_set_banned()` and `admin_stats()`: admins call them through the API and both raise `42501` for anyone else. `admin_list_users()` (P10.S5) is the same case. `hide_conversation()` (per-user conversation delete, 2026-10-07) adds it for `anon` and `authenticated`: called through the API, useless without a session (no `auth.uid()`), raises `P0002` unless the caller is a participant, and writes only the caller's own `hidden_conversations` row and read state. Accepted (2026-10-12).                                                                                                                                                                                                                   | Accepted      |
| F-19 | Advisors warn "Leaked password protection disabled" (HaveIBeenPwned check of new passwords). Noticed during P2.S8.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Optional: enable it in Supabase → Authentication (password security) if the plan allows it; rejected passwords already show `weak_password`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Open          |
| F-20 | Deleting an auth user (dashboard or SQL) removes the profile but not the user's files in Storage: the owner's old avatar stayed in `avatars` as an orphan after the account was recreated (2026-09-26).                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Clean up files when account deletion is implemented (admin user management, P10.S5, or a self-service delete); the orphan was left in place (user data).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Open          |
| F-21 | Photos are uploaded before the item is saved (the item id is generated in the browser). If the user abandons the form, or the create action fails, the uploaded files stay in `item-images` without an `item_images` row. Removing a photo in the picker deletes its file; abandoned forms cannot. Noticed in P3.S4.                                                                                                                                                                                                                                                                                                                                                   | Acceptable for now (files are small). The create action does **not** delete them on failure, because the form keeps the photos for the next attempt (P3.S5). Deleting an item now removes every file in its folder, including such uploads (P3.S7). Option for abandoned new items: a periodic clean-up of files older than a day without an `item_images` row (scheduled SQL job or admin action, P10/P11).                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Open          |
| F-22 | Local `next build` (Turbopack) fails on the development machine: Windows Application Control blocks the native `@next/swc-win32-x64-msvc` binary, Next falls back to WASM bindings, and Turbopack requires native ones. Seen first in P3.S8 (earlier steps built normally). Lint, typecheck and tests are unaffected; Vercel builds on Linux.                                                                                                                                                                                                                                                                                                                          | Code is unaffected. Locally, verify with `npx next build --webpack` until the policy allows the file (user: Windows Security → App & browser control, or reinstall `node_modules`). Scripts stay unchanged. 2026-09-30 (P6.S1): `npm run build` runs with Turbopack locally again; nothing was changed in the project. 2026-10-11 (P11.S1): blocked again; verified with `npx next build --webpack`. 2026-10-12 (P11.S2): `npm run build` works with Turbopack again.                                                                                                                                                                                                                                                                                                                                                                                                  | Recurring     |
| F-23 | A `loading.tsx` or a Suspense fallback on a page streams the fallback first on a full page load; the real content is swapped in by inline JavaScript. Without JavaScript (and for crawlers that do not run it) the page stays on the fallback, and a `redirect()` after the fallback is a streamed client redirect instead of HTTP 307. Found in P4.S5 on `/items`.                                                                                                                                                                                                                                                                                                    | Pages that must work without JavaScript or redirect canonically (`/items`, later public pages) render without a fallback; show pending state with `useLinkStatus`/`useFormStatus` markers instead (P4.S5). Keep this in mind for P11.S* ("`loading.tsx` per segment"): only on pages where that is acceptable (e.g. signed-in pages).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Documented    |
| F-24 | Item form: a failed submit clears the lost/found choice in the browser. React resets the form after every action; the `type` radios are controlled by state that does not change, so the reset unchecks them while the card description still follows the old choice. The next submit then fails with "choose lost or found". Present since P3.S5 (found in P5.S3).                                                                                                                                                                                                                                                                                                    | Fixed in `item-form.tsx`: the radios stay controlled (React writes `.checked` on every update, so a later choice sticks) and their group is remounted after every action result (`State.attempt` as `key`), which makes React write the current choice as `defaultChecked` before it resets the form. Making them uncontrolled was not enough: after the reset, the re-render on a new choice rewrote the old radio's `defaultChecked` and re-checked it (seen in jsdom). Covered by `item-form.test.tsx` (jsdom) and a browser check.                                                                                                                                                                                                                                                                                                                                 | Fixed         |
| F-25 | Production (Vercel) crashed the item form when a pin was placed: "iconUrl not set in Icon options". Turbopack turns an image imported from `node_modules` into a URL string, webpack into `StaticImageData`, so `markerIcon.src` was `undefined` on Vercel only. Local checks build with webpack (F-22), which hid it. Found after P5.S3.                                                                                                                                                                                                                                                                                                                              | Fixed: `marker-icon.ts` accepts both shapes, `LocationPickerMap` passes the icon explicitly, `BaseMap` imports it for the default. Regression test `marker-icon.test.tsx` (Vitest also yields strings, like Turbopack; the old code fails it). Map/asset changes are also checked on the Vercel deployment until F-22 is resolved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Fixed         |
| F-26 | On Vercel, Macedonian (no-prefix) pages leave one or two prefetch `fetch` requests open indefinitely: prefetches of links that the proxy answers with 307 (the locale switcher's `/mk/…`, a guest's "Report" link to `/login?next=…`) are followed to the target and never finish. `/en/…` pages are not affected; seen on `/`, `/items` and item pages. Not visible to users so far, but prefetching those links does not complete and headless checks cannot wait for "network idle". Present before P5.S4 (found while checking it).                                                                                                                                | Investigate later (e.g. link the current locale without the `/mk` prefix, or no prefetch on links that redirect). Browser checks wait for `load` and specific elements instead of `networkidle`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Open          |
| F-27 | A Leaflet map removed during a zoom animation threw "Cannot read properties of undefined (reading '_leaflet_pos')": Leaflet 1.9 ends the animation from a 250 ms timer that `map.remove()` does not cancel. Seen in P5.S5 when the feed's filter form (with the distance map) remounted right after a radius change; any map unmounted while zooming was affected.                                                                                                                                                                                                                                                                                                     | Fixed in P5.S5: `src/components/map/leaflet-fixes.ts` (imported by `base-map`) skips the timer's call when the map has no pane any more; unit tests (the first fails without the fix); browser repro clean.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Fixed         |
| F-28 | Leaflet popups (and its controls) have their own white styling. The `/map` popups use the theme's text colors, which would be light on white once dark mode exists. Found in P5.S6 (dark mode is not active yet).                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Fixed in P11.S1: in `.dark`, popups, the tip, close button, zoom buttons, attribution and map background use the theme tokens (`globals.css`); light mode keeps Leaflet's styling.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Fixed         |
| F-29 | With weights v1, category + distance + date alone give 0.69, above the 0.55 threshold: unrelated items of the same category found nearby on the same day become matches (fixture: different keys at the same place, 0.711, text 0.082). Found in P6.S2.                                                                                                                                                                                                                                                                                                                                                                                                                | Fixed in P6.S6: weights v2 (category 0.15, distance 0.15, date 0.15, text 0.55) and threshold 0.60, tuned on the demo dataset (§14): 0 false positives instead of 26, all true pairs still first; the fixture now scores 0.458.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Fixed         |
| F-30 | Chromium-based browsers (Chrome, Edge) ship no Macedonian `Intl` data: `RelativeTimeFormat`, `DateTimeFormat` and `NumberFormat` for `mk` fall back to the root locale (`-4 s`, `2026 M10 1`); only `PluralRules` supports `mk`. Node has full ICU, so server-rendered text and unit tests are correct. Client components that format in the browser are affected: `/map` popup dates (`MapExplorer`) and the near filter's distance (`NearFilter`). Found in P7.S3 (the bell's relative times showed `-4 s`).                                                                                                                                                         | The bell words times with its own messages (`elapsedSince()` in `@/lib/dates`; ICU plurals work). Fix `MapExplorer`/`NearFilter` the same way (or render those texts on the server) in P11.S2. Client components should not rely on `Intl` date/number formatting for `mk`. Fixed in P11.S2: the popup date uses `MapPage.date` with `dayParts()`, the radii `Search.near.km`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Fixed         |
| F-31 | `matching_demo.sql` failed on 2026-10-01: inside the test transaction, the insert trigger of demo lost wallet `101` runs `compute_matches()`, which scores it against every active found report on the linked project, including a real found wallet (created 13:10 UTC, score 0.764). The test's `demo_stored` filtered only the lost side by the demo id prefix, so it counted that pair as a demo false positive. Not caused by the matching rules; nothing is committed (the run is rolled back). Found in P8.S1.                                                                                                                                                  | Fixed (test only): `demo_stored` keeps only pairs of two demo reports (both ids `de100000-%`), like `demo_pairs`. The real report and its data are unchanged. Real reports could still take some of a demo report's 10 stored slots; the "every true pair is stored" assert would then fail loudly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Fixed         |
| F-33 | After reading a chat and going back with the browser's back button, `/messages` can show the old unread badge: back navigation restores the list from the router cache, and it re-renders only if a Realtime event about the read arrives after the navigation (`RefreshOnMessages` listens only while mounted; `useUnreadMessages` merges the read's own `MESSAGES_READ_EVENT` with the Realtime UPDATE into one batch). Timing-dependent: the P8.S5 check passed on 2026-10-02, a build of the previous commit failed it 1 of 2 and the P8.S6 build 3 of 3. The header badge is always right; the in-app back link renders fresh. Found in the P8.S6 regression run. | Fixed in `RefreshOnMessages` (P8.S5 fix): `@/lib/chat` counts changes to the user's messages in the tab (`noteMessagesChanged()`/`currentMessagesVersion()`), fed by the existing producers only — `useUnreadMessages` on each Realtime event (at once, not after its 300 ms batch), `ChatView` after a successful read and after a sent message. `RefreshOnMessages` remembers per `router.bfcacheId` (new for every fresh visit, the same when Back/Forward restores it) the version the list showed, and calls `router.refresh()` on mount when a restored list is older. No new subscription. Deterministic regression: component tests (a remount with the same `bfcacheId` after a change refreshes once; fresh visits and unchanged restores do not) fail on the old component; browser check `bc_back` fails on the old build and passes 3 × 25/25 on the fix. | Fixed         |
| F-32 | Server actions receive form data, which turns every line break of a textarea into `\r\n`. The browser's field counts a line break once (`maxLength`), the server twice. Found in P8.S4 (chat messages were stored with `\r\n`). Item descriptions (`itemSchema`, max 2000) still keep `\r\n`: a description that fits the field can fail with "too long" when it has many line breaks, and stored texts mix `\r\n`.                                                                                                                                                                                                                                                    | Fixed for messages in P8.S4 (`sendMessageSchema` normalizes to `\n` before trimming and length checks). For items: normalize the same way in `itemSchema`'s description (and check `search_text`/display are unaffected) in a separate fix or P11.S2. Fixed in P11.S2: `itemSchema` uses the same `overwrite` + `trim` (display uses `whitespace-pre-line`, search text is normalized anyway; existing descriptions keep their `\r\n`).                                                                                                                                                                                                                                                                                                                                                                                                                                | Fixed         |
| F-34 | P9.S1 broke the item page (`Failed to load item …: Could not embed because more than one relationship was found for 'items' and 'profiles'`, `src/lib/queries/items.ts`). Foreign keys between the tables: `items_user_id_fkey` (`items.user_id` → `profiles.id`, the owner) and, since P9.S1, `favorites_item_id_fkey` + `favorites_user_id_fkey`; both `favorites` columns form its primary key, so PostgREST also sees a many-to-many `items` ↔ `profiles` through `favorites`, and the plain `owner:profiles (…)` embed of `getItem` became ambiguous (`PGRST201`). The P9.S1 SQL tests and the REST check only covered `search_items`, not embeds.                | The favorites relationship is intended, so the schema stays. `getItem` names the owner's foreign key: `owner:profiles!items_user_id_fkey (…)`. Every other embed checked against the live API (item cards, matches, conversations already name their keys; no other `items` → `profiles` embed). Regression test `src/lib/queries/items.test.ts` (fails on the old query). Convention in CLAUDE.md: embeds between tables that a junction table also links must name the foreign key.                                                                                                                                                                                                                                                                                                                                                                                  | Fixed         |
| F-35 | At 375 px the signed-in header is 14 px wider than the viewport (page `scrollWidth` 389): the user menu avatar sits past the right edge, on every page (`/dashboard`, `/items`, item pages). Found in the P10.S2 browser check; the report dialog itself fits.                                                                                                                                                                                                                                                                                                                                                                                                         | Fix in Phase 11 (UI polish): let the header's icon group shrink or hide a control on narrow screens. Fixed in P11.S2: smaller gaps and locale-link padding below `sm`; at 360 px the avatar ends at 344 px.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Fixed         |
| F-10 | No automated tests yet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Vitest added in P2.S1; SQL tests from P2.S2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Fixed         |

---

## 24. Changelog

| Date       | Step        | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-12 | deploy      | Corrected the record: `15377e2` (P9.S3, P10.S1–P10.S6, home page redesign; fast-forward from `a165b1d`) was pushed on 2026-10-06 and is live; no Vercel browser check of it recorded yet. Not on `main`: conversation delete, P11.S1, P11.S2 (`feature/a11y-polish`; migrations applied, `db:test` 23/23, types match). `hide_conversation()` advisor warning accepted (F-12).                                                                                                                                                                      |
| 2026-10-12 | P11.S2      | Error boundaries (`[locale]/error.tsx`, `global-error.tsx`, mk/en, theme-aware), `loading.tsx` on `/dashboard`, `/profile`, `/messages` (list in a `(list)` group so 404s stay 404), skip link, light contrast tokens ≥ 4.5:1, item details `<dl>` fix, filter toggle out of the tab order on wide screens, decorative avatars hidden, header fits at 360 px (F-35), `Intl`-free popup date and radii (F-30), item description line breaks (F-32); 814 unit tests; browser check 122 + final 95/96; Lighthouse accessibility 96–100 in both themes. |
| 2026-10-11 | P11.S1      | Dark mode: `next-themes` `ThemeProvider` (class, default system, no flash), Light/Dark/System in the account menu (mk/en), dark focus ring in the primary colour, Leaflet popups/controls with theme tokens in dark (F-28 fixed); 4 component tests (808 total); browser check 38/38. Built on `feature/hide-conversation` (branch `feature/dark-mode`, not pushed).                                                                                                                                                                                |
| 2026-10-07 | messaging   | Per-user "Delete conversation" (§16; branch `feature/hide-conversation`, not merged as of 2026-10-12): `hidden_conversations` + `hide_conversation()` (marks the user's unread read, removes their message notification), `my_conversations()` brings a conversation back on newer activity; delete button with confirmation on `/messages` (optimistic), mk/en texts; SQL tests 23/23, unit tests 804, browser check 21/21 (both participants, reappearance, stranger, English).                                                                   |
| 2026-10-05 | P10.S6      | Category management: migration (fixed slugs, protected `other`, atomic `admin_reorder_categories`, `admin_category_item_counts`), `/admin/categories` with add/edit/reorder/delete and an icon picker (24 icons), "Categories" tab; 25 unit tests; SQL tests 22/22; browser check 32/32. Phase 10 completed.                                                                                                                                                                                                                                        |
| 2026-10-05 | P10.S5      | User management: `admin_list_users()` (migration, SQL tests), `/admin/users` with name/email search, banned filter, counts and ban/unban (`setUserBanned`, confirmation), "Users" tab, banner for banned users; 14 unit tests; browser check 40/40.                                                                                                                                                                                                                                                                                                 |
| 2026-10-05 | P10.S4      | Moderation queue `/admin/reports`: open flags grouped by item (oldest first) with hide (confirmation; resolves the flags shown), resolve and dismiss, hidden reports view with restore (to active or resolved), "Flags" tab, moderation notification texts; 32 unit tests; browser check 41/41.                                                                                                                                                                                                                                                     |
| 2026-10-05 | P10.S3      | Admin area: `(app)/admin` layout (`requireAdmin`, 404 for non-admins, `AdminNav`) and dashboard with the `admin_stats()` tiles, `getAdminStats`, admin link in the user menu; owner account made admin with SQL; 4 unit tests; browser check 22/22.                                                                                                                                                                                                                                                                                                 |
| 2026-10-05 | P10.S2      | Report item UI: `ReportDialog` on the item page (reason + optional details; note when the user has an open report; login link for guests), `reportItem` action (`report_duplicate`, `report_unavailable`), `hasOpenReport`, shadcn dialog; 22 unit tests; browser check passed; F-35 logged (header overflow at 375 px).                                                                                                                                                                                                                            |
| 2026-10-04 | P10.S1      | Moderation schema: `reports` with RLS and a resolution trigger, admin policies on categories, `admin_set_banned()`, `admin_stats()`, moderation notifications on hide/restore, hidden items keep `resolved_at`; SQL tests `moderation.sql` (20/20 files). Phase 10 started.                                                                                                                                                                                                                                                                         |
| 2026-10-04 | P9.S3       | Favorites page `/favorites` (newest saved first, 20 per page, only active/resolved reports, removal with the heart, empty and error states), user menu link, shared `parsePage`; 695 unit tests; browser check 41/41. Phase 9 completed.                                                                                                                                                                                                                                                                                                            |
| 2026-10-04 | deploy      | P9.S1, F-34 fix and P9.S2 deployed (`a165b1d`); item pages on Vercel healthy again; production favorites smoke test 60/60 (mk/en).                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-10-04 | P9.S2       | Favorite toggle: `addFavorite`/`removeFavorite` actions, optimistic `FavoriteButton` on feed/home cards and the item page, login link for guests, `isFavorite` from `search_items`; 675 unit tests; browser check 19/19.                                                                                                                                                                                                                                                                                                                            |
| 2026-10-03 | F-34 fix    | Item page failed after P9.S1 (`PGRST201`: `favorites` made `items` ↔ `profiles` ambiguous); `getItem` embeds the owner as `profiles!items_user_id_fkey`; regression test (654 → 658 unit tests); browser check of two item pages mk/en 17/17. No schema change.                                                                                                                                                                                                                                                                                     |
| 2026-10-03 | P9.S1       | Favorites schema: `favorites` table with RLS (own rows; adding needs `can_write()` and a visible, not hidden item), `search_items` returns `is_favorite`; SQL tests `favorites.sql` (19/19).                                                                                                                                                                                                                                                                                                                                                        |
| 2026-10-03 | Time fix    | `ConversationList` no longer calls `useNow({ updateInterval })` in a Server Component (ignored, console warning): times are rendered by the client component `ConversationTime` (server time for hydration, then a shared one-minute browser clock; mk/en wording and F-30 unchanged); 7 new tests; browser check: no hydration errors, no warning in the dev server log.                                                                                                                                                                           |
| 2026-10-02 | F-33 fix    | `/messages` refreshes once when the browser's Back/Forward restores a list older than the user's latest message change (per-tab version from the existing header hook and chat, keyed by `router.bfcacheId`); 7 new tests; browser regression 3 × 25/25 (old build failed every Back check), P8.S3–P8.S6 checks pass; P8.S6 reviewed.                                                                                                                                                                                                               |
| 2026-10-02 | P8.S6       | Message notifications: one per recipient and conversation (unread until read; the first message after reading replaces it with a new unread one), read automatically when the chat is read, removed with the conversation; bell entry with sender, report and chat link, no toast for the open chat; 13 new tests, SQL tests; browser check 33/33; Phase 8 completed; F-33 logged.                                                                                                                                                                  |
| 2026-10-02 | P8.S5       | Read state: the open chat marks the other participant's messages read (visible tab, batched, `markConversationRead`), header messages link with a live unread badge (one Realtime channel, reloads on reads and in other tabs), live `/messages` through a window event; 26 new tests; browser check 26/26, P8.S4 55/55 and P8.S3 36/36 locally.                                                                                                                                                                                                    |
| 2026-10-02 | P8.S4 prod  | Pushed `7baa745`, `6129c41`, `7ae4ae4` (fast-forward `e449c06..7ae4ae4`); deployment confirmed by served P8.S4 markup (uncached); Vercel browser checks: P8.S2 45/45 + stale 10/10, P8.S3 35/35, P8.S4 55/55; temporary data deleted.                                                                                                                                                                                                                                                                                                               |
| 2026-10-02 | P8.S4       | Chat on `/messages/[id]`: newest 50 from the server, Realtime INSERTs per conversation with catch-up after (re)subscribing, older pages on scroll keeping the position, "N new messages" jump, day separators and Macedonian times without `Intl`, `sendMessage` (CRLF → LF, trim, 1–2000, rate limit → readable error), composer with Enter/Shift+Enter and counter, read-only for banned users; 64 new tests; browser check 55/55 (two browsers, desktop + mobile).                                                                               |
| 2026-10-01 | P8.S3       | `/messages`: the user's conversations from `my_conversations()` (latest activity first, other participant, report or "not available", last message with "You:", unread highlight and badge), summary, empty and error states, header messages link; 20 new tests; browser check 35/35 (desktop + mobile).                                                                                                                                                                                                                                           |
| 2026-10-01 | P8.S2 prod  | Pushed `614b79d`…`e449c06` (fast-forward); deployment confirmed by served P8.S2 markup; Vercel browser check 45/45 + stale-page check 10/10 (resolved/hidden refused, mk/en, desktop/mobile); temporary data deleted.                                                                                                                                                                                                                                                                                                                               |
| 2026-10-01 | P8.S2       | Start conversation from an item: `startConversation` (opens an existing conversation, starts one only for active reports of others, owner from the item, `conversation_limit`/`conversation_item_inactive`/`conversation_own_item` errors), contact card on the item page (guest link to login, Open conversation when one exists), minimal `/messages/[id]`; 29 new tests; browser check 45/45 (desktop + mobile).                                                                                                                                 |
| 2026-10-01 | P8.S1 limit | Daily conversation limit: at most 20 new conversations per requester in 24 hours (`FL429` `daily_conversation_limit`), per-requester advisory lock so concurrent requests cannot exceed it, re-opening exempt; `conversation_limit.sql`; concurrency checked with two live sessions.                                                                                                                                                                                                                                                                |
| 2026-10-01 | F-31 fix    | `matching_demo.sql` evaluates only pairs of two demo reports; a real found report on the dev project had been counted as a false positive. Test-only change.                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-10-01 | P8.S1       | Messaging schema: `conversations` (one per item and requester, only about active items, participants only) and `messages` (participants, own `sender_id`, recipient updates `read_at`), 30 messages/min limit (`FL429`), `last_message_at` trigger, `my_conversations()`, `mark_conversation_read()`, Realtime for `messages`; SQL tests; F-31 logged.                                                                                                                                                                                              |
| 2026-10-01 | P7.S4       | `/notifications`: paged history (20, canonical `?page=`, past-the-end redirect incl. PostgREST 416), mark read/unread, delete, mark all read (optimistic, `refresh()` in the actions), live new entries via the bell's event, "See all" in the bell; 19 new tests; browser check 55/55. Phase 7 done (P7.S5 optional, deferred).                                                                                                                                                                                                                    |
| 2026-10-01 | P7.S3       | Notification bell: header popover with unread badge (0 hidden, 99+), 20 newest notifications resolved to reports/matches (missing ones described), mark read/unread and delete (actions), Realtime INSERT/UPDATE per user with toast, reconnect catch-up and account-change clearing; 44 new tests; browser check 55/55; F-30.                                                                                                                                                                                                                      |
| 2026-10-01 | P7.S2       | Match notifications: `matches_notify` trigger (one notification per distinct owner of a new match, `{match_id, item_id, other_item_id}`), unique per recipient and pair (rescoring and recreated pairs do not notify again), notifications about deleted reports removed; SQL tests `match_notifications.sql`.                                                                                                                                                                                                                                      |
| 2026-10-01 | P7.S1       | Notifications schema: `notification_type` enum, `notifications` table (ids-only `data` object, `read_at`), own rows only (select, `read_at` update with `can_write()`, delete), no inserts by users, list + unread indexes, Realtime publication; SQL tests. Phase 7 started.                                                                                                                                                                                                                                                                       |
| 2026-09-30 | P6.S6       | Demo dataset (44 reports, 14 true pairs) and evaluation; weights v2 (0.15/0.15/0.15/0.55, threshold 0.60): false positives 26 → 0, true pairs all first; `matching_demo.sql` with `-- @include`; F-29 fixed. Phase 6 done.                                                                                                                                                                                                                                                                                                                          |
| 2026-09-30 | P6.S4 prod  | Verified on Vercel (`a00451d`): matches browser suite 41/41 (after the 8 s Undo toast fix).                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-09-30 | P6.S4       | Matches UI: item page (owner) and dashboard sections with explanation chips, strength + percentage, confirm/dismiss/undo/restore (`setMatchStatus`), empty/error/resolved states; P6.S5 merged in; 37 new tests; browser check 41/41.                                                                                                                                                                                                                                                                                                               |
| 2026-09-30 | P6.S3       | Automatic matching: `private.compute_matches(item)` (indexed prefilter, `match_score`, top 10 ≥ 0.55, upsert of suggested rows, dismissed/confirmed kept), insert/update triggers on `items`, backfill (0 matches on dev); SQL tests `compute_matches.sql`.                                                                                                                                                                                                                                                                                         |
| 2026-09-30 | P6.S2       | Scoring: `private.match_score(lost, found)` (candidate rules, weighted components, breakdown; no row for non-candidates) and `private.match_words()`; fixture tests `matching.sql` (clear match 0.905 … 20 km 0.705); F-29.                                                                                                                                                                                                                                                                                                                         |
| 2026-09-30 | P6.S1       | Matches schema: `match_status` enum, `matches` table (unique pair, score 0–1, breakdown object), owners of either item read it and change only `status`, no direct inserts/deletes; SQL tests; types. Local Turbopack build works again (F-22 resolved). Fixed a broken P3.S7 row in the §2 step table.                                                                                                                                                                                                                                             |
| 2026-09-29 | P5.S6 prod  | Verified on Vercel (`ba3f626`): `/map` 43/43, radius 41/41, apply race 5/5, item map 24/24, location picker 20/20.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-29 | P5.S6       | `/map` page: `items_in_bounds()` (active items in a rectangle, planar index, 300 cap with total; SQL tests), browser loading per visible area (debounced, aborting), grouped markers in type colors with item popups, type filter keeping the view, header/sitemap; F-28; browser check 43/43. Phase 5 done.                                                                                                                                                                                                                                        |
| 2026-09-29 | P5.S5 prod  | Verified on Vercel (`b48dfcd`): migration active, new `search_items()` signature only; radius 41/41, apply-after-radius race 3/3 + 5/5, item map 24/24, location picker 20/20.                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-09-29 | P5.S5       | Radius filter: `search_items()` with center, `radius_km`, `distance_m`, nearest sort (SQL tests with known distances); `lat`/`lng`/`radius` URL contract; `NearFilter` (near me, map with radius circle); distances on cards; F-27 fixed; browser check 41/41.                                                                                                                                                                                                                                                                                      |
| 2026-09-28 | P5.S4       | Item page map: `ItemMap` (fixed pin at the stored point), Location section with address and OpenStreetMap link, `MapErrorBoundary` in `MapFrame`; 5 new tests; browser check 24/24 (incl. blocked map chunk).                                                                                                                                                                                                                                                                                                                                       |
| 2026-09-28 | F-25 fix    | Marker icon crash on Vercel (Turbopack image imports are strings): shared `marker-icon.ts`, explicit `icon` on the picker pin; 6 regression tests; browser check 20/20 locally and on production.                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-28 | F-24 fix    | Item form keeps the lost/found choice after failed submits (controlled radios remounted per action result); first component test (`item-form.test.tsx`, jsdom, 4 cases); browser check 15/15.                                                                                                                                                                                                                                                                                                                                                       |
| 2026-09-28 | P5.S3       | Location required: migration (backfill of 4 items, `not null`, generated `lat`/`lng`, `create_item`/`update_item` with `lat`/`lng`), `LocationPicker` in the item form, edit keeps/changes the point; SQL 7/7, browser check 23/23; F-24 logged.                                                                                                                                                                                                                                                                                                    |
| 2026-09-28 | P5.S2       | Location picker: `@/lib/geocoding` (Nominatim search/reverse, shared 1.1 s throttle, cache, short labels; 14 unit tests), `LocationPicker` (search, my location, click/drag pin, editable address, hidden lat/lng); browser check 44/44.                                                                                                                                                                                                                                                                                                            |
| 2026-09-28 | P5.S1       | Leaflet base map: `leaflet` + `react-leaflet` 5, `BaseMap` (OSM tiles, attribution, bundled marker icons), client-only loading via `index.tsx`, `MapFrame`, `@/lib/map`; browser check 28/28. Phase 5 started.                                                                                                                                                                                                                                                                                                                                      |
| 2026-09-28 | P4.S7       | Home page: hero search, latest 4 lost/found (swipe row on phones), category links to the feed; browser check 34/34. Phase 4 done.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-28 | P4.S6       | SEO: `@/lib/seo` helpers, item metadata (canonical, hreflang, OG/Twitter with cover photo), feed/home alternates, search `noindex`, `sitemap.ts` (active items, hourly), `robots.ts`; check 69/69.                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-28 | P4.S5       | Feed pagination (filters kept, past-the-end → last page), result range, empty states with actions, navigation-pending dimming instead of `loading.tsx` (keeps no-JS + 307s); browser check 48/48.                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-28 | P4.S4       | `/items` feed: `searchItems`, `next/form` filters (work without JS), canonical-URL redirect, header link; no sort without a query; browser check 43/43.                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-09-28 | P4.S3       | Search params: `parseSearchParams` (per-field fallbacks), `searchQuery` (canonical URLs); 46 unit tests.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-28 | P4.S2       | `search_items()`: text (full text + typos), type/category/status/date filters, newest/relevance, pagination capped at 50; SQL tests 7/7.                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-28 | P4.S1       | `normalize_text()` (Cyrillic/Latin/diacritics/digraphs), `search_text` trigger, `search_vector`, GIN indexes, backfill; SQL tests 6/6.                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-27 | P3.S8       | Dashboard: `getOwnItems`, `ItemCard`, status tabs, compact quick actions, empty state; sign-in lands on `/dashboard`; F-22; browser check 40/40. Phase 3 done.                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-09-27 | P3.S7       | Edit page (`ItemForm` edit mode), `update_item()` migration + SQL tests, `updateItem`/`setItemStatus`/`deleteItem`, owner actions with delete dialog; browser check 27/27.                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-27 | P3.S6       | Item detail page: `getItem`, gallery, type badge, lost/found tokens, owner panel (edit link), 404 for hidden/invalid; browser check 25/25.                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-27 | P3.S5       | Create item page: `ItemForm`, `createItem` (checks uploaded photos exist, `create_item`), `itemWriteFailure`, `getCategories`, `FormTextareaField`, user-menu link; browser check 27/27.                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-26 | P3.S4       | `ImagePicker` (WebP ≤ 1600 px, upload with progress via XHR, reorder, remove, retry, limits) and `src/lib/item-images.ts`; verified in the browser (5.55 MB → 231 KB).                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-26 | P3.S3       | `itemSchema()` (Zod) mirroring the DB rules, `isOwnItemImagePath`, `todayInAppTimeZone()` (Europe/Skopje), 13 `Validation` messages in mk/en; 49 new unit tests.                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-26 | P3.S2       | Public `item-images` bucket (5 MB, WebP/JPEG) with owner/admin storage policies; SQL tests and a real Storage API check (own folder, other folder, overwrite, PNG, 6 MB).                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-26 | P3.S1       | `items`, `item_images`, enums, triggers (resolved_at, no future date in Skopje time, 20 items/24 h), RLS + column grants incl. admin hide, `create_item()` RPC; SQL tests. Phase 3 started.                                                                                                                                                                                                                                                                                                                                                         |
| 2026-09-26 | P2.S10      | Deployed to https://findly-web-nine.vercel.app; production checks and profile suite 70/70; real registration, reset and Google sign-in confirmed → COMPLETED. Phase 2 completed.                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-25 | P2.S10      | Deployment prep: templates link to `RedirectTo` (works for local + Vercel), site URL fallback to the Vercel domain, `fra1` region, README; Vercel import + template re-paste pending (NEEDS REVIEW).                                                                                                                                                                                                                                                                                                                                                |
| 2026-09-25 | P2.S8 UI    | Profile page redesigned as a settings page (header card, personal information, account, security); functionality unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-09-25 | P2.S8       | Profile page: name, email language (also for auth emails, F-18), avatar upload to the new `avatars` bucket, change password, profile link in the menu.                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-24 | P1.S1–S8    | Project scaffold, i18n, Supabase clients, env validation, init migration, home page, project linked.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-09-24 | —           | Fixed Supabase URL misconfiguration; URL validation; generated types committed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-09-24 | P1.S9       | Phase 1 audit, master plan created, `CLAUDE.md` project guide, font variable fix.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-24 | P2.S10      | GitHub repository created and `main` pushed (Vercel part still open).                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-24 | P2.S1       | Vitest, `ActionResult` helpers, `safeRedirectPath`, translation parity tests, `Errors` messages.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-24 | P2.S2       | `profiles`, sign-up trigger, `private.is_admin/can_write`, `current_profile()`, column-level privileges, SQL test runner.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-24 | P2.S3       | `getCurrentUser`/`requireUser`/`requireAdmin` (server-only DAL), route rules in `auth-routes.ts`, proxy auth redirects.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-09-24 | P2.S4       | Login, register and verify-email pages, auth actions, form components, user menu; 3 bugs found in browser testing fixed.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-24 | P2.S9       | Custom SMTP (Brevo) configured by the user; verified with a real registration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-09-24 | P2.S5       | Confirmation route, resend with cooldown, invalid-link page, bilingual confirm template; template paste pending (NEEDS REVIEW).                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-09-24 | P2.S5       | Confirm-signup template pasted by the user and verified with a real registration → COMPLETED.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-09-24 | P2.S6/S7    | Manual parts done by the user (reset-password template, Google OAuth client + provider) and verified → COMPLETED.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-24 | P2.S7       | Google sign-in button, OAuth callback with cancel/failure messages; Google Cloud + Supabase provider setup pending (NEEDS REVIEW).                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-24 | F-17 fix    | Base UI "default value state of an uncontrolled FieldControl" warning: `FormField` remounts the input when `defaultValue` changes.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-24 | P2.S6       | Forgot/reset password pages and actions, recovery link routing, other sessions signed out, bilingual template; template paste pending (NEEDS REVIEW).                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-24 | P2.S5 fix   | Stale session after account deletion locked users out of /login and /register (F-16); proxy verifies the user there. Full registration flow re-tested.                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-24 | plan        | P2.S9 (SMTP) moved before P2.S5; email templates moved into P2.S5/P2.S6; Brevo chosen.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-24 | P2.S4 fix   | Diagnosed sign-up 429 (project email quota, F-15); `email_rate_limited` error code; operational auth errors logged.                                                                                                                                                                                                                                                                                                                                                                                                                                 |

---

## 25. Next Recommended Step

**P11.S3 — Performance pass** (see §22, Phase 11).

Why next: P11.S2 is done (error boundaries, loading states, accessibility, 360 px).
P11.S3 covers images (`next/image` or pre-sized WebP), keeping the map bundle to the
pages that use it, and client message namespaces (F-04); target Lighthouse performance
≥ 85 on the feed and item page (mobile).

Before that, a deployment is due. Production serves `15377e2` (pushed 2026-10-06:
P9.S3, P10.S1–P10.S6, home page redesign). Three commits are not on `main` yet, stacked
on `feature/a11y-polish`: the per-user conversation delete (`424601e`), P11.S1
(`72cea39`) and P11.S2 (`b7e0894`). `main` is their ancestor, so they merge as a
fast-forward; their migrations are already applied to the hosted project (which
production shares), so the deploy changes no database state. Steps, each after the
owner's approval: merge `--ff-only` into `main` and re-run the gates; push (Vercel
deploys production); confirm by markup only the new code renders (the skip link
`href="#main"` on an uncached page); browser checks against Vercel for the conversation
delete, dark mode and P11.S2, plus the still missing `/favorites`, report-dialog and
admin checks of `15377e2` (Turbopack there; F-25); record the deployment here.
Rollback: Instant Rollback to the `15377e2` deployment in the Vercel dashboard (the CLI
is logged out) or `git revert` + push; no database rollback needed.
