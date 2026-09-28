# Findly Web — Master Project Plan

> **Веб-платформа за управување и автоматско поврзување на пријави за изгубени и пронајдени предмети**
>
> This document is the single source of truth for the architecture, roadmap and
> progress of the Findly web project. Every step starts by reading it and ends by
> updating it.

- **Last updated:** 2026-09-28
- **Current phase:** Phase 5 — Map and location (not started)
- **Next step:** P5.S1 (§22)

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
| 5     | Map and location                      | `IN PROGRESS` |
| 6     | Automatic matching                    | `NOT STARTED` |
| 7     | Notifications                         | `NOT STARTED` |
| 8     | Messaging                             | `NOT STARTED` |
| 9     | Favorites                             | `NOT STARTED` |
| 10    | Admin and moderation                  | `NOT STARTED` |
| 11    | UI polish, testing and final delivery | `NOT STARTED` |

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
| P5.S3  | Location in item forms, make location required | `NOT STARTED` |
| P5.S4  | Map on item detail page                        | `NOT STARTED` |
| P5.S5  | Radius filter                                  | `NOT STARTED` |
| P5.S6  | `/map` page                                    | `NOT STARTED` |
| P6.S1  | Matches schema                                 | `NOT STARTED` |
| P6.S2  | Scoring functions                              | `NOT STARTED` |
| P6.S3  | `compute_matches` and triggers                 | `NOT STARTED` |
| P6.S4  | Matches UI with explanation                    | `NOT STARTED` |
| P6.S5  | Dismiss / confirm matches                      | `NOT STARTED` |
| P6.S6  | Demo dataset and weight tuning                 | `NOT STARTED` |
| P7.S1  | Notifications schema                           | `NOT STARTED` |
| P7.S2  | Match notification trigger                     | `NOT STARTED` |
| P7.S3  | Notification bell with Realtime                | `NOT STARTED` |
| P7.S4  | Notifications page                             | `NOT STARTED` |
| P7.S5  | (Optional) Email for new matches               | `NOT STARTED` |
| P8.S1  | Conversations and messages schema              | `NOT STARTED` |
| P8.S2  | Start conversation from item                   | `NOT STARTED` |
| P8.S3  | Conversation list                              | `NOT STARTED` |
| P8.S4  | Chat view with Realtime                        | `NOT STARTED` |
| P8.S5  | Read state and unread badge                    | `NOT STARTED` |
| P8.S6  | Message notifications                          | `NOT STARTED` |
| P9.S1  | Favorites schema                               | `NOT STARTED` |
| P9.S2  | Favorite toggle                                | `NOT STARTED` |
| P9.S3  | Favorites page                                 | `NOT STARTED` |
| P10.S1 | Reports schema and admin policies              | `NOT STARTED` |
| P10.S2 | Report item UI                                 | `NOT STARTED` |
| P10.S3 | Admin area layout and dashboard                | `NOT STARTED` |
| P10.S4 | Reports queue and item moderation              | `NOT STARTED` |
| P10.S5 | User management (ban/unban)                    | `NOT STARTED` |
| P10.S6 | Category management                            | `NOT STARTED` |
| P11.S1 | Dark mode                                      | `NOT STARTED` |
| P11.S2 | Responsive, accessibility, error boundaries    | `NOT STARTED` |
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
src/app/[locale]/admin/              admin area (role-guarded)
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

| Route                                                           | Access          | Phase |
| --------------------------------------------------------------- | --------------- | ----- |
| `/`                                                             | public          | 1, 4  |
| `/login`, `/register`, `/forgot-password`                       | guests          | 2     |
| `/verify-email`, `/reset-password`                              | public          | 2     |
| `/profile`                                                      | signed in       | 2     |
| `/items`                                                        | public          | 4     |
| `/items/[id]`                                                   | public (active) | 3, 4  |
| `/items/new`, `/items/[id]/edit`                                | signed in/owner | 3     |
| `/dashboard`                                                    | signed in       | 3     |
| `/map`                                                          | public          | 5     |
| `/notifications`                                                | signed in       | 7     |
| `/messages`, `/messages/[id]`                                   | participants    | 8     |
| `/favorites`                                                    | signed in       | 9     |
| `/admin`, `/admin/reports`, `/admin/users`, `/admin/categories` | admin           | 10    |

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
  `messages/mk.json` (currently `unauthorized`, `forbidden`, `validation`,
  `not_found`, `rate_limited`, `database`, `unknown`). Adding a code means adding
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

`messages` and `notifications` are added to the `supabase_realtime` publication.
Realtime respects RLS, so clients only receive their own rows.

---

## 9. Database structure

Legend: **PK** primary key, **FK** foreign key, ✓ implemented.

### Helper functions

| Function                   | Purpose                                                                                | Phase |
| -------------------------- | -------------------------------------------------------------------------------------- | ----- |
| `set_updated_at()`         | Trigger function that sets `updated_at = now()`.                                       | 2     |
| `private.is_admin()`       | `true` if the current user's profile has role `admin`. `security definer`, `stable`. ✓ | 2     |
| `private.can_write()`      | `true` if signed in and not banned. Used in every insert/update policy. ✓              | 2     |
| `current_profile()`        | The signed-in user's full profile row (API-callable). ✓                                | 2     |
| `create_item(...)`         | Creates an item and its image rows in one transaction (`security invoker`). ✓          | 3     |
| `private.items_*()`        | Item triggers: `resolved_at`, no future `occurred_on`, 20 items / 24 h. ✓              | 3     |
| `handle_new_user()`        | Trigger on `auth.users` insert → creates the `profiles` row.                           | 2     |
| `normalize_text(text)`     | lowercase + unaccent + Cyrillic→Latin transliteration, `immutable`.                    | 4     |
| `search_items(...)`        | Filtered, paginated search (see §12).                                                  | 4     |
| `items_in_bounds(...)`     | Items inside a map bounding box (see §13).                                             | 5     |
| `match_score(lost, found)` | Returns score + breakdown jsonb (see §14).                                             | 6     |
| `compute_matches(item_id)` | Recomputes matches for one item.                                                       | 6     |

