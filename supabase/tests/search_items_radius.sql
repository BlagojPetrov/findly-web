-- Tests for the location part of search_items(): distance, radius filter,
-- "nearest" sort and parameter checks.
--
-- Test items all occurred in April 2001, and every call filters by those
-- dates, so real items in the database do not affect the results. They lie
-- due north of the center (41.9981, 21.4254) at known distances: along a
-- meridian at this latitude one degree is about 111.07 km (WGS 84), so
-- 0.009° ≈ 1.0 km.

select pg_temp.create_user('00000000-0000-4000-8000-0000000000a6', 'sir-a@example.com');

insert into public.items
  (id, user_id, type, status, title, description, category_id, occurred_on, created_at,
   location)
select v.id::uuid, '00000000-0000-4000-8000-0000000000a6', v.type::public.item_type,
  v.status::public.item_status, v.title, 'Test item for the radius search.', 8,
  date '2001-04-10', timestamptz '2001-05-01 12:00+00' + v.minutes * interval '1 minute',
  extensions.st_setsrid(extensions.st_makepoint(21.4254, 41.9981 + v.north), 4326)::extensions.geography
from (values
  -- Newest first: far, 25 km, 4.5 km, 1.5 km, center.
  ('43000000-0000-4000-8000-000000000001', 'lost', 'active', 'At the center', 0.0, 1),
  ('43000000-0000-4000-8000-000000000002', 'found', 'active', 'Half a kilometer', 0.0045, 2),
  ('43000000-0000-4000-8000-000000000003', 'lost', 'active', 'One and a half kilometers', 0.0135, 3),
  ('43000000-0000-4000-8000-000000000004', 'found', 'active', 'Four and a half kilometers', 0.0405, 4),
  ('43000000-0000-4000-8000-000000000005', 'lost', 'active', 'Twenty kilometers', 0.18, 5),
  ('43000000-0000-4000-8000-000000000006', 'lost', 'active', 'Sixty kilometers', 0.54, 6),
  ('43000000-0000-4000-8000-000000000007', 'lost', 'hidden', 'Hidden nearby', 0.001, 7)
) as v (id, type, status, title, north, minutes);

-- Titles of an April search around the center, in result order.
create function pg_temp.near(
  radius_km double precision default null,
  sort text default 'newest',
  near_lat double precision default 41.9981,
  near_lng double precision default 21.4254,
  item_type public.item_type default null,
  page_size integer default 20,
  page integer default 1
)
returns text[]
language sql
as $$
  select coalesce(array_agg(r.title order by r.ord), '{}')
  from public.search_items(
    date_from => '2001-04-01', date_to => '2001-04-30',
    near_lat => near_lat, near_lng => near_lng, radius_km => radius_km,
    item_type => item_type, sort => sort, page_size => page_size, page => page
  ) with ordinality as r
  (id, type, status, title, occurred_on, location_name, created_at, category_id,
   category_slug, category_name_mk, category_name_en, category_icon, cover_path,
   distance_m, is_favorite, rank, total_count, ord);
$$;
grant execute on function pg_temp.near to anon, authenticated;

select pg_temp.login_as_anon();

do $$
declare
  t text[];
  r record;
