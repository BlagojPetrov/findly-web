-- P3.S1: lost/found items, their images and item security.

create type public.item_type as enum ('lost', 'found');
create type public.item_status as enum ('active', 'resolved', 'hidden');

-- ---------------------------------------------------------------------------
-- Items. The browser generates the id (crypto.randomUUID()) before uploading
-- the images, because image paths contain it ("<user id>/<item id>/<file>").
-- location stays nullable until P5.S3; search columns are added in P4.S1.
-- ---------------------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  type public.item_type not null,
  status public.item_status not null default 'active',
  title text not null
    check (char_length(btrim(title)) between 3 and 100),
  description text not null
    check (char_length(btrim(description)) between 10 and 2000),
  category_id smallint not null
    references public.categories (id) on delete restrict,
  occurred_on date not null,
  location_name text
    check (location_name is null or char_length(location_name) <= 200),
  location extensions.geography(Point, 4326),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_status_type_created_at_idx
  on public.items (status, type, created_at desc);
create index items_user_id_created_at_idx
  on public.items (user_id, created_at desc);
create index items_category_id_idx on public.items (category_id);
create index items_location_idx on public.items using gist (location);

-- ---------------------------------------------------------------------------
-- Item images. position 0 is the cover; 0–4 and unique per item, so an item
-- has at most 5 images. The unique constraint is deferrable so that images
-- can be reordered (positions swapped) in a single statement.
-- storage_path is "<user id>/<item id>/<uuid>.<webp|jpg>" in the
-- "item-images" bucket (P3.S2); the policies check the user id part.
-- ---------------------------------------------------------------------------
create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  storage_path text not null unique
    check (
      storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
      and split_part(storage_path, '/', 2) = item_id::text
    ),
  position smallint not null check (position between 0 and 4),
  created_at timestamptz not null default now(),
  constraint item_images_item_id_position_key
    unique (item_id, position) deferrable
);

-- ---------------------------------------------------------------------------
-- Triggers. Trigger functions live in "private" (not callable through the
-- API). Errors the app shows to the user have their own SQLSTATE:
--   23514 (check_violation) "occurred_on_in_future"
--   FL429                    "daily_item_limit"
-- ---------------------------------------------------------------------------
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- resolved_at follows status: set when an item becomes resolved, cleared
-- when it leaves that status.
create function private.items_set_resolved_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'resolved' then
    if tg_op = 'INSERT' or old.status is distinct from 'resolved' then
      new.resolved_at = now();
    end if;
  else
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

create trigger items_set_resolved_at
  before insert or update of status on public.items
  for each row execute function private.items_set_resolved_at();

-- Something cannot be lost or found in the future. "Today" is the date in
-- Macedonia (the database runs in UTC); the Zod schema uses the same rule.
create function private.items_check_occurred_on()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.occurred_on > (now() at time zone 'Europe/Skopje')::date then
    raise exception 'occurred_on_in_future'
      using errcode = 'check_violation',
            detail = 'occurred_on cannot be later than today (Europe/Skopje).';
  end if;
  return new;
end;
$$;

create trigger items_check_occurred_on
  before insert or update of occurred_on on public.items
  for each row execute function private.items_check_occurred_on();

-- At most 20 new items per user in 24 hours (spam protection). Counts the
-- user's existing items, which the owner can always see, so it works as
-- security invoker. Concurrent inserts may exceed the limit slightly.
create function private.items_check_daily_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.items
    where user_id = new.user_id
      and created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'daily_item_limit'
      using errcode = 'FL429',
            detail = 'A user can create at most 20 items in 24 hours.';
  end if;
  return new;
end;
$$;

create trigger items_check_daily_limit
  before insert on public.items
  for each row execute function private.items_check_daily_limit();

