# Findly Web — Master Project Plan

> **Веб-платформа за управување и автоматско поврзување на пријави за изгубени и пронајдени предмети**
>
> This document is the single source of truth for the architecture, roadmap and
> progress of the Findly web project. Every step starts by reading it and ends by
> updating it.

- **Last updated:** 2026-09-24
- **Current phase:** Phase 2 — Authentication (in progress)
- **Next step:** P2.S5 (§22)

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
| 2     | Authentication                        | `IN PROGRESS` |
| 3     | Items CRUD and image upload           | `NOT STARTED` |
| 4     | Feed, search and advanced filters     | `NOT STARTED` |
| 5     | Map and location                      | `NOT STARTED` |
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
| P2.S5  | Email verification                             | `NOT STARTED` |
| P2.S6  | Forgot / reset password                        | `NOT STARTED` |
| P2.S7  | Google OAuth                                   | `NOT STARTED` |
| P2.S8  | Profile page and avatar upload                 | `NOT STARTED` |
| P2.S9  | SMTP and email templates (manual)              | `NOT STARTED` |
| P2.S10 | GitHub remote and first Vercel deployment      | `IN PROGRESS` |
| P3.S1  | Items and images schema                        | `NOT STARTED` |
| P3.S2  | Item images storage bucket                     | `NOT STARTED` |
| P3.S3  | Item validation schemas                        | `NOT STARTED` |
| P3.S4  | Image picker and upload component              | `NOT STARTED` |
| P3.S5  | Create item page                               | `NOT STARTED` |
| P3.S6  | Item detail page (basic)                       | `NOT STARTED` |
| P3.S7  | Edit, delete, mark resolved                    | `NOT STARTED` |
| P3.S8  | Dashboard ("My reports")                       | `NOT STARTED` |
| P4.S1  | Search normalization and indexes               | `NOT STARTED` |
| P4.S2  | `search_items` SQL function                    | `NOT STARTED` |
| P4.S3  | Search params schema and parsing               | `NOT STARTED` |
| P4.S4  | Items feed page with filters                   | `NOT STARTED` |
| P4.S5  | Item cards, pagination, empty/loading states   | `NOT STARTED` |
| P4.S6  | SEO: metadata, Open Graph, sitemap, robots     | `NOT STARTED` |
| P4.S7  | Home page latest items                         | `NOT STARTED` |
| P5.S1  | Leaflet base map component                     | `NOT STARTED` |
| P5.S2  | Location picker and geocoding                  | `NOT STARTED` |
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

| Bucket        | Public read | Write rule                                                        | Phase |
| ------------- | ----------- | ----------------------------------------------------------------- | ----- |
| `avatars`     | yes         | Path `{user_id}/...`; only the owner can insert/update/delete.    | 2     |
| `item-images` | yes         | Path `{user_id}/{item_id}/...`; only the owner; max 5 MB, images. | 3     |

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
| `avatar_path`              | text null   | Storage path in `avatars` (not a URL)        |
| `preferred_locale`         | text        | `mk` \| `en`, default `mk` (for emails)      |
| `role`                     | user_role   | default `user`; not updatable by users       |
| `is_banned`                | boolean     | default false; not updatable by users        |
| `created_at`, `updated_at` | timestamptz |                                              |

### `items` (P3.S1, extended in P4.S1 and P5.S3)

| Column                     | Type                  | Notes                                                                        |
| -------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `id`                       | uuid PK               |                                                                              |
| `user_id`                  | uuid                  | FK → profiles on delete cascade                                              |
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
`(category_id)`, GiST on `location`, GIN on `search_vector`, GIN trigram on
`search_text`.

### `item_images` (P3.S1)

| Column         | Type        | Notes                                     |
| -------------- | ----------- | ----------------------------------------- |
| `id`           | uuid PK     |                                           |
| `item_id`      | uuid        | FK → items on delete cascade              |
| `storage_path` | text        | unique; `{user_id}/{item_id}/{uuid}.webp` |
| `position`     | smallint    | 0–4; unique per item; 0 = cover image     |
| `created_at`   | timestamptz |                                           |

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
   `AFTER_SIGN_IN_PATH` (currently `/`, becomes `/dashboard` in P3.S8).
   Rules live in `src/lib/auth-routes.ts` (pure, unit-tested); the path is
   URL-decoded before matching. **New protected routes must be added there.**