### Enums

| Enum                | Values                                                 | Phase |
| ------------------- | ------------------------------------------------------ | ----- |
| `user_role`         | `user`, `admin`                                        | 2     |
| `item_type`         | `lost`, `found`                                        | 3     |
| `item_status`       | `active`, `resolved`, `hidden`                         | 3     |
| `match_status`      | `suggested`, `dismissed`, `confirmed`                  | 6     |
| `notification_type` | `match`, `message`, `moderation`                       | 7     |
| `report_reason`     | `spam`, `inappropriate`, `fraud`, `duplicate`, `other` | 10    |
| `report_status`     | `open`, `resolved`, `dismissed`                        | 10    |

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

### `notifications` (P7.S1)

| Column       | Type              | Notes                                                                                |
| ------------ | ----------------- | ------------------------------------------------------------------------------------ |
| `id`         | uuid PK           |                                                                                      |
| `user_id`    | uuid              | FK → profiles on delete cascade                                                      |
| `type`       | notification_type |                                                                                      |
| `data`       | jsonb             | IDs only (match_id, item_id, conversation_id); text is rendered in the UI's language |
| `read_at`    | timestamptz null  |                                                                                      |
| `created_at` | timestamptz       |                                                                                      |

Index `(user_id, created_at desc)`; partial index where `read_at is null`.

### `conversations` (P8.S1)

| Column            | Type        | Notes                                         |
| ----------------- | ----------- | --------------------------------------------- |
| `id`              | uuid PK     |                                               |
| `item_id`         | uuid null   | FK → items on delete set null (chat survives) |
| `owner_id`        | uuid        | FK → profiles; owner of the item              |
| `requester_id`    | uuid        | FK → profiles; user who started the chat      |
| `last_message_at` | timestamptz | updated by trigger on new message             |
| `created_at`      | timestamptz |                                               |

Unique `(item_id, requester_id)`; check `owner_id <> requester_id`.

### `messages` (P8.S1)

| Column            | Type             | Notes                                |
| ----------------- | ---------------- | ------------------------------------ |
| `id`              | uuid PK          |                                      |
| `conversation_id` | uuid             | FK → conversations on delete cascade |
| `sender_id`       | uuid             | FK → profiles                        |
| `body`            | text             | 1–2000 chars                         |
| `read_at`         | timestamptz null | set when the recipient reads it      |
| `created_at`      | timestamptz      |                                      |

Index `(conversation_id, created_at)`.

### `favorites` (P9.S1)

| Column       | Type        | Notes                  |
| ------------ | ----------- | ---------------------- |
| `user_id`    | uuid        | FK → profiles, cascade |
| `item_id`    | uuid        | FK → items, cascade    |
| `created_at` | timestamptz |                        |

PK `(user_id, item_id)`.

### `reports` (P10.S1)

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
  new items per user per day (P3.S1, e.g. 20/day) and messages per minute (P8.S1).

### Policy matrix

| Table         | select                                                                                                              | insert                                          | update                                                       | delete                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------ |
| categories ✓  | everyone                                                                                                            | admin (P10.S6)                                  | admin (P10.S6)                                               | admin (P10.S6)           |
| profiles      | everyone, public columns only (`id, display_name, avatar_path, created_at`); own full row via `current_profile()` ✓ | trigger only                                    | own row, allowed columns; admin: `role`, `is_banned` via RPC | none (cascade from auth) |
| items ✓       | `status in (active, resolved)` or own or admin                                                                      | own `user_id` and `can_write()`                 | own, not hidden, `can_write()`; admin any (hide/restore)     | own or admin             |
| item_images ✓ | if parent item visible                                                                                              | parent owned, not hidden, own folder, can_write | `position` only; parent owned, not hidden, `can_write()`     | parent owned or admin    |
| matches       | owner of either item                                                                                                | definer functions only                          | owner of either item, only `status`                          | none                     |
| notifications | own                                                                                                                 | definer functions only                          | own, only `read_at`                                          | own                      |
| conversations | participant                                                                                                         | requester = self, not item owner, `can_write()` | none (trigger updates `last_message_at`)                     | none                     |
| messages      | participant                                                                                                         | participant, `sender_id = self`, `can_write()`  | recipient, only `read_at`                                    | none                     |
| favorites     | own                                                                                                                 | own                                             | —                                                            | own                      |
| reports       | own or admin                                                                                                        | self, `can_write()`                             | admin                                                        | none                     |

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

### `search_items` (P4.S2 ✓, `20260927224223_search_items.sql`)

