-- P10.S1: moderation schema (§18): reports about items, admin policies on
-- categories, admin RPCs (admin_set_banned, admin_stats) and a notification
-- for the owner when an admin hides or restores a report.

-- ---------------------------------------------------------------------------
-- Reports: a signed-in user flags another user's item. One open report per
-- user and item; an admin resolves or dismisses it (and may reopen it).
-- Deleting the item or the reporter's account removes the report; deleting
-- the admin's account keeps it (resolved_by becomes null).
-- ---------------------------------------------------------------------------
create type public.report_reason as enum
  ('spam', 'inappropriate', 'fraud', 'duplicate', 'other');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  reason public.report_reason not null,
  -- Optional; up to 500 characters and not only whitespace.
  details text
    check (details is null or (char_length(details) <= 500 and details ~ '[^[:space:]]')),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  -- Closed reports have a resolution time, open ones do not.
  constraint reports_resolved_at_check check ((status = 'open') = (resolved_at is null))
);

-- One open report per user and item (a closed one may be followed by a new one).
create unique index reports_open_reporter_item_key
  on public.reports (reporter_id, item_id) where status = 'open';
-- The admin queue (open reports, oldest first) and the cascade from items.
create index reports_item_id_idx on public.reports (item_id);
create index reports_open_created_at_idx
  on public.reports (created_at) where status = 'open';
-- The cascade from profiles (the unique index covers only open reports).
create index reports_reporter_id_idx on public.reports (reporter_id);
create index reports_resolved_by_idx on public.reports (resolved_by);

-- New reports are open; closing one records who closed it and when,
-- reopening clears both. The API cannot write these columns otherwise
-- (column privileges); the "on delete set null" of resolved_by does not
-- touch status, so it does not run this trigger.
create function private.reports_set_resolution()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'open';
    new.resolved_by := null;
    new.resolved_at := null;
  elsif new.status is distinct from old.status then
    if new.status = 'open' then
      new.resolved_by := null;
      new.resolved_at := null;
    else
      new.resolved_by := (select auth.uid());
      new.resolved_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger reports_set_resolution
  before insert or update of status on public.reports
  for each row execute function private.reports_set_resolution();

revoke execute on function private.reports_set_resolution() from public, anon, authenticated;

-- Security. Privileges are reset (Supabase grants everything by default):
-- signed-in users read and file reports; only the status changes (admins);
-- nobody deletes through the API.
-- Policies: users see their own reports, admins all. Filing requires
-- can_write() and an item of another user that is visible and not hidden
-- (the items select policy applies inside the check). Only admins update.
alter table public.reports enable row level security;

revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, item_id, reason, details) on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

create policy "Users see their own reports, admins all"
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));

create policy "Users can report other users' visible items"
  on public.reports for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (select private.can_write())
    and exists (
      select 1
      from public.items as i
      where i.id = item_id
        and i.status <> 'hidden'
        and i.user_id <> (select auth.uid())
    )
  );

create policy "Admins can change the status of reports"
  on public.reports for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Categories: admins add, edit and delete them (P10.S6 builds the UI).
-- A category that items use cannot be deleted (items.category_id is
-- "on delete restrict"). Privileges are reset, as for every other table.
-- ---------------------------------------------------------------------------
revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
grant insert (slug, name_mk, name_en, icon, sort_order),
  update (slug, name_mk, name_en, icon, sort_order),
  delete
  on public.categories to authenticated;

create policy "Admins can add categories"
  on public.categories for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can update categories"
  on public.categories for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete categories"
  on public.categories for delete
  to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Hidden items remember whether they were resolved, so restoring one can
-- return it to its previous status (resolved when resolved_at is set,
-- otherwise active) and keep the original resolution time. As in
-- 20260926180914_items.sql otherwise: resolved_at is set when an item becomes
-- resolved and cleared when it becomes active.
-- ---------------------------------------------------------------------------
create or replace function private.items_set_resolved_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'resolved' then
    if tg_op = 'INSERT' then
      new.resolved_at = now();
    elsif old.status = 'hidden' and old.resolved_at is not null then
      new.resolved_at = old.resolved_at;
    elsif old.status is distinct from 'resolved' then
      new.resolved_at = now();
    end if;
  elsif new.status = 'hidden' and tg_op = 'UPDATE' then
    new.resolved_at = old.resolved_at;
  else
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Moderation notifications: the owner learns when a report of theirs is
-- hidden or restored (only admins can do either: owners cannot set or leave
-- "hidden"). data = { item_id, action: "item_hidden" | "item_restored" };
-- the UI renders the text. Not for an admin acting on their own item.
-- ---------------------------------------------------------------------------
create function private.items_notify_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not distinct from (select auth.uid()) then
    return null;
  end if;
  insert into public.notifications (user_id, type, data)
  values (
    new.user_id,
    'moderation',
    jsonb_build_object(
      'item_id', new.id,
      'action', case when new.status = 'hidden' then 'item_hidden' else 'item_restored' end
    )
  );
  return null;
end;
$$;

create trigger items_notify_moderation
  after update of status on public.items
  for each row
  when ((old.status = 'hidden') <> (new.status = 'hidden'))
  execute function private.items_notify_moderation();

revoke execute on function private.items_notify_moderation() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_set_banned(user_id, banned): bans or unbans a user. Banned users can
-- sign in and read, but can_write() blocks their writes at once. Admins
-- cannot ban themselves or other admins. Returns the new value.
-- Errors: 42501 not an admin or target is an admin/self, P0002 unknown user.
-- ---------------------------------------------------------------------------
create function public.admin_set_banned(target_user_id uuid, banned boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.user_role;
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'admins cannot ban themselves' using errcode = '42501';
  end if;
  select role into target_role from public.profiles where id = target_user_id;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if target_role = 'admin' then
    raise exception 'admins cannot be banned' using errcode = '42501';
  end if;
  update public.profiles set is_banned = admin_set_banned.banned
  where id = target_user_id;
  return admin_set_banned.banned;
end;
$$;

revoke execute on function public.admin_set_banned(uuid, boolean) from public, anon;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_stats(): numbers for the admin dashboard (§18). security definer
-- because admins cannot read matches through RLS. Matches count every pair
-- that is not dismissed. Error 42501 for anyone but an admin.
-- ---------------------------------------------------------------------------
create function public.admin_stats()
returns table (
  users bigint,
  banned_users bigint,
  active_lost_items bigint,
  active_found_items bigint,
  hidden_items bigint,
  matches bigint,
  confirmed_matches bigint,
  open_reports bigint,
  reported_items bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles p where p.is_banned),
    (select count(*) from public.items i where i.status = 'active' and i.type = 'lost'),
    (select count(*) from public.items i where i.status = 'active' and i.type = 'found'),
    (select count(*) from public.items i where i.status = 'hidden'),
    (select count(*) from public.matches m where m.status <> 'dismissed'),
    (select count(*) from public.matches m where m.status = 'confirmed'),
    (select count(*) from public.reports r where r.status = 'open'),
    (select count(distinct r.item_id) from public.reports r where r.status = 'open');
end;
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
