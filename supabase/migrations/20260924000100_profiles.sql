-- P2.S2: user profiles, shared helper functions and profile security.

-- ---------------------------------------------------------------------------
-- Shared trigger function: keeps updated_at current. Reused by later tables.
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, created by a trigger on sign-up.
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 2 and 50),
  -- Path inside the "avatars" bucket; must be in the user's own folder.
  avatar_path text
    check (avatar_path is null or avatar_path like id::text || '/%'),
  preferred_locale text not null default 'mk'
    check (preferred_locale in ('mk', 'en')),
  role public.user_role not null default 'user',
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies in this and later migrations.
-- security definer: they read profiles without going through its policies
-- (avoids recursion) and only ever look at the current user's row.
-- ---------------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- True when a user is signed in and not banned. Every insert/update policy
-- on user content includes this check.
create function public.can_write()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and not is_banned
  );
$$;

-- Full profile of the signed-in user, including columns that other users
-- cannot read (role, is_banned, preferred_locale).
create function public.current_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Create a profile for every new auth user (email sign-up or Google).
-- Display name: sign-up form value, then Google's name, then the email's
-- local part. Locale: sent by the sign-up form, default Macedonian.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text;
begin
  name := left(btrim(coalesce(
    nullif(btrim(meta ->> 'display_name'), ''),
    nullif(btrim(meta ->> 'full_name'), ''),
    nullif(btrim(meta ->> 'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  )), 50);

  if char_length(name) < 2 then
    name := 'user-' || left(new.id::text, 8);
  end if;

  insert into public.profiles (id, display_name, preferred_locale)
  values (
    new.id,
    name,
    case when meta ->> 'locale' in ('mk', 'en') then meta ->> 'locale' else 'mk' end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger functions must not be callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Security. Supabase grants anon/authenticated full table privileges by
-- default, so privileges are reset here and granted per column:
--   * everyone may read the public columns of every profile;
--   * users may update only their own display name, avatar and language;
--   * nobody inserts or deletes through the API (trigger / cascade only);
--   * role and is_banned change only through admin functions (Phase 10).
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select (id, display_name, avatar_path, created_at)
  on public.profiles to anon, authenticated;
grant update (display_name, avatar_path, preferred_locale)
  on public.profiles to authenticated;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and public.can_write());
