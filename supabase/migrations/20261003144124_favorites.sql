-- P9.S1: favorites (items a user saved) and their security; search_items()
-- returns is_favorite for the signed-in user (§17).

-- ---------------------------------------------------------------------------
-- Favorites: one row per user and item. Deleting the item or the account
-- removes the row.
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- The favorites page (newest first) and the cascade from items.
create index favorites_user_id_created_at_idx
  on public.favorites (user_id, created_at desc);
create index favorites_item_id_idx on public.favorites (item_id);

-- ---------------------------------------------------------------------------
-- Security. Privileges are reset (Supabase grants everything by default):
-- signed-in users read, add and remove; nothing is updated. Anonymous
-- visitors only get select, because search_items() (security invoker, also
-- called by visitors) reads the table; no policy is for them, so they see
-- no rows.
-- Policies: only the user's own rows. Adding requires can_write() and an
-- item the user can see that is not hidden (the items select policy applies
-- inside the check). Removing does not require can_write() (as for
-- notifications). Admins have no access to other users' favorites.
-- ---------------------------------------------------------------------------
alter table public.favorites enable row level security;

revoke all on public.favorites from anon, authenticated;
grant select on public.favorites to anon;
grant select, insert, delete on public.favorites to authenticated;

create policy "Users can view their own favorites"
  on public.favorites for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can add visible items to their favorites"
  on public.favorites for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.can_write())
    and exists (
      select 1
      from public.items as i
      where i.id = favorites.item_id
        and i.status <> 'hidden'
    )
  );

create policy "Users can remove their own favorites"
  on public.favorites for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- search_items(): as in 20260929145129_search_items_radius.sql, plus
-- is_favorite (whether the signed-in user saved the item; false for
-- visitors). The return type changes, so the function is recreated with the
-- same arguments.
-- ---------------------------------------------------------------------------
drop function public.search_items(
  text, public.item_type, text[], public.item_status, date, date,
  double precision, double precision, double precision, text, integer, integer
);

-- See 20260927224223_search_items.sql: loads pg_trgm so the function may set
-- pg_trgm.word_similarity_threshold.
select extensions.show_limit();

create function public.search_items(
  q text default null,
  item_type public.item_type default null,
  category_slugs text[] default null,
  item_status public.item_status default 'active',
  date_from date default null,
  date_to date default null,
  near_lat double precision default null,
  near_lng double precision default null,
  radius_km double precision default null,
  sort text default 'newest',
  page_size integer default 20,
  page integer default 1
)
returns table (
  id uuid,
  type public.item_type,
  status public.item_status,
  title text,
  occurred_on date,
  location_name text,
  created_at timestamptz,
  category_id smallint,
  category_slug text,
  category_name_mk text,
  category_name_en text,
  category_icon text,
  cover_path text,
  distance_m double precision,
  is_favorite boolean,
  rank real,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
set pg_trgm.word_similarity_threshold = 0.4
as $$
#variable_conflict use_column
declare
  search text := nullif(private.normalize_text(search_items.q), '');
  size integer := least(greatest(coalesce(search_items.page_size, 20), 1), 50);
  skip integer := (greatest(coalesce(search_items.page, 1), 1) - 1) * size;
  center extensions.geography;
  by_relevance boolean;
  by_distance boolean;
begin
  if coalesce(search_items.sort, 'newest') not in ('newest', 'relevance', 'nearest') then
    raise exception 'invalid_sort'
      using errcode = 'invalid_parameter_value',
            detail = 'sort must be newest, relevance or nearest.';
  end if;

  if (search_items.near_lat is null) <> (search_items.near_lng is null)
    or search_items.near_lat not between -90 and 90
    or search_items.near_lng not between -180 and 180
  then
    raise exception 'invalid_center'
      using errcode = 'invalid_parameter_value',
            detail = 'near_lat and near_lng must both be valid coordinates or both null.';
  end if;
  if search_items.near_lat is not null then
    center := extensions.st_setsrid(
      extensions.st_makepoint(search_items.near_lng, search_items.near_lat), 4326
    )::extensions.geography;
  end if;

  if search_items.radius_km is not null
    and (center is null or not (search_items.radius_km > 0 and search_items.radius_km <= 50))
  then
    raise exception 'invalid_radius'
      using errcode = 'invalid_parameter_value',
            detail = 'radius_km needs a center and must be greater than 0 and at most 50.';
  end if;

  by_relevance := search_items.sort = 'relevance' and search is not null;
  by_distance := search_items.sort = 'nearest' and center is not null;

  return query
  with matched as (
    select
      i.id, i.type, i.status, i.title, i.occurred_on, i.location_name,
      i.created_at, i.category_id,
      c.slug, c.name_mk, c.name_en, c.icon,
      case
        when center is not null then extensions.st_distance(i.location, center)
      end as distance_m,
      case
        when search is null then 0::real
        else ts_rank(i.search_vector, plainto_tsquery('simple'::regconfig, search))
          + extensions.word_similarity(search, i.search_text)
      end as rank
    from public.items as i
    join public.categories as c on c.id = i.category_id
    where i.status <> 'hidden'
      and (search_items.item_status is null or i.status = search_items.item_status)
      and (search_items.item_type is null or i.type = search_items.item_type)
      and (
        coalesce(cardinality(search_items.category_slugs), 0) = 0
        or c.slug = any (search_items.category_slugs)
      )
      and (search_items.date_from is null or i.occurred_on >= search_items.date_from)
      and (search_items.date_to is null or i.occurred_on <= search_items.date_to)
      and (
        search_items.radius_km is null
        or extensions.st_dwithin(i.location, center, search_items.radius_km * 1000)
      )
      and (
        search is null
        or i.search_vector @@ plainto_tsquery('simple'::regconfig, search)
        or search operator(extensions.<%) i.search_text
      )
  )
  select
    m.id, m.type, m.status, m.title, m.occurred_on, m.location_name,
    m.created_at, m.category_id, m.slug, m.name_mk, m.name_en, m.icon,
    (
      select im.storage_path
      from public.item_images as im
      where im.item_id = m.id
      order by im.position
      limit 1
    ),
    m.distance_m,
    exists (
      select 1
      from public.favorites as f
      where f.user_id = (select auth.uid())
        and f.item_id = m.id
    ),
    m.rank,
    count(*) over ()
  from matched as m
  order by
    case when by_distance then m.distance_m end asc nulls last,
    case when by_relevance then m.rank end desc nulls last,
    m.created_at desc,
    m.id desc
  limit size
  offset skip;
end;
$$;

revoke execute on function public.search_items(
  text, public.item_type, text[], public.item_status, date, date,
  double precision, double precision, double precision, text, integer, integer
) from public;
grant execute on function public.search_items(
  text, public.item_type, text[], public.item_status, date, date,
  double precision, double precision, double precision, text, integer, integer
) to anon, authenticated;
