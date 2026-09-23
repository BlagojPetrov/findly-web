-- Phase 1: extensions and reference data.

-- Extensions used in later phases:
--   postgis  -> item locations and radius search (Phase 5)
--   pg_trgm  -> fuzzy text search and title/description similarity (Phases 4, 6)
--   unaccent -> accent-insensitive search (Phase 4)
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Item categories. A table (not an enum) so admins can manage them later.
create table public.categories (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_mk text not null check (char_length(name_mk) between 1 and 50),
  name_en text not null check (char_length(name_en) between 1 and 50),
  icon text not null, -- lucide-react icon name
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Categories are viewable by everyone"
  on public.categories for select
  to anon, authenticated
  using (true);

grant select on public.categories to anon, authenticated;

-- Same categories as the Findly Android app.
insert into public.categories (slug, name_mk, name_en, icon, sort_order) values
  ('electronics', 'Електроника', 'Electronics', 'smartphone', 10),
  ('documents',   'Документи',   'Documents',   'file-text',  20),
  ('wallet',      'Паричник',    'Wallet',      'wallet',     30),
  ('keys',        'Клучеви',     'Keys',        'key-round',  40),
  ('accessories', 'Додатоци',    'Accessories', 'watch',      50),
  ('clothing',    'Облека',      'Clothing',    'shirt',      60),
  ('pets',        'Миленици',    'Pets',        'paw-print',  70),
  ('other',       'Друго',       'Other',       'package',    80);