revoke execute on function private.items_set_resolved_at() from public, anon, authenticated;
revoke execute on function private.items_check_occurred_on() from public, anon, authenticated;
revoke execute on function private.items_check_daily_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Security. Privileges are reset (Supabase grants everything by default) and
-- granted per column where users may write only some columns:
--   * items: everyone reads; users insert and update the content columns,
--     never user_id (on update), resolved_at or the timestamps; status is
--     not insertable (always starts active);
--   * item_images: users insert rows and change only the position.
-- Policies:
--   * items are visible to everyone unless hidden; owners and admins also
--     see hidden items;
--   * owners (not banned) insert and update their items, but cannot hide
--     them or edit an item an admin has hidden; admins can update any item
--     (hide / restore);
--   * owners delete their items (also when banned or hidden); admins delete
--     any item;
--   * images follow their item: visible when the item is visible (the
--     subquery on items goes through the items policies), changed by the
--     item's owner under the same rules as the item.
-- ---------------------------------------------------------------------------
alter table public.items enable row level security;
alter table public.item_images enable row level security;

revoke all on public.items from anon, authenticated;
grant select on public.items to anon, authenticated;
grant insert (id, user_id, type, title, description, category_id,
              occurred_on, location_name, location)
  on public.items to authenticated;
grant update (type, status, title, description, category_id,
              occurred_on, location_name, location)
  on public.items to authenticated;
grant delete on public.items to authenticated;

revoke all on public.item_images from anon, authenticated;
grant select on public.item_images to anon, authenticated;
grant insert (item_id, storage_path, position) on public.item_images to authenticated;
grant update (position) on public.item_images to authenticated;
grant delete on public.item_images to authenticated;

create policy "Items are viewable unless hidden"
  on public.items for select
  to anon, authenticated
  using (
    status <> 'hidden'
    or user_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "Users can create their own items"
  on public.items for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.can_write())
  );

create policy "Owners and admins can update items"
  on public.items for update
  to authenticated
  using (
    (user_id = (select auth.uid()) and status <> 'hidden')
    or (select private.is_admin())
  )
  with check (
    (user_id = (select auth.uid()) and status <> 'hidden'
      and (select private.can_write()))
    or (select private.is_admin())
  );

create policy "Owners and admins can delete items"
  on public.items for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "Item images are viewable with their item"
  on public.item_images for select
  to anon, authenticated
  using (
    exists (select 1 from public.items i where i.id = item_id)
  );

create policy "Owners can add images to their items"
  on public.item_images for insert
  to authenticated
  with check (
    split_part(storage_path, '/', 1) = (select auth.uid())::text
    and exists (
      select 1 from public.items i
      where i.id = item_id
        and i.user_id = (select auth.uid())
        and i.status <> 'hidden'
    )
    and (select private.can_write())
  );

create policy "Owners can reorder images of their items"
  on public.item_images for update
  to authenticated
  using (
    exists (
      select 1 from public.items i
      where i.id = item_id
        and i.user_id = (select auth.uid())
        and i.status <> 'hidden'
    )
  )
  with check ((select private.can_write()));

create policy "Owners and admins can delete item images"
  on public.item_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.items i
      where i.id = item_id
        and (i.user_id = (select auth.uid()) or (select private.is_admin()))
    )
  );

-- ---------------------------------------------------------------------------
-- create_item(): creates an item and its image rows in one transaction
-- (called by the createItem action). security invoker: runs as the caller,
-- so every policy, grant and trigger above applies. image_paths are in cover
-- order; positions are assigned from it. Returns the item id.
-- Location parameters are added in P5.S3.
-- ---------------------------------------------------------------------------
create function public.create_item(
  type public.item_type,
  title text,
  description text,
  category_id smallint,
  occurred_on date,
  location_name text default null,
  image_paths text[] default '{}',
  item_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(cardinality(image_paths), 0) > 5 then
    raise exception 'too_many_images'
      using errcode = 'check_violation', detail = 'An item has at most 5 images.';
  end if;

  insert into public.items
    (id, user_id, type, title, description, category_id, occurred_on, location_name)
  values (
    coalesce(create_item.item_id, gen_random_uuid()),
    (select auth.uid()),
    create_item.type,
    btrim(create_item.title),
    btrim(create_item.description),
    create_item.category_id,
    create_item.occurred_on,
    nullif(btrim(create_item.location_name), '')
  )
  returning id into new_id;

  insert into public.item_images (item_id, storage_path, position)
  select new_id, p.path, (p.n - 1)::smallint
  from unnest(coalesce(create_item.image_paths, '{}')) with ordinality as p (path, n);

  return new_id;
end;
$$;

revoke execute on function public.create_item from public, anon;
grant execute on function public.create_item to authenticated;
