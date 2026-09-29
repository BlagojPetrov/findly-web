-- P5.S6: items_in_bounds(): active items inside a map's visible area (/map).
--
-- security invoker: runs as the caller, so the items policies apply; only
-- active items are returned (the map shows current reports), so hidden and
-- resolved items never appear, not even for their owner or an admin.
--
-- The area is a plain longitude/latitude rectangle, as a web map shows it
-- (not a geodesic polygon): min <= max, latitudes -90..90, longitudes
-- -180..180 (the client clamps a view that crosses the antimeridian).
-- Anything else raises SQLSTATE 22023 invalid_bounds.
-- Newest first, at most max_rows (clamped to 1–300) rows; every row carries
-- total_count, the number of matching items in the area, so the map can say
-- that it shows only part of them.

-- Planar index for the rectangle test (items_location_idx is on geography,
-- whose bounding boxes are geocentric).
create index items_location_geom_idx
  on public.items using gist ((location::extensions.geometry));

create function public.items_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  item_type public.item_type default null,
  max_rows integer default 300
)
returns table (
  id uuid,
  type public.item_type,
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
as $$
#variable_conflict use_column
declare
  size integer := least(greatest(coalesce(items_in_bounds.max_rows, 300), 1), 300);
  area extensions.geometry;
begin
  if items_in_bounds.min_lat is null or items_in_bounds.max_lat is null
    or items_in_bounds.min_lng is null or items_in_bounds.max_lng is null
    or not (items_in_bounds.min_lat between -90 and 90)
    or not (items_in_bounds.max_lat between -90 and 90)
    or not (items_in_bounds.min_lng between -180 and 180)
    or not (items_in_bounds.max_lng between -180 and 180)
    or items_in_bounds.min_lat > items_in_bounds.max_lat
    or items_in_bounds.min_lng > items_in_bounds.max_lng
  then
    raise exception 'invalid_bounds'
      using errcode = 'invalid_parameter_value',
            detail = 'Bounds must be coordinates in range with min <= max.';
  end if;

  area := extensions.st_makeenvelope(
    items_in_bounds.min_lng, items_in_bounds.min_lat,
    items_in_bounds.max_lng, items_in_bounds.max_lat,
    4326
  );

  return query
  select
    i.id, i.type, i.title, i.occurred_on, i.location_name, i.lat, i.lng,
    c.slug, c.name_mk, c.name_en, c.icon,
    (
      select im.storage_path
      from public.item_images as im
      where im.item_id = i.id
      order by im.position
      limit 1
    ),
    count(*) over ()
  from public.items as i
  join public.categories as c on c.id = i.category_id
  where i.status = 'active'
    and (items_in_bounds.item_type is null or i.type = items_in_bounds.item_type)
    -- For points, bounding-box overlap is exact containment (edges included).
    and i.location::extensions.geometry operator(extensions.&&) area
  order by i.created_at desc, i.id desc
  limit size;
end;
$$;

revoke execute on function public.items_in_bounds(
  double precision, double precision, double precision, double precision,
  public.item_type, integer
) from public;
grant execute on function public.items_in_bounds(
  double precision, double precision, double precision, double precision,
  public.item_type, integer
) to anon, authenticated;
