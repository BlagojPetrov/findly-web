-- P5.S3: every item has a location.
--
-- * Backfill: the items created before this step have no point. All of them
--   (the project owner's real reports) are named "Кавадарци", so they get the
--   town center (Nominatim); the owners can move the pin in the edit form.
--   Any other item without a point makes `set not null` fail, so nothing is
--   guessed.
-- * items.location becomes not null.
-- * items.lat / items.lng: stored generated columns (WGS 84 degrees) so the
--   app reads coordinates as plain numbers through the API.
-- * create_item() / update_item() take the point as required lat/lng
--   parameters (replacing the P3 versions; the app calls them by name).

update public.items
set location = extensions.st_setsrid(
  extensions.st_makepoint(22.0122593, 41.4332802), 4326)::extensions.geography
where location is null
  and location_name = 'Кавадарци';

alter table public.items alter column location set not null;

alter table public.items
  add column lat double precision
    generated always as (extensions.st_y(location::extensions.geometry)) stored,
  add column lng double precision
    generated always as (extensions.st_x(location::extensions.geometry)) stored;

-- Point from form coordinates; rejects missing or out-of-range values.
create function private.item_point(lat double precision, lng double precision)
returns extensions.geography
language plpgsql
immutable
set search_path = ''
as $$
begin
  if lat is null or lng is null
     or lat not between -90 and 90 or lng not between -180 and 180 then
    raise exception 'location_invalid'
      using errcode = 'check_violation', detail = 'lat/lng missing or out of range.';
  end if;
  return extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography;
end;
$$;

revoke execute on function private.item_point from public, anon;
grant execute on function private.item_point to authenticated;

-- create_item(): as in 20260926180914_items.sql, plus the location.
drop function public.create_item(
  public.item_type, text, text, smallint, date, text, text[], uuid);

create function public.create_item(
  type public.item_type,
  title text,
  description text,
  category_id smallint,
  occurred_on date,
  lat double precision,
  lng double precision,
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
    (id, user_id, type, title, description, category_id, occurred_on,
     location, location_name)
  values (
    coalesce(create_item.item_id, gen_random_uuid()),
    (select auth.uid()),
    create_item.type,
    btrim(create_item.title),
    btrim(create_item.description),
    create_item.category_id,
    create_item.occurred_on,
    private.item_point(create_item.lat, create_item.lng),
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

-- update_item(): as in 20260927000103_update_item.sql, plus the location.
drop function public.update_item(
  uuid, public.item_type, text, text, smallint, date, text, text[]);

create function public.update_item(
  item_id uuid,
  type public.item_type,
  title text,
  description text,
  category_id smallint,
  occurred_on date,
  lat double precision,
  lng double precision,
  location_name text default null,
  image_paths text[] default '{}'
)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  paths text[] := coalesce(update_item.image_paths, '{}');
  removed text[];
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if cardinality(paths) > 5 then
    raise exception 'too_many_images'
      using errcode = 'check_violation', detail = 'An item has at most 5 images.';
  end if;

  update public.items as i
  set type = update_item.type,
      title = btrim(update_item.title),
      description = btrim(update_item.description),
      category_id = update_item.category_id,
      occurred_on = update_item.occurred_on,
      location = private.item_point(update_item.lat, update_item.lng),
      location_name = nullif(btrim(update_item.location_name), '')
  where i.id = update_item.item_id;

  -- Missing, not the caller's, or hidden: the update policy hides the row.
  if not found then
    raise exception 'item_not_found' using errcode = 'no_data_found';
  end if;

  with deleted as (
    delete from public.item_images as im
    where im.item_id = update_item.item_id
      and im.storage_path <> all (paths)
    returning im.storage_path
  )
  select coalesce(array_agg(deleted.storage_path), '{}') into removed from deleted;

  insert into public.item_images (item_id, storage_path, position)
  select update_item.item_id, p.path, (p.n - 1)::smallint
  from unnest(paths) with ordinality as p (path, n)
  on conflict (storage_path) do update set position = excluded.position;

  return removed;
end;
$$;

revoke execute on function public.update_item from public, anon;
grant execute on function public.update_item to authenticated;