begin
  -- Distances in meters (geography, WGS 84 spheroid).
  for r in
    select s.title, s.distance_m
    from public.search_items(
      date_from => '2001-04-01', date_to => '2001-04-30',
      near_lat => 41.9981, near_lng => 21.4254
    ) as s
  loop
    assert abs(r.distance_m - case r.title
      when 'At the center' then 0
      when 'Half a kilometer' then 499.8
      when 'One and a half kilometers' then 1499.5
      when 'Four and a half kilometers' then 4498.5
      when 'Twenty kilometers' then 19993
      when 'Sixty kilometers' then 59980
    end) < 0.001 * r.distance_m + 1,
      format('distance of %s: %s m', r.title, r.distance_m);
  end loop;

  -- Without a radius every item is returned (newest first by default).
  t := pg_temp.near();
  assert t = array['Sixty kilometers', 'Twenty kilometers', 'Four and a half kilometers',
    'One and a half kilometers', 'Half a kilometer', 'At the center'],
    format('no radius, got %s', t);

  -- Radius filter (items exactly at the edge are not tested).
  assert pg_temp.near(radius_km => 1) = array['Half a kilometer', 'At the center'],
    format('1 km, got %s', pg_temp.near(radius_km => 1));
  assert pg_temp.near(radius_km => 2)
    = array['One and a half kilometers', 'Half a kilometer', 'At the center'], '2 km';
  assert cardinality(pg_temp.near(radius_km => 5)) = 4, '5 km';
  assert cardinality(pg_temp.near(radius_km => 10)) = 4, '10 km';
  assert cardinality(pg_temp.near(radius_km => 25)) = 5, '25 km';
  assert cardinality(pg_temp.near(radius_km => 50)) = 5, '50 km';
  assert pg_temp.near(radius_km => 0.4) = array['At the center'], 'fractional radius';
  assert pg_temp.near(radius_km => 5, item_type => 'found')
    = array['Four and a half kilometers', 'Half a kilometer'], 'radius combined with type';
  -- A center 20 km north: only the items around it.
  t := pg_temp.near(radius_km => 5, near_lat => 41.9981 + 0.18);
  assert t = array['Twenty kilometers'], format('other center, got %s', t);

  -- Nearest first.
  t := pg_temp.near(sort => 'nearest');
  assert t = array['At the center', 'Half a kilometer', 'One and a half kilometers',
    'Four and a half kilometers', 'Twenty kilometers', 'Sixty kilometers'],
    format('nearest, got %s', t);
  t := pg_temp.near(sort => 'nearest', near_lat => 41.9981 + 0.54);
  assert t[1] = 'Sixty kilometers' and t[6] = 'At the center',
    format('nearest to another center, got %s', t);
  assert pg_temp.near(sort => 'nearest', radius_km => 2, page_size => 2, page => 2)
    = array['One and a half kilometers'], 'nearest with radius and pages';
  select * into r from public.search_items(
    date_from => '2001-04-01', date_to => '2001-04-30',
    near_lat => 41.9981, near_lng => 21.4254, radius_km => 2, page_size => 1
  );
  assert r.total_count = 3, format('total_count within the radius, got %s', r.total_count);

  -- Without a center: no distance, and nearest = newest.
  select * into r from public.search_items(date_from => '2001-04-01', date_to => '2001-04-30');
  assert r.distance_m is null, 'no distance without a center';
  assert (
    select array_agg(s.title order by s.created_at desc)
    from public.search_items(date_from => '2001-04-01', date_to => '2001-04-30', sort => 'nearest') s
  ) = (
    select array_agg(s.title order by s.created_at desc)
    from public.search_items(date_from => '2001-04-01', date_to => '2001-04-30') s
  ), 'nearest without a center';
  assert (
    select array_agg(s.title)
    from public.search_items(date_from => '2001-04-01', date_to => '2001-04-30', sort => 'nearest') s
  )[1] = 'Sixty kilometers', 'nearest without a center = newest first';

  -- Hidden items stay out, however close.
  assert not pg_temp.near(radius_km => 1) @> array['Hidden nearby'], 'hidden excluded';
end;
$$;

-- Invalid location arguments.
do $$
declare
  calls text[] := array[
    'select pg_temp.near(near_lng => null)',
    'select pg_temp.near(near_lat => null)',
    'select pg_temp.near(near_lat => 91)',
    'select pg_temp.near(near_lng => -181)',
    'select pg_temp.near(near_lat => ''NaN'')',
    'select pg_temp.near(radius_km => 5, near_lat => null, near_lng => null)',
    'select pg_temp.near(radius_km => 0)',
    'select pg_temp.near(radius_km => -1)',
    'select pg_temp.near(radius_km => 51)',
    'select pg_temp.near(radius_km => ''NaN'')',
    'select pg_temp.near(radius_km => ''Infinity'')'
  ];
  call text;
begin
  foreach call in array calls loop
    begin
      execute call;
      assert false, format('must fail: %s', call);
    exception when invalid_parameter_value then
      null;
    end;
  end loop;
end;
$$;

select pg_temp.logout();

-- The radius filter can use the GiST index on items.location.
do $$
declare
  line text;
  plan text := '';
begin
  set local enable_seqscan = off;
  for line in execute $q$
    explain select id from public.items
    where extensions.st_dwithin(
      location,
      extensions.st_setsrid(extensions.st_makepoint(21.4254, 41.9981), 4326)::extensions.geography,
      5000
    )
  $q$ loop
    plan := plan || line || e'
';
  end loop;
  assert plan like '%items_location_idx%', format('index not used: %s', plan);
end;
$$;
