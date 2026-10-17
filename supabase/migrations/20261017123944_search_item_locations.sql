-- P11.S3: search_item_locations(): the feed's search results with their
-- points, for the map view of /items (§12, §13).
--
-- The same arguments (except paging), validation, filters and order as
-- search_items() (20261003144124_favorites.sql), so the map shows the same
-- reports as the list: the first max_rows (clamped to 1–300) of them, each
-- row carrying total_count, the number of all matches, so the map can say
-- that it shows only part of them. supabase/tests/search_item_locations.sql
-- compares the results with search_items(); a change to the filters of one
-- function must be made in both.
--
-- security invoker: runs as the caller, so the items policies apply; hidden
-- items are also excluded explicitly, as in search_items(), so owners and
-- admins never get them. Only visible reports are returned, with the point
-- their item page already shows.
--
-- Additive: items_in_bounds() stays until P11.S4 (the deployed /map still
-- calls it).

-- See 20260927224223_search_items.sql: loads pg_trgm so the function may set
-- pg_trgm.word_similarity_threshold.
select extensions.show_limit();

create function public.search_item_locations(
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
  max_rows integer default 300
)
returns table (
  id uuid,
  type public.item_type,
  status public.item_status,
  title text,
  occurred_on date,
  location_name text,
  lat double precision,
  lng double precision,
  category_slug text,
  category_name_mk text,
  category_name_en text,
  category_icon text,
  cover_path text,
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
  search text := nullif(private.normalize_text(search_item_locations.q), '');
  size integer := least(greatest(coalesce(search_item_locations.max_rows, 300), 1), 300);
  center extensions.geography;
  by_relevance boolean;
  by_distance boolean;
begin
  if coalesce(search_item_locations.sort, 'newest') not in ('newest', 'relevance', 'nearest') then
    raise exception 'invalid_sort'
      using errcode = 'invalid_parameter_value',
            detail = 'sort must be newest, relevance or nearest.';
  end if;

  if (search_item_locations.near_lat is null) <> (search_item_locations.near_lng is null)
    or search_item_locations.near_lat not between -90 and 90
    or search_item_locations.near_lng not between -180 and 180
  then
    raise exception 'invalid_center'
      using errcode = 'invalid_parameter_value',
            detail = 'near_lat and near_lng must both be valid coordinates or both null.';
  end if;
  if search_item_locations.near_lat is not null then
    center := extensions.st_setsrid(
      extensions.st_makepoint(search_item_locations.near_lng, search_item_locations.near_lat), 4326
    )::extensions.geography;
  end if;

  if search_item_locations.radius_km is not null
    and (center is null or not (search_item_locations.radius_km > 0 and search_item_locations.radius_km <= 50))
  then
    raise exception 'invalid_radius'
      using errcode = 'invalid_parameter_value',
            detail = 'radius_km needs a center and must be greater than 0 and at most 50.';
  end if;

  by_relevance := search_item_locations.sort = 'relevance' and search is not null;
  by_distance := search_item_locations.sort = 'nearest' and center is not null;

  return query
  with matched as (
    select
      i.id, i.type, i.status, i.title, i.occurred_on, i.location_name,
      i.lat, i.lng, i.created_at,
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
      and (search_item_locations.item_status is null or i.status = search_item_locations.item_status)
      and (search_item_locations.item_type is null or i.type = search_item_locations.item_type)
      and (
        coalesce(cardinality(search_item_locations.category_slugs), 0) = 0
        or c.slug = any (search_item_locations.category_slugs)
      )
      and (search_item_locations.date_from is null or i.occurred_on >= search_item_locations.date_from)
      and (search_item_locations.date_to is null or i.occurred_on <= search_item_locations.date_to)
      and (
        search_item_locations.radius_km is null
        or extensions.st_dwithin(i.location, center, search_item_locations.radius_km * 1000)
      )
      and (
        search is null
        or i.search_vector @@ plainto_tsquery('simple'::regconfig, search)
        or search operator(extensions.<%) i.search_text
      )
  )
  select
    m.id, m.type, m.status, m.title, m.occurred_on, m.location_name,
    m.lat, m.lng, m.slug, m.name_mk, m.name_en, m.icon,
    (
      select im.storage_path
      from public.item_images as im
      where im.item_id = m.id
      order by im.position
      limit 1
    ),
    count(*) over ()
  from matched as m
  order by
    case when by_distance then m.distance_m end asc nulls last,
    case when by_relevance then m.rank end desc nulls last,
    m.created_at desc,
    m.id desc
  limit size;
end;
$$;

revoke execute on function public.search_item_locations(
  text, public.item_type, text[], public.item_status, date, date,
  double precision, double precision, double precision, text, integer
) from public;
grant execute on function public.search_item_locations(
  text, public.item_type, text[], public.item_status, date, date,
  double precision, double precision, double precision, text, integer
) to anon, authenticated;