```
search_items(
  q text default null, item_type item_type default null, category_slugs text[] default null,
  item_status item_status default 'active', date_from date default null, date_to date default null,
  sort text default 'newest',   -- newest | relevance (nearest + near_lat/near_lng/radius_km: P5.S5)
  page_size int default 20, page int default 1
) returns table (id, type, status, title, occurred_on, location_name, created_at,
  category_id, category_slug, category_name_mk, category_name_en, category_icon,
  cover_path, rank real, total_count bigint)
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
  newest without `q`); anything else → SQLSTATE `22023` `invalid_sort`.
- Radius (P5.S5): `ST_DWithin(location, ST_MakePoint(lng, lat)::geography, radius_km * 1000)`.
- Pagination: `page_size` clamped to 1–50, `page` to ≥ 1; offset/limit with
  `count(*) over ()` as `total_count` on every row. A page past the end returns
  no rows (no total), so the feed must treat "0 rows on page > 1" as out of range.
- Generated types mark every result column as non-null and `item_status` as not
  nullable; `location_name` and `cover_path` can be null, and the query layer
  (P4.S4) must treat them so.

### URL contract (P4.S3)

`/items?q=&type=lost|found&category=keys,wallet&status=active|resolved|all&from=YYYY-MM-DD&to=YYYY-MM-DD&sort=newest|relevance&page=2`
(`lat`, `lng`, `radius`, `sort=nearest`: P5.S5)

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
- `sort`: default `relevance` when there is a query; without a query always
  `newest` (never written to the URL).
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
  by default so maps do not catch page scrolling.
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
  `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`. Reads return
  `lat`/`lng` via `ST_Y/ST_X` (in the RPC or a view).
- **Radius filter (P5.S5):** center from the map or "near me", radius 1/2/5/10/25/50 km.
- **`/map` page (P5.S6):** `items_in_bounds(min_lat, min_lng, max_lat, max_lng,
filters…)` limited to 300 results; the map reloads on `moveend` (debounced).
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

### Candidate filter (hard rules)

- Opposite `type`, both `status = active`, different `user_id`.
- Same category, **or** either item in category `other`.
- Date: `found.occurred_on >= lost.occurred_on - 2 days` (something cannot be found
  long before it was lost) and difference ≤ 90 days.
- Distance ≤ 50 km (when both have a location).

### Score (weights version `v1`, tuned in P6.S6)

| Component | Weight | Formula (0–1)                                                                                |
| --------- | ------ | -------------------------------------------------------------------------------------------- |
| Category  | 0.30   | 1 if same category, 0.5 if one is `other`                                                    |
| Distance  | 0.25   | `exp(-d_km / 5)`; 0.5 if a location is missing                                               |
| Date      | 0.20   | `exp(-max(0, days_between) / 14)`                                                            |
| Text      | 0.25   | `greatest(similarity(search_text_a, search_text_b), token overlap ratio)` on normalized text |

`score = Σ weight × component`. Stored when `score ≥ 0.55`; at most the top 10
matches per item are kept.

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

### User actions (P6.S5)

- Owners of either item see its matches on the item page and dashboard.
- **Dismiss** (either owner) → `dismissed`, hidden for both.
- **Confirm** (either owner) → `confirmed`; the UI suggests contacting the other
  user and marking the item resolved.

### Testing

The scoring function is tested with SQL assertion tests (§20) using fixed
fixtures: a clear match, a category mismatch, a date contradiction, distance
decay, Cyrillic vs Latin text.

---

## 15. Notifications architecture

- **Creation:** only by `security definer` triggers:
  - `matches` insert → notification for both item owners (`type = match`) (P7.S2).
  - `messages` insert → recipient (`type = message`), at most one unread message
    notification per conversation (P8.S6).
  - Moderation action on an item → owner (`type = moderation`) (P10.S4).
- **Content:** `data` holds only IDs; the UI loads the titles and renders text in
  the viewer's language.
- **Delivery:** `notifications` in the `supabase_realtime` publication. The
  header bell (Client Component) gets the initial unread count from the server
  and subscribes to `INSERT` events filtered by `user_id=eq.<uid>`. A toast is
  shown for new notifications.
- **Reading:** `/notifications` lists them (paginated); actions `markRead(id)`,
  `markAllRead()` (update `read_at` — column-level grant).
- **Optional email (P7.S5):** Supabase Database Webhook on `matches` insert →
  `/api/webhooks/match-email` (shared secret) → email through the SMTP provider's
  API. Only if time allows; not required for the core.

---

## 16. Messaging architecture

- One conversation per (item, requester). "Contact" on an item page calls
  `startConversation(itemId)` which returns the existing conversation or creates
  one (unique constraint + `on conflict do nothing` + select).
- Conversation list (`/messages`): RPC `my_conversations()` returns the other
  participant, item title/cover, last message, unread count, ordered by
  `last_message_at`.
- Chat (`/messages/[id]`): server loads the last 50 messages; a Client Component
  subscribes to `INSERT` on `messages` filtered by `conversation_id`, appends new
  messages, and loads older ones on scroll.
- Sending: Server Action `sendMessage(conversationId, body)` (Zod: 1–2000 chars)
  → insert under RLS. A trigger updates `conversations.last_message_at`.
- Read state: opening a conversation calls RPC `mark_conversation_read(id)` which
  sets `read_at` on messages from the other participant. Header shows the total
  unread count.
- Anti-abuse: messages per user per minute limited by trigger; reporting a user
  is part of moderation (P10).

---

## 17. Favorites architecture

- Table `favorites (user_id, item_id)`; RLS: own rows only.
- Toggle button (Client Component, optimistic via `useOptimistic`) on item cards
  and item pages → Server Actions `addFavorite` / `removeFavorite`.
- For guests the button links to `/login?next=…`.
- `/favorites` lists favorite items that are still visible; hidden/deleted items
  disappear through RLS/cascade.
- Feed queries return an `is_favorite` flag for the current user (join in
  `search_items` when `auth.uid()` is set).

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

| Level          | Tool                                                                                                                         | What                                                                                                                            | From   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Static         | ESLint, TypeScript (`next typegen && tsc`)                                                                                   | Every step                                                                                                                      | P1     |
| Build          | `next build`                                                                                                                 | Every step                                                                                                                      | P1     |
| Unit           | Vitest                                                                                                                       | Zod schemas, search-param parsing, redirect sanitizing, match explanation formatting, image resize math, translation key parity | P2.S1  |
| Database / RLS | SQL test scripts in `supabase/tests/*.sql`, run with `npm run db:test` against the **dev** project inside `begin … rollback` | Policies (impersonating users with `set local role authenticated` + `request.jwt.claims`), triggers, `search_items`, scoring    | P2.S2  |
| Security       | `npx supabase db advisors --linked`                                                                                          | After every migration                                                                                                           | P1     |
| Manual         | Checklist in each step's "Verify" list                                                                                       | UI flows in both languages, mobile width                                                                                        | P1     |
| End-to-end     | Playwright                                                                                                                   | Register → verify (via test inbox or pre-confirmed test user) → create item → match appears → message                           | P11.S4 |
| CI             | GitHub Actions: lint, typecheck, unit tests, build                                                                           | On every push                                                                                                                   | P11.S4 |

SQL tests use `do $$ begin assert …; end $$;` blocks so a failure aborts the
script with a clear message; no pgTAP/Docker needed. They never commit data.

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

### Phase 5 — Map and location — `IN PROGRESS`

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

#### P5.S3 — Location in item forms; make location required

- **Depends on:** P5.S2, Phase 3.
- **Affects:** `item-form.tsx`, `src/actions/items.ts`, `src/lib/validation/items.ts`, migration `*_items_location_required.sql` (backfill or delete test rows, then `not null`), `create_item`.
- **Verify:** item cannot be created without a location; edit keeps the location.

#### P5.S4 — Map on item detail page

- **Affects:** `items/[id]/page.tsx`, `src/components/map/item-map.tsx`.
- **Verify:** marker at the stored location; page still renders if the map fails.

#### P5.S5 — Radius filter

- **Depends on:** P4.S2.
- **Affects:** `search_items` (new migration), `src/lib/validation/search.ts`, search filter UI.
- **Verify:** SQL test with known distances; UI radius selector; "nearest" sort.

#### P5.S6 — `/map` page

- **Affects:** migration `*_items_in_bounds.sql`, `src/app/[locale]/map/page.tsx`, `src/components/map/items-map.tsx`.
- **Verify:** markers load for the visible area and reload when moving; popups link to items; type filter works.

**Definition of done — Phase 5:** every new item has coordinates · radius search
correct (SQL tests) · map page usable on mobile · Nominatim/OSM policies respected.

---

### Phase 6 — Automatic matching — `NOT STARTED`

**Goal:** the system suggests likely lost↔found pairs with a score and a human-readable explanation.

#### P6.S1 — Matches schema

- **Affects:** migration `*_matches.sql` (enum, table, RLS, column grant on `status`), types.
- **Verify:** SQL tests: only owners of either item can see/update a match; nobody can insert directly.

#### P6.S2 — Scoring functions

- **Depends on:** P6.S1, P4.S1, P5.S3.
- **Affects:** migration `*_match_scoring.sql` (`match_score(lost, found)` returning score + breakdown), `supabase/tests/matching.sql`.
- **Verify:** fixture tests from §14 give the expected ordering and component values.

#### P6.S3 — `compute_matches` and triggers

- **Depends on:** P6.S2.
- **Affects:** migration `*_compute_matches.sql`; one-time backfill for existing items.
- **Verify:** creating a matching pair produces one match row; editing the description recomputes; dismissed matches are not recreated; unrelated items produce none.

#### P6.S4 — Matches UI with explanation

- **Affects:** `src/lib/queries/matches.ts`, `src/components/matches/{match-list,match-card,match-explanation}.tsx`, item page (owner only), dashboard, `messages/*.json` (`Matches`).
- **Verify:** explanation text correct in both languages (unit test for the formatter).

#### P6.S5 — Dismiss / confirm

- **Affects:** `src/actions/matches.ts`.
- **Verify:** dismissed match disappears for both users; confirmed match shows a "Contact" call to action.

#### P6.S6 — Demo dataset and weight tuning

- **Affects:** `supabase/seed/demo.sql` (realistic Macedonian examples; dev project only), weights documented in §14 and in the thesis.
- **Verify:** on the demo dataset the true pairs are in the top 3 for their items; false positives documented.

**Definition of done — Phase 6:** matches appear automatically after creating a
report · score + explanation shown · owners can dismiss/confirm · SQL tests pass ·
weights and results documented.

---

### Phase 7 — Notifications — `NOT STARTED`

**Goal:** users are told about new matches in real time and can review past notifications.

#### P7.S1 — Notifications schema

- **Affects:** migration `*_notifications.sql` (enum, table, RLS, `read_at` column grant, indexes, add to realtime publication).
- **Verify:** SQL tests: users see only their own; cannot insert.

#### P7.S2 — Match notification trigger

- **Depends on:** P7.S1, P6.S3.
- **Verify:** a new match creates exactly one notification for each owner.

#### P7.S3 — Notification bell with Realtime

- **Affects:** `src/components/notifications/notification-bell.tsx`, header.
- **Verify:** creating a matching item in another browser updates the bell without a reload; the subscription is removed on sign out.

#### P7.S4 — Notifications page

- **Affects:** `(app)/notifications/page.tsx`, `src/actions/notifications.ts`, `messages/*.json` (`Notifications`).
- **Verify:** list, mark read, mark all read; links go to the right item/match.

#### P7.S5 — (Optional) Email for new matches

- **Affects:** `src/app/api/webhooks/match-email/route.ts`, Supabase database webhook, env secret.
- **Verify:** only if implemented; email in the user's preferred language.

**Definition of done — Phase 7:** real-time match notifications with history and read state.

---

### Phase 8 — Messaging — `NOT STARTED`

**Goal:** the owner of an item and an interested user can chat in real time.

#### P8.S1 — Conversations and messages schema

- **Affects:** migration `*_messaging.sql` (tables, RLS, triggers for `last_message_at` and rate limit, `my_conversations()`, `mark_conversation_read()`, realtime publication).
- **Verify:** SQL tests: non-participants see nothing; users cannot send as someone else; the owner cannot start a conversation with themselves.

#### P8.S2 — Start conversation from item

- **Affects:** `src/actions/messages.ts` (`startConversation`), item page "Contact" button.
- **Verify:** clicking twice opens the same conversation; guests go to login.

#### P8.S3 — Conversation list

- **Affects:** `(app)/messages/page.tsx`, `src/components/chat/conversation-list.tsx`, `messages/*.json` (`Messages`).
- **Verify:** ordered by latest message; unread counts correct.

#### P8.S4 — Chat view with Realtime

- **Affects:** `(app)/messages/[id]/page.tsx`, `src/components/chat/{chat-view,message-bubble,message-composer}.tsx`, `src/actions/messages.ts` (`sendMessage`).
- **Verify:** two browsers exchange messages instantly; older messages load on scroll; long text wraps.

#### P8.S5 — Read state and unread badge

- **Verify:** opening a chat clears its unread count; the header badge updates.

#### P8.S6 — Message notifications

- **Depends on:** Phase 7.
- **Verify:** one unread notification per conversation, not one per message.

**Definition of done — Phase 8:** real-time chat per item, secure (RLS tests), with unread state and notifications.

---

### Phase 9 — Favorites — `NOT STARTED`

#### P9.S1 — Favorites schema

- **Affects:** migration `*_favorites.sql`; `search_items` returns `is_favorite`.
- **Verify:** SQL tests: only own favorites visible/changeable.

#### P9.S2 — Favorite toggle

- **Affects:** `src/components/favorites/favorite-button.tsx`, `src/actions/favorites.ts`, item card and item page.
- **Verify:** optimistic toggle; guests redirected to login.

#### P9.S3 — Favorites page

- **Affects:** `(app)/favorites/page.tsx`, `messages/*.json` (`Favorites`).
- **Verify:** hidden/deleted items disappear from the list.

**Definition of done — Phase 9:** favorites tied to the account and consistent across devices.

---

### Phase 10 — Admin and moderation — `NOT STARTED`

#### P10.S1 — Reports schema and admin policies

- **Affects:** migration `*_moderation.sql` (enums, `reports`, admin policies on reports/categories/profiles — item admin policies already exist since P3.S1, and `deleteItem` already works for admins (P3.S7), `admin_set_banned()`, `admin_stats()`, moderation notification trigger).
- **Verify:** SQL tests: non-admins cannot read others' reports or call admin RPCs; banned user cannot insert anything.

#### P10.S2 — Report item UI

- **Affects:** `src/components/moderation/report-dialog.tsx`, `src/actions/reports.ts`.
- **Verify:** one open report per user per item; confirmation shown.

#### P10.S3 — Admin area layout and dashboard

- **Affects:** `src/app/[locale]/admin/{layout,page}.tsx`, `messages/*.json` (`Admin`).
- **Manual:** make your account admin with SQL.
- **Verify:** non-admins get 404; stats are correct.

#### P10.S4 — Reports queue and item moderation

- **Affects:** `admin/reports/page.tsx`, `src/actions/admin.ts`.
- **Verify:** hide/restore item; resolve/dismiss report; owner gets a moderation notification.

#### P10.S5 — User management

- **Affects:** `admin/users/page.tsx`.
- **Verify:** banning blocks writes immediately; the banned user sees a banner.

#### P10.S6 — Category management

- **Affects:** `admin/categories/page.tsx`, categories policies.
- **Verify:** add/rename/reorder; a category in use cannot be deleted.

**Definition of done — Phase 10:** moderation loop (report → review → action → notification) works and is protected by RLS.

---

### Phase 11 — UI polish, testing and final delivery — `NOT STARTED`

#### P11.S1 — Dark mode

- **Affects:** `next-themes` `ThemeProvider` in the layout, theme toggle in the header.
- **Verify:** no flash of the wrong theme; toasts follow the theme.

#### P11.S2 — Responsive, accessibility, error boundaries

- **Affects:** `error.tsx`, `loading.tsx` per segment, focus states, labels, contrast.
- **Verify:** keyboard-only walkthrough; Lighthouse accessibility ≥ 90; 360 px width works.

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

| ID   | Finding                                                                                                                                                                                                                                                                                                                                                                                     | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Status        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| F-01 | next/font variable was named `--font-sans` while `@theme` also defined `--font-sans: var(--font-sans)` on `:root`. It only worked because unlayered CSS wins over the theme layer.                                                                                                                                                                                                          | Renamed the font variable to `--font-inter`; `--font-sans` now references it (AD-19).                                                                                                                                                                                                                                                                                                                                                                       | Fixed         |
| F-02 | `supabase/config.toml` holds CLI defaults (`site_url` 127.0.0.1, confirmations off, password length 6) that differ from the hosted project.                                                                                                                                                                                                                                                 | Keep the file (the CLI needs it); it is not a source of truth. Never run `supabase config push` (§8).                                                                                                                                                                                                                                                                                                                                                       | Documented    |
| F-03 | Supabase grants `anon`/`authenticated` all table privileges (INSERT, UPDATE, DELETE, …) on `public` tables by default; the anonymous insert into `categories` was stopped by RLS, not by privileges. The migration's `grant select` is therefore redundant.                                                                                                                                 | Keep defaults; RLS on every table is mandatory (§11), column grants where needed. Applied migration not edited.                                                                                                                                                                                                                                                                                                                                             | Documented    |
| F-04 | `NextIntlClientProvider` sends all messages to the browser.                                                                                                                                                                                                                                                                                                                                 | Fine while small; limit client namespaces in P11.S3.                                                                                                                                                                                                                                                                                                                                                                                                        | Open (P11.S3) |
| F-05 | The Supabase URL was configured with `/rest/v1/`, which broke all queries.                                                                                                                                                                                                                                                                                                                  | Fixed in `.env.local`; `env.ts` now rejects URLs with a path.                                                                                                                                                                                                                                                                                                                                                                                               | Fixed         |
| F-06 | Default branch is `main` (an earlier instruction said `master`). No GitHub remote yet.                                                                                                                                                                                                                                                                                                      | Use `main`; remote `origin` = github.com/BlagojPetrov/findly-web, pushed 2026-09-24.                                                                                                                                                                                                                                                                                                                                                                        | Fixed         |
| F-07 | Hosted minimum password length is 6.                                                                                                                                                                                                                                                                                                                                                        | Raise to 8 in P2.S4.                                                                                                                                                                                                                                                                                                                                                                                                                                        | Open (P2.S4)  |
| F-08 | Built-in Supabase email only delivers to project team members.                                                                                                                                                                                                                                                                                                                              | Custom SMTP (Brevo) configured in P2.S9.                                                                                                                                                                                                                                                                                                                                                                                                                    | Fixed         |
| F-15 | Registration failed on the first attempt with `429 over_email_send_rate_limit` ("email rate limit exceeded"). Verified: one submit = one server action = one `signUp` call; no user created. Cause: the project-wide email quota of the built-in Supabase mailer (a few emails per hour for the whole project), not our code. Our code showed it as "too many attempts" and did not log it. | Separate error code `email_rate_limited` with an accurate message; `authFailure()` now logs operational auth errors (rate limits, email failures, unknown) without the email address. Real fix: custom SMTP (P2.S9) and the email rate limit in Supabase → Authentication → Rate Limits.                                                                                                                                                                    | Fixed         |
| F-16 | "Register does nothing": after the account was deleted while the browser kept its session, the header (profile lookup) showed guest links but the proxy (JWT claims only — a JWT stays valid up to an hour) still treated the visitor as signed in and redirected `/register` and `/login` to `/`. Reproduced in the browser (RSC request `307 /register → /`).                             | On `/login` and `/register` only, the proxy now also calls `getUser()` when claims exist and, on a definitive 401/403, clears the session (`signOut({ scope: "local" })`) and treats the visitor as a guest; network errors never sign anyone out. Other pages keep the fast claims check; protected pages still reach `/login` via `requireUser()`.                                                                                                        | Fixed         |
| F-17 | Base UI logs "changing the default value state of an uncontrolled FieldControl" when a form keeps entered values after a failed submit (`defaultValue` changes). Submitting and the kept values work; it is a dev-console warning.                                                                                                                                                          | Root cause: Base UI `FieldControl` (`useControlled`) reads `defaultValue` only on mount and warns when it changes; our forms refill values after a failed submit by passing a new `defaultValue` (`undefined` → entered value). `FormField` now keys the input on its `defaultValue`, so a new value remounts the input instead of changing it. Reproduced on the dev server before the fix (forgot-password, login) and gone after; kept values unchanged. | Fixed         |
| F-18 | Google sign-in cannot pass our metadata, so a new Google user's profile gets `preferred_locale = 'mk'` whatever language they used, and their auth emails (templates read `.Data.locale`) are Macedonian.                                                                                                                                                                                   | The profile page (P2.S8) lets users choose the email language; `updateProfile` writes it to both `profiles.preferred_locale` and `user_metadata.locale` (read by the templates). New Google users still start with `mk` until they change it.                                                                                                                                                                                                               | Fixed (P2.S8) |
| F-09 | `supabase login` fails in non-interactive shells.                                                                                                                                                                                                                                                                                                                                           | Run it in a normal terminal (documented in §8 and `CLAUDE.md`).                                                                                                                                                                                                                                                                                                                                                                                             | Documented    |
| F-11 | `supabase migration new` names files with the **UTC** time, but the init migration was named with the local date (`20260924000000`). Until 2026-09-24 00:00 UTC new files would sort before it.                                                                                                                                                                                             | New migrations must sort after the latest existing file; the profiles migration was renamed to `20260924000100`. Check the name after every `db:new`.                                                                                                                                                                                                                                                                                                       | Documented    |
| F-13 | next-intl locale detection is on: a visitor whose browser prefers English (`Accept-Language`) or who last used English (`NEXT_LOCALE` cookie) is redirected from `/…` to `/en/…`. `/` is therefore not always Macedonian.                                                                                                                                                                   | **Decision needed.** Keep (standard, convenient) or set `localeDetection: false` in `src/i18n/routing.ts` so `/` is always Macedonian and English only via the switcher. Recommendation: disable, for a Macedonian-first site with predictable URLs.                                                                                                                                                                                                        | Open          |
| F-14 | Next.js renders a hidden route announcer with `role="alert"`.                                                                                                                                                                                                                                                                                                                               | Browser tests must look for alerts inside the form (`form [role=alert]`).                                                                                                                                                                                                                                                                                                                                                                                   | Documented    |
| F-12 | Advisors warn that `current_profile()` (a `security definer` function in `public`) is callable by `anon`/`authenticated`.                                                                                                                                                                                                                                                                   | Intentional: it returns only the caller's own row (nothing for anon). Accepted warning.                                                                                                                                                                                                                                                                                                                                                                     | Accepted      |
| F-19 | Advisors warn "Leaked password protection disabled" (HaveIBeenPwned check of new passwords). Noticed during P2.S8.                                                                                                                                                                                                                                                                          | Optional: enable it in Supabase → Authentication (password security) if the plan allows it; rejected passwords already show `weak_password`.                                                                                                                                                                                                                                                                                                                | Open          |
| F-20 | Deleting an auth user (dashboard or SQL) removes the profile but not the user's files in Storage: the owner's old avatar stayed in `avatars` as an orphan after the account was recreated (2026-09-26).                                                                                                                                                                                     | Clean up files when account deletion is implemented (admin user management, P10.S5, or a self-service delete); the orphan was left in place (user data).                                                                                                                                                                                                                                                                                                    | Open          |
| F-21 | Photos are uploaded before the item is saved (the item id is generated in the browser). If the user abandons the form, or the create action fails, the uploaded files stay in `item-images` without an `item_images` row. Removing a photo in the picker deletes its file; abandoned forms cannot. Noticed in P3.S4.                                                                        | Acceptable for now (files are small). The create action does **not** delete them on failure, because the form keeps the photos for the next attempt (P3.S5). Deleting an item now removes every file in its folder, including such uploads (P3.S7). Option for abandoned new items: a periodic clean-up of files older than a day without an `item_images` row (scheduled SQL job or admin action, P10/P11).                                                | Open          |
| F-22 | Local `next build` (Turbopack) fails on the development machine: Windows Application Control blocks the native `@next/swc-win32-x64-msvc` binary, Next falls back to WASM bindings, and Turbopack requires native ones. Seen first in P3.S8 (earlier steps built normally). Lint, typecheck and tests are unaffected; Vercel builds on Linux.                                               | Code is unaffected. Locally, verify with `npx next build --webpack` until the policy allows the file (user: Windows Security → App & browser control, or reinstall `node_modules`). Scripts stay unchanged.                                                                                                                                                                                                                                                 | Open          |
| F-23 | A `loading.tsx` or a Suspense fallback on a page streams the fallback first on a full page load; the real content is swapped in by inline JavaScript. Without JavaScript (and for crawlers that do not run it) the page stays on the fallback, and a `redirect()` after the fallback is a streamed client redirect instead of HTTP 307. Found in P4.S5 on `/items`.                         | Pages that must work without JavaScript or redirect canonically (`/items`, later public pages) render without a fallback; show pending state with `useLinkStatus`/`useFormStatus` markers instead (P4.S5). Keep this in mind for P11.S* ("`loading.tsx` per segment"): only on pages where that is acceptable (e.g. signed-in pages).                                                                                                                       | Documented    |
| F-10 | No automated tests yet.                                                                                                                                                                                                                                                                                                                                                                     | Vitest added in P2.S1; SQL tests from P2.S2.                                                                                                                                                                                                                                                                                                                                                                                                                | Fixed         |

---

## 24. Changelog

| Date       | Step      | Change                                                                                                                                                                                                                                   |
| ---------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-28 | P5.S2     | Location picker: `@/lib/geocoding` (Nominatim search/reverse, shared 1.1 s throttle, cache, short labels; 14 unit tests), `LocationPicker` (search, my location, click/drag pin, editable address, hidden lat/lng); browser check 44/44. |
| 2026-09-28 | P5.S1     | Leaflet base map: `leaflet` + `react-leaflet` 5, `BaseMap` (OSM tiles, attribution, bundled marker icons), client-only loading via `index.tsx`, `MapFrame`, `@/lib/map`; browser check 28/28. Phase 5 started.                           |
| 2026-09-28 | P4.S7     | Home page: hero search, latest 4 lost/found (swipe row on phones), category links to the feed; browser check 34/34. Phase 4 done.                                                                                                        |
| 2026-09-28 | P4.S6     | SEO: `@/lib/seo` helpers, item metadata (canonical, hreflang, OG/Twitter with cover photo), feed/home alternates, search `noindex`, `sitemap.ts` (active items, hourly), `robots.ts`; check 69/69.                                       |
| 2026-09-28 | P4.S5     | Feed pagination (filters kept, past-the-end → last page), result range, empty states with actions, navigation-pending dimming instead of `loading.tsx` (keeps no-JS + 307s); browser check 48/48.                                        |
| 2026-09-28 | P4.S4     | `/items` feed: `searchItems`, `next/form` filters (work without JS), canonical-URL redirect, header link; no sort without a query; browser check 43/43.                                                                                  |
| 2026-09-28 | P4.S3     | Search params: `parseSearchParams` (per-field fallbacks), `searchQuery` (canonical URLs); 46 unit tests.                                                                                                                                 |
| 2026-09-28 | P4.S2     | `search_items()`: text (full text + typos), type/category/status/date filters, newest/relevance, pagination capped at 50; SQL tests 7/7.                                                                                                 |
| 2026-09-28 | P4.S1     | `normalize_text()` (Cyrillic/Latin/diacritics/digraphs), `search_text` trigger, `search_vector`, GIN indexes, backfill; SQL tests 6/6.                                                                                                   |
| 2026-09-27 | P3.S8     | Dashboard: `getOwnItems`, `ItemCard`, status tabs, compact quick actions, empty state; sign-in lands on `/dashboard`; F-22; browser check 40/40. Phase 3 done.                                                                           |
| 2026-09-27 | P3.S7     | Edit page (`ItemForm` edit mode), `update_item()` migration + SQL tests, `updateItem`/`setItemStatus`/`deleteItem`, owner actions with delete dialog; browser check 27/27.                                                               |
| 2026-09-27 | P3.S6     | Item detail page: `getItem`, gallery, type badge, lost/found tokens, owner panel (edit link), 404 for hidden/invalid; browser check 25/25.                                                                                               |
| 2026-09-27 | P3.S5     | Create item page: `ItemForm`, `createItem` (checks uploaded photos exist, `create_item`), `itemWriteFailure`, `getCategories`, `FormTextareaField`, user-menu link; browser check 27/27.                                                 |
| 2026-09-26 | P3.S4     | `ImagePicker` (WebP ≤ 1600 px, upload with progress via XHR, reorder, remove, retry, limits) and `src/lib/item-images.ts`; verified in the browser (5.55 MB → 231 KB).                                                                   |
| 2026-09-26 | P3.S3     | `itemSchema()` (Zod) mirroring the DB rules, `isOwnItemImagePath`, `todayInAppTimeZone()` (Europe/Skopje), 13 `Validation` messages in mk/en; 49 new unit tests.                                                                         |
| 2026-09-26 | P3.S2     | Public `item-images` bucket (5 MB, WebP/JPEG) with owner/admin storage policies; SQL tests and a real Storage API check (own folder, other folder, overwrite, PNG, 6 MB).                                                                |
| 2026-09-26 | P3.S1     | `items`, `item_images`, enums, triggers (resolved_at, no future date in Skopje time, 20 items/24 h), RLS + column grants incl. admin hide, `create_item()` RPC; SQL tests. Phase 3 started.                                              |
| 2026-09-26 | P2.S10    | Deployed to https://findly-web-nine.vercel.app; production checks and profile suite 70/70; real registration, reset and Google sign-in confirmed → COMPLETED. Phase 2 completed.                                                         |
| 2026-09-25 | P2.S10    | Deployment prep: templates link to `RedirectTo` (works for local + Vercel), site URL fallback to the Vercel domain, `fra1` region, README; Vercel import + template re-paste pending (NEEDS REVIEW).                                     |
| 2026-09-25 | P2.S8 UI  | Profile page redesigned as a settings page (header card, personal information, account, security); functionality unchanged.                                                                                                              |
| 2026-09-25 | P2.S8     | Profile page: name, email language (also for auth emails, F-18), avatar upload to the new `avatars` bucket, change password, profile link in the menu.                                                                                   |
| 2026-09-24 | P1.S1–S8  | Project scaffold, i18n, Supabase clients, env validation, init migration, home page, project linked.                                                                                                                                     |
| 2026-09-24 | —         | Fixed Supabase URL misconfiguration; URL validation; generated types committed.                                                                                                                                                          |
| 2026-09-24 | P1.S9     | Phase 1 audit, master plan created, `CLAUDE.md` project guide, font variable fix.                                                                                                                                                        |
| 2026-09-24 | P2.S10    | GitHub repository created and `main` pushed (Vercel part still open).                                                                                                                                                                    |
| 2026-09-24 | P2.S1     | Vitest, `ActionResult` helpers, `safeRedirectPath`, translation parity tests, `Errors` messages.                                                                                                                                         |
| 2026-09-24 | P2.S2     | `profiles`, sign-up trigger, `private.is_admin/can_write`, `current_profile()`, column-level privileges, SQL test runner.                                                                                                                |
| 2026-09-24 | P2.S3     | `getCurrentUser`/`requireUser`/`requireAdmin` (server-only DAL), route rules in `auth-routes.ts`, proxy auth redirects.                                                                                                                  |
| 2026-09-24 | P2.S4     | Login, register and verify-email pages, auth actions, form components, user menu; 3 bugs found in browser testing fixed.                                                                                                                 |
| 2026-09-24 | P2.S9     | Custom SMTP (Brevo) configured by the user; verified with a real registration.                                                                                                                                                           |
| 2026-09-24 | P2.S5     | Confirmation route, resend with cooldown, invalid-link page, bilingual confirm template; template paste pending (NEEDS REVIEW).                                                                                                          |
| 2026-09-24 | P2.S5     | Confirm-signup template pasted by the user and verified with a real registration → COMPLETED.                                                                                                                                            |
| 2026-09-24 | P2.S6/S7  | Manual parts done by the user (reset-password template, Google OAuth client + provider) and verified → COMPLETED.                                                                                                                        |
| 2026-09-24 | P2.S7     | Google sign-in button, OAuth callback with cancel/failure messages; Google Cloud + Supabase provider setup pending (NEEDS REVIEW).                                                                                                       |
| 2026-09-24 | F-17 fix  | Base UI "default value state of an uncontrolled FieldControl" warning: `FormField` remounts the input when `defaultValue` changes.                                                                                                       |
| 2026-09-24 | P2.S6     | Forgot/reset password pages and actions, recovery link routing, other sessions signed out, bilingual template; template paste pending (NEEDS REVIEW).                                                                                    |
| 2026-09-24 | P2.S5 fix | Stale session after account deletion locked users out of /login and /register (F-16); proxy verifies the user there. Full registration flow re-tested.                                                                                   |
| 2026-09-24 | plan      | P2.S9 (SMTP) moved before P2.S5; email templates moved into P2.S5/P2.S6; Brevo chosen.                                                                                                                                                   |
| 2026-09-24 | P2.S4 fix | Diagnosed sign-up 429 (project email quota, F-15); `email_rate_limited` error code; operational auth errors logged.                                                                                                                      |

---

## 25. Next Recommended Step

**P5.S3 — Location in item forms; make location required** (see §22, Phase 5).

Why next: the picker exists (P5.S2) but no report stores coordinates yet, and
the matching phase needs a location on every item. P5.S3 replaces the item
form's `locationName` field with `LocationPicker` (with the privacy note for
found items from §13), passes `lat`/`lng` from `itemSchema` to `create_item` /
`update_item` (new migration: location parameters, `ST_MakePoint(lng, lat)`),
returns the stored point for the edit page, and makes `items.location`
`not null` after backfilling or deleting the existing test rows without one
(check the owner's real items first).

Open manual items:

- Set the minimum password length to 8 in the Supabase dashboard (F-07).
- Decide on locale detection (F-13).
- Optional: leaked password protection (F-19).
- Local Turbopack build blocked by Windows Application Control (F-22).