2. **Server (authoritative):** `getCurrentUser()` / `requireUser(next?)` /
   `requireAdmin(next?)` in `src/lib/auth.ts` (`server-only`, React
   `cache()` per request), called in protected layouts/pages and in every action.
   `requireAdmin()` answers non-admins with 404.
3. **Database (final):** RLS.

### Flows

| Flow                | Implementation                                                                                                                                | Step  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Register            | Action `signUp` → `supabase.auth.signUp({ email, password, options: { data: { display_name, locale }, emailRedirectTo } })` → `/verify-email` | P2.S4 |
| Profile creation    | `handle_new_user()` trigger copies `display_name` (or Google `full_name`) and `locale` from metadata                                          | P2.S2 |
| Login               | Action `signIn` → `signInWithPassword`; unconfirmed email → error code `email_not_confirmed` with resend option                               | P2.S4 |
| Email confirmation  | Template link → `/api/auth/confirm?token_hash=…&type=email&next=/dashboard` → `verifyOtp`                                                     | P2.S5 |
| Resend confirmation | Action `resendConfirmation` → `auth.resend({ type: "signup" })`                                                                               | P2.S5 |
| Forgot password     | Action → `resetPasswordForEmail(email, { redirectTo: /api/auth/confirm?next=/reset-password })`                                               | P2.S6 |
| Reset password      | `/reset-password` (recovery session) → action `updateUser({ password })`                                                                      | P2.S6 |
| Google              | `signInWithOAuth({ provider: "google", options: { redirectTo: /api/auth/callback?next=… } })` → `exchangeCodeForSession`                      | P2.S7 |
| Logout              | Action `signOut` → redirect home                                                                                                              | P2.S4 |

