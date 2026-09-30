-- P6.S1: suggested lost ↔ found pairs (matches) and their security.
-- Rows are written only by the matching functions (P6.S3, security definer);
-- the owners of either item read them and change their status (P6.S5).

create type public.match_status as enum ('suggested', 'dismissed', 'confirmed');

-- ---------------------------------------------------------------------------
-- Matches. One row per (lost item, found item) pair. score is 0–1 and
-- breakdown holds the component scores, distance, day difference, shared
-- words and the weights version (§14). That lost_item_id is a lost item and
-- found_item_id a found item is guaranteed by the matching functions, which
-- are the only writers. The unique constraint also indexes lost_item_id.
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid not null references public.items (id) on delete cascade,
  found_item_id uuid not null references public.items (id) on delete cascade,
  score numeric(4, 3) not null check (score between 0 and 1),
  breakdown jsonb not null default '{}'
    check (jsonb_typeof(breakdown) = 'object'),
  status public.match_status not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_lost_item_id_found_item_id_key
    unique (lost_item_id, found_item_id),
  constraint matches_distinct_items check (lost_item_id <> found_item_id)
);

create index matches_found_item_id_idx on public.matches (found_item_id);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Security. Privileges are reset (Supabase grants everything by default):
-- signed-in users read matches and update only status; nobody inserts or
-- deletes (rows disappear with their items through the cascade). Anonymous
-- visitors have no access.
-- Policies: a match is visible to, and its status changeable by, the owner
-- of either item. The subqueries on items go through the items policies,
-- which always show users their own items (also hidden ones). Banned users
-- can still read but not change matches.
-- ---------------------------------------------------------------------------
alter table public.matches enable row level security;

revoke all on public.matches from anon, authenticated;
grant select on public.matches to authenticated;
grant update (status) on public.matches to authenticated;

create policy "Item owners can view their matches"
  on public.matches for select
  to authenticated
  using (
    exists (
      select 1 from public.items i
      where i.id in (lost_item_id, found_item_id)
        and i.user_id = (select auth.uid())
    )
  );

create policy "Item owners can update the status of their matches"
  on public.matches for update
  to authenticated
  using (
    exists (
      select 1 from public.items i
      where i.id in (lost_item_id, found_item_id)
        and i.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.items i
      where i.id in (lost_item_id, found_item_id)
        and i.user_id = (select auth.uid())
    )
    and (select private.can_write())
  );
