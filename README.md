# Findly Web

Веб-платформа за управување и автоматско поврзување на пријави за изгубени и пронајдени предмети.

A web platform for reporting lost and found items with automatic matching of reports.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript
- **Tailwind CSS 4** + shadcn/ui components
- **Supabase**: PostgreSQL (PostGIS, pg_trgm), Auth, Storage, Realtime
- **next-intl**: Macedonian (default, `/`) and English (`/en`)
- **Leaflet + OpenStreetMap** for maps
- Deployed on **Vercel**

## Project structure

```
messages/              translations (mk.json, en.json)
src/app/[locale]/      pages, all routes are localized
src/components/ui/     shadcn/ui components
src/components/        app components grouped by feature
src/i18n/              locale routing and locale-aware navigation
src/lib/supabase/      Supabase clients (server, browser, proxy session refresh)
src/lib/env.ts         validated environment variables
src/proxy.ts           i18n routing + Supabase session refresh on every request
src/types/database.ts  generated database types
supabase/migrations/   SQL migrations (schema, RLS policies, functions)
```

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase values.
3. Link the Supabase project and apply migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npm run db:push
   npm run db:types
   ```
4. Start the dev server: `npm run dev` → http://localhost:3000

## Scripts

| Script              | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the development server                         |
| `npm run build`     | Production build                                     |
| `npm run lint`      | ESLint                                               |
| `npm run typecheck` | TypeScript check                                     |
| `npm run format`    | Prettier                                             |
| `npm run db:new`    | Create a new migration: `npm run db:new -- <name>`   |
| `npm run db:push`   | Apply pending migrations to the linked project       |
| `npm run db:types`  | Regenerate `src/types/database.ts` from the database |