Messages from auth actions are generic where needed (for example, "forgot
password" always reports success, so emails cannot be enumerated).

### Hosted auth settings (Supabase dashboard)

| Setting                 | Current (verified 2026-09-24)   | Target                                   | Step      |
| ----------------------- | ------------------------------- | ---------------------------------------- | --------- |
| Email provider          | enabled                         | enabled                                  | —         |
| Confirm email           | on (`mailer_autoconfirm=false`) | on                                       | —         |
| Google provider         | off                             | on                                       | P2.S7     |
| Anonymous sign-ins      | off                             | off                                      | —         |
| Minimum password length | 6 (default)                     | 8                                        | P2.S4     |
| Site URL                | default                         | `http://localhost:3000`, prod URL in P11 | P2.S5     |
| Redirect URLs           | —                               | `http://localhost:3000/**`, Vercel URLs  | P2.S5/S10 |
| SMTP                    | built-in                        | custom (Brevo or Resend)                 | P2.S9     |
| Email templates         | default                         | token_hash links, mk + en text           | P2.S5/S9  |

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
| items         | `status in (active, resolved)` or own or admin                                                                      | own `user_id` and `can_write()`                 | own and `can_write()` (status `hidden` only by admin)        | own or admin             |
| item_images   | if parent item visible                                                                                              | parent item owned                               | parent item owned                                            | parent item owned        |
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

`normalize_text(text) returns text immutable`:

1. `lower()`
2. `extensions.unaccent()` (wrapped in an immutable function)
3. Macedonian Cyrillic → Latin transliteration with `translate()` plus
   replacements for multi-letter pairs (ж→zh, ч→ch, ш→sh, џ→dzh, ѓ→gj, ќ→kj,
   љ→lj, њ→nj, ѕ→dz).
4. Collapse whitespace.

The same function normalizes the stored `search_text` and the user's query, so
"telefon", "Телефон" and "TELEFON" all match.

### `search_items` (P4.S2)

```
search_items(
  q text default null, item_type item_type default null, category_slugs text[] default null,
  status item_status default 'active', date_from date default null, date_to date default null,
  near_lat float default null, near_lng float default null, radius_km float default null,  -- P5.S5
  sort text default 'newest',   -- newest | relevance | nearest
  page_size int default 20, page int default 1
) returns table (... item columns, cover_path, distance_km, total_count bigint)
```

- `security invoker` → RLS still applies (hidden items never returned).
- Text: `search_vector @@ websearch_to_tsquery('simple', normalize_text(q))` OR
  `word_similarity(normalize_text(q), search_text) > 0.4` (catches typos);
  relevance = `ts_rank + word_similarity`.
- Radius: `ST_DWithin(location, ST_MakePoint(lng, lat)::geography, radius_km * 1000)`.
- Pagination: offset/limit with `count(*) over ()` for the total. Page size is
  capped at 50.

### URL contract (P4.S3)

`/items?q=&type=lost|found&category=keys,wallet&status=active|resolved&from=YYYY-MM-DD&to=YYYY-MM-DD&lat=&lng=&radius=5&sort=newest&page=2`

Parsed with a Zod schema (`src/lib/validation/search.ts`); invalid values fall
back to defaults instead of throwing. The same schema serializes filters back
into URLs (filter form, pagination, locale switcher keeps them).

---

## 13. Map and location architecture

- Libraries: `leaflet`, `react-leaflet`; optional `react-leaflet-cluster` for
  `/map`. Map components are Client Components loaded with
  `next/dynamic(..., { ssr: false })` because Leaflet needs `window`.
- Tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with the required
  "© OpenStreetMap contributors" attribution. Default center: Skopje
  (41.9981, 21.4254), zoom 13; Macedonia bounds for "fit".
- **Location picker (P5.S2):** click or drag a marker; "use my location"
  (browser geolocation); address search via Nominatim
  `/search?format=jsonv2&countrycodes=mk&accept-language=<locale>` (debounced
  500 ms, minimum 3 chars); reverse geocoding fills `location_name`. Nominatim
  policy: ≤ 1 request/second, attribution, no bulk use.
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

  | Environment | Supabase project                  | Site URL                       |
  | ----------- | --------------------------------- | ------------------------------ |
  | Local       | dev (`lyvudeaxwibgpqsinqyz`)      | `http://localhost:3000`        |
  | Vercel      | dev until P11.S5, then production | `https://<project>.vercel.app` |

- **Migrations to production:** manual — `supabase link --project-ref <prod>` →
  `supabase db push` → relink dev. Never automatic from CI.
- **Vercel env vars:** the three `NEXT_PUBLIC_*` variables per environment.
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

### Phase 2 — Authentication — `NOT STARTED`

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

#### P2.S5 — Email verification — `NOT STARTED`

- **Depends on:** P2.S4.
- **Affects:** `src/app/api/auth/confirm/route.ts`, `src/app/[locale]/(auth)/verify-email/page.tsx` (exists since P2.S4; add resend), `src/actions/auth.ts` (`resendConfirmation`, `emailRedirectTo` in `signUp`), login form (link to resend when `email_not_confirmed`), Supabase dashboard (templates, URL configuration).
- **Sub-steps:**
  1. Route handler: `verifyOtp({ type, token_hash })`, redirect to a safe `next` or to an error state.
  2. `/verify-email` page: "check your inbox" + resend button (cooldown 60 s).
  3. Manual: Site URL and redirect URLs; "Confirm signup" template link → `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`.
- **Verify:** new account → email link → signed in and redirected; expired/reused link shows an error page; resend works. (Until P2.S9 the built-in SMTP delivers only to the project team's addresses, so test with your own address.)

#### P2.S6 — Forgot / reset password — `NOT STARTED`

- **Depends on:** P2.S5.
- **Affects:** `(auth)/forgot-password/page.tsx`, `(auth)/reset-password/page.tsx`, `src/actions/auth.ts`, "Reset password" email template.
- **Sub-steps:** request form (always reports success); template link through `/api/auth/confirm?type=recovery&next=/reset-password`; reset form updates the password and signs the user in.
- **Verify:** full reset flow; a reset link cannot be used twice; unknown email gives the same message as a known one.

#### P2.S7 — Google OAuth — `NOT STARTED`

- **Depends on:** P2.S4.
- **Affects:** `src/app/api/auth/callback/route.ts`, `src/components/auth/google-button.tsx`, Google Cloud Console, Supabase dashboard.
- **Sub-steps:**
  1. Manual: Google Cloud project → OAuth consent screen → Web client; authorized redirect URI `https://lyvudeaxwibgpqsinqyz.supabase.co/auth/v1/callback`; paste the client ID/secret into Supabase → Auth → Providers → Google.
  2. Button calls `signInWithOAuth` with `redirectTo` = `/api/auth/callback?next=…`.
  3. Callback exchanges the code, redirects safely.
- **Verify:** Google sign-in creates a profile with the Google name; a second sign-in reuses it; cancelling on Google returns to login with a message.

#### P2.S8 — Profile page and avatar — `NOT STARTED`

- **Depends on:** P2.S4.
- **Affects:** migration `*_avatars_bucket.sql` (bucket + storage policies), `(app)/layout.tsx`, `(app)/profile/page.tsx`, `src/actions/profile.ts`, `src/lib/validation/profile.ts`, `src/components/profile/*`, `src/lib/images.ts` (resize helper, reused in P3.S4).
- **Sub-steps:** edit display name and preferred language; avatar upload (resize to 256 px WebP, path `{uid}/avatar.webp`, upsert); change password for email users; show sign-in method; add "Profile" to the user menu and show the avatar there.
- **Verify:** changes persist; another user cannot overwrite your avatar (storage policy test); invalid names rejected.

#### P2.S9 — SMTP and email templates (manual) — `NOT STARTED`

- **Depends on:** P2.S5, P2.S6.
- **Sub-steps:** create a Brevo or Resend account (free); SMTP settings in Supabase → Auth → SMTP; sender name "Findly"; bilingual (mk first, then en) templates for confirm signup, reset password, email change.
- **Verify:** confirmation email reaches an address that is not a Supabase team member; links work; email does not land in spam (check once).

#### P2.S10 — GitHub remote and first Vercel deployment — `IN PROGRESS`

- **Depends on:** P2.S4 (can be done earlier).
- **Done (2026-09-24):** repository https://github.com/BlagojPetrov/findly-web created; `origin` added; `main` pushed and tracking `origin/main` (verified: same commit locally and remotely).
- **Sub-steps (remaining):** import into Vercel; set env vars (`NEXT_PUBLIC_SITE_URL` = Vercel URL); add the Vercel URL to Supabase redirect URLs.
- **Verify:** the deployed site loads in both languages; registration/login works on the deployed URL.

**Definition of done — Phase 2:** register → confirm email → sign in → edit
profile works in mk and en, locally and on Vercel · Google login works · password
reset works · guests are redirected from protected pages · RLS tests for profiles
pass · all checks pass · plan updated.

---

### Phase 3 — Items CRUD and image upload — `NOT STARTED`

**Goal:** signed-in users can create, edit, resolve and delete lost/found reports
with up to 5 images; everyone can view an item page.

#### P3.S1 — Items and images schema

- **Depends on:** Phase 2.
- **Affects:** migration `*_items.sql`, types, `supabase/tests/items.sql`.
- **Sub-steps:** enums `item_type`, `item_status`; tables `items`, `item_images` (§9); `updated_at` and `resolved_at` triggers; trigger rejecting future `occurred_on`; daily insert limit trigger; RLS per §11 incl. column grants; indexes; SQL function `create_item(...)` (`security invoker`) that inserts the item and its image rows in one transaction.
- **Verify:** SQL tests: owner CRUD works; other users cannot update/delete; banned user cannot insert; hidden items invisible to others; admin sees hidden items (after setting a test admin).

#### P3.S2 — Item images storage bucket

- **Depends on:** P3.S1.
- **Affects:** migration `*_item_images_bucket.sql`.
- **Sub-steps:** public bucket `item-images`, 5 MB limit, MIME `image/webp,image/jpeg,image/png`; policies: insert/update/delete only when the first path segment = `auth.uid()`.
- **Verify:** upload to your own folder works; upload into another user's folder fails.

#### P3.S3 — Item validation schemas

- **Depends on:** P3.S1.
- **Affects:** `src/lib/validation/items.ts`, tests, `messages/*.json` (`Validation`).
- **Verify:** unit tests: lengths, future date rejected, unknown category rejected, max 5 images, lat/lng ranges.

#### P3.S4 — Image picker and upload

- **Depends on:** P3.S2, P2.S8 (`src/lib/images.ts`).
- **Affects:** `src/components/items/image-picker.tsx`, `src/lib/images.ts`.
- **Sub-steps:** select/drag multiple images; preview; reorder (cover first); remove; compress to WebP ≤ 1600 px; upload to `{uid}/{itemId}/{uuid}.webp` with progress; the item ID is generated in the browser (`crypto.randomUUID()`) before upload.
- **Verify:** a 6 MB photo uploads as a few hundred KB; more than 5 images blocked; errors shown.

#### P3.S5 — Create item page

- **Depends on:** P3.S3, P3.S4.
- **Affects:** `(app)/items/new/page.tsx`, `src/components/items/item-form.tsx`, `src/actions/items.ts` (`createItem`), `messages/*.json` (`Items`).
- **Sub-steps:** type toggle (lost/found, preselected by `?type=`), title, description, category select, date, location name (text; map in P5), images; submit → `create_item` RPC → redirect to the item page.
- **Verify:** item created with images in both languages; validation errors shown per field; a guest is redirected to login.

#### P3.S6 — Item detail page (basic)

- **Depends on:** P3.S5.
- **Affects:** `src/app/[locale]/items/[id]/page.tsx`, `src/lib/queries/items.ts`, `src/components/items/{image-gallery,item-type-badge}.tsx`, lost/found color tokens in `globals.css`.
- **Verify:** public item visible to guests; hidden item gives 404 to others; owner sees edit/delete controls; invalid UUID gives 404.

#### P3.S7 — Edit, delete, mark resolved

- **Depends on:** P3.S6.
- **Affects:** `(app)/items/[id]/edit/page.tsx`, `src/actions/items.ts` (`updateItem`, `deleteItem`, `setItemStatus`), image removal from storage.
- **Verify:** only the owner can edit/delete (try another account); deleting removes storage files; resolved items show a "Resolved" badge.

#### P3.S8 — Dashboard ("My reports")

- **Depends on:** P3.S7.
- **Affects:** `(app)/dashboard/page.tsx`, `src/components/items/item-card.tsx` (reused in P4), `src/lib/auth-routes.ts` (`AFTER_SIGN_IN_PATH` → `/dashboard`).
- **Verify:** lists own items by status with quick actions; empty state links to "Report item".

**Definition of done — Phase 3:** full item lifecycle (create with images → view →
edit → resolve → delete) works for the owner and is blocked for others (UI + RLS
tests) · images compressed · both languages · checks pass.

---

### Phase 4 — Feed, search and advanced filters — `NOT STARTED`

**Goal:** a public, server-side searchable feed with filters in the URL, and SEO-ready item pages.

#### P4.S1 — Search normalization and indexes

- **Affects:** migration `*_search.sql`, `supabase/tests/search.sql`.
- **Sub-steps:** `immutable_unaccent()`, `normalize_text()` (§12); `search_text` column + trigger; `search_vector` generated column; GIN indexes; backfill existing rows.
- **Verify:** SQL tests: `normalize_text('Црн Паричник')` = `normalize_text('crn paricnik')`; typo query ranks correctly.

#### P4.S2 — `search_items` function

- **Depends on:** P4.S1.
- **Affects:** migration `*_search_items.sql`, types.
- **Verify:** SQL tests for each filter, pagination totals, hidden items excluded, page size capped at 50.

#### P4.S3 — Search params schema and parsing

- **Affects:** `src/lib/validation/search.ts`, tests.
- **Verify:** unit tests: invalid values fall back to defaults; round trip parse → serialize.

#### P4.S4 — Items feed page with filters

- **Depends on:** P4.S2, P4.S3.
- **Affects:** `src/app/[locale]/items/page.tsx`, `src/components/search/*`, `src/lib/queries/items.ts`, `messages/*.json` (`Search`), new shadcn components (select, badge, popover/calendar if needed).
- **Verify:** filters change the URL and results; back button restores filters; works without JavaScript for the basic form.

#### P4.S5 — Item cards, pagination, empty/loading states

- **Affects:** `item-card.tsx`, `pagination.tsx`, `items/loading.tsx`.
- **Verify:** responsive grid on mobile/desktop; pagination preserves filters.

#### P4.S6 — SEO

- **Affects:** `items/[id]/page.tsx` (`generateMetadata`, canonical, `alternates.languages`), `items/[id]/opengraph-image.tsx` or cover image as OG image, `src/app/sitemap.ts`, `src/app/robots.ts`, JSON-LD (optional).
- **Verify:** page source has correct title/description/OG tags in both languages; `/sitemap.xml` lists active items; `/robots.txt` disallows `/admin` and protected paths.

#### P4.S7 — Home page latest items

- **Affects:** `src/app/[locale]/page.tsx`.
- **Verify:** latest lost and found items shown; categories link to filtered feed.

**Definition of done — Phase 4:** text search works with Cyrillic, Latin and typos ·
every filter is server-side and combinable · shareable URLs · SEO tags and sitemap
present · SQL and unit tests pass.

---

### Phase 5 — Map and location — `NOT STARTED`

**Goal:** coordinates on every report, a location picker, maps on item pages, radius search and a map page.

#### P5.S1 — Leaflet base map component

- **Affects:** `package.json` (leaflet, react-leaflet, @types/leaflet), `src/components/map/base-map.tsx`, `src/components/map/index.ts` (dynamic import).
- **Verify:** map renders client-side, no SSR errors, attribution visible, marker icons load.

#### P5.S2 — Location picker and geocoding

- **Affects:** `src/components/map/location-picker.tsx`, `src/lib/geocoding.ts` (Nominatim, debounced).
- **Verify:** click/drag sets coordinates; address search and "use my location" work; reverse geocoding fills the address; ≤ 1 request/second.

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

- **Affects:** migration `*_moderation.sql` (enums, `reports`, admin policies on items/reports/categories/profiles, `admin_set_banned()`, `admin_stats()`, moderation notification trigger).
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

| ID   | Finding                                                                                                                                                                                                                                                     | Decision                                                                                                                                                                                                                                             | Status        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| F-01 | next/font variable was named `--font-sans` while `@theme` also defined `--font-sans: var(--font-sans)` on `:root`. It only worked because unlayered CSS wins over the theme layer.                                                                          | Renamed the font variable to `--font-inter`; `--font-sans` now references it (AD-19).                                                                                                                                                                | Fixed         |
| F-02 | `supabase/config.toml` holds CLI defaults (`site_url` 127.0.0.1, confirmations off, password length 6) that differ from the hosted project.                                                                                                                 | Keep the file (the CLI needs it); it is not a source of truth. Never run `supabase config push` (§8).                                                                                                                                                | Documented    |
| F-03 | Supabase grants `anon`/`authenticated` all table privileges (INSERT, UPDATE, DELETE, …) on `public` tables by default; the anonymous insert into `categories` was stopped by RLS, not by privileges. The migration's `grant select` is therefore redundant. | Keep defaults; RLS on every table is mandatory (§11), column grants where needed. Applied migration not edited.                                                                                                                                      | Documented    |
| F-04 | `NextIntlClientProvider` sends all messages to the browser.                                                                                                                                                                                                 | Fine while small; limit client namespaces in P11.S3.                                                                                                                                                                                                 | Open (P11.S3) |
| F-05 | The Supabase URL was configured with `/rest/v1/`, which broke all queries.                                                                                                                                                                                  | Fixed in `.env.local`; `env.ts` now rejects URLs with a path.                                                                                                                                                                                        | Fixed         |
| F-06 | Default branch is `main` (an earlier instruction said `master`). No GitHub remote yet.                                                                                                                                                                      | Use `main`; remote `origin` = github.com/BlagojPetrov/findly-web, pushed 2026-09-24.                                                                                                                                                                 | Fixed         |
| F-07 | Hosted minimum password length is 6.                                                                                                                                                                                                                        | Raise to 8 in P2.S4.                                                                                                                                                                                                                                 | Open (P2.S4)  |
| F-08 | Built-in Supabase email only delivers to project team members.                                                                                                                                                                                              | Custom SMTP in P2.S9; test with own address before that.                                                                                                                                                                                             | Open (P2.S9)  |
| F-09 | `supabase login` fails in non-interactive shells.                                                                                                                                                                                                           | Run it in a normal terminal (documented in §8 and `CLAUDE.md`).                                                                                                                                                                                      | Documented    |
| F-11 | `supabase migration new` names files with the **UTC** time, but the init migration was named with the local date (`20260924000000`). Until 2026-09-24 00:00 UTC new files would sort before it.                                                             | New migrations must sort after the latest existing file; the profiles migration was renamed to `20260924000100`. Check the name after every `db:new`.                                                                                                | Documented    |
| F-13 | next-intl locale detection is on: a visitor whose browser prefers English (`Accept-Language`) or who last used English (`NEXT_LOCALE` cookie) is redirected from `/…` to `/en/…`. `/` is therefore not always Macedonian.                                   | **Decision needed.** Keep (standard, convenient) or set `localeDetection: false` in `src/i18n/routing.ts` so `/` is always Macedonian and English only via the switcher. Recommendation: disable, for a Macedonian-first site with predictable URLs. | Open          |
| F-14 | Next.js renders a hidden route announcer with `role="alert"`.                                                                                                                                                                                               | Browser tests must look for alerts inside the form (`form [role=alert]`).                                                                                                                                                                            | Documented    |
| F-12 | Advisors warn that `current_profile()` (a `security definer` function in `public`) is callable by `anon`/`authenticated`.                                                                                                                                   | Intentional: it returns only the caller's own row (nothing for anon). Accepted warning.                                                                                                                                                              | Accepted      |
| F-10 | No automated tests yet.                                                                                                                                                                                                                                     | Vitest added in P2.S1; SQL tests from P2.S2.                                                                                                                                                                                                         | Fixed         |

---

## 24. Changelog

| Date       | Step     | Change                                                                                                                    |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-24 | P1.S1–S8 | Project scaffold, i18n, Supabase clients, env validation, init migration, home page, project linked.                      |
| 2026-09-24 | —        | Fixed Supabase URL misconfiguration; URL validation; generated types committed.                                           |
| 2026-09-24 | P1.S9    | Phase 1 audit, master plan created, `CLAUDE.md` project guide, font variable fix.                                         |
| 2026-09-24 | P2.S10   | GitHub repository created and `main` pushed (Vercel part still open).                                                     |
| 2026-09-24 | P2.S1    | Vitest, `ActionResult` helpers, `safeRedirectPath`, translation parity tests, `Errors` messages.                          |
| 2026-09-24 | P2.S2    | `profiles`, sign-up trigger, `private.is_admin/can_write`, `current_profile()`, column-level privileges, SQL test runner. |
| 2026-09-24 | P2.S3    | `getCurrentUser`/`requireUser`/`requireAdmin` (server-only DAL), route rules in `auth-routes.ts`, proxy auth redirects.   |
| 2026-09-24 | P2.S4    | Login, register and verify-email pages, auth actions, form components, user menu; 3 bugs found in browser testing fixed.  |

---

## 25. Next Recommended Step

**P2.S5 — Email verification** (see §22, Phase 2).

Why next: users can register, but the confirmation link does not sign them in
yet and there is no way to resend it.

Open items from P2.S4 (manual, not blocking P2.S5):

- Set the minimum password length to 8 in the Supabase dashboard (F-07).
- Decide on locale detection (F-13).

Manual preparation you can do in parallel:

- Create a Brevo or Resend account for SMTP (needed in P2.S9).
- Create a Google Cloud project for OAuth (needed in P2.S7).
