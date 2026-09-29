-- Tests for items_in_bounds(): the rectangle, type filter, statuses, row
-- limit, row contents and argument checks.
--
-- Test items lie around 10° N 10° E and 20° N 20° E (far from any real
-- report, which are in North Macedonia), so real data does not affect the
-- results.

select pg_temp.create_user('00000000-0000-4000-8000-0000000000a7', 'ib-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000c7', 'ib-admin@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000c7';

insert into public.items
  (id, user_id, type, status, title, description, category_id, occurred_on, created_at,
   location)
select v.id::uuid, '00000000-0000-4000-8000-0000000000a7', v.type::public.item_type,
  v.status::public.item_status, v.title, 'Test item for the map.', 8, date '2001-06-01',
  timestamptz '2001-06-02 12:00+00' + v.minutes * interval '1 minute',
  extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography
from (values
  ('44000000-0000-4000-8000-000000000001', 'lost', 'active', 'Center', 10.0, 10.0, 1),
  ('44000000-0000-4000-8000-000000000002', 'found', 'active', 'North east', 10.5, 10.5, 2),
  ('44000000-0000-4000-8000-000000000003', 'lost', 'active', 'Corner', 11.0, 11.0, 3),
  ('44000000-0000-4000-8000-000000000004', 'found', 'resolved', 'Resolved', 10.2, 10.2, 4),
  ('44000000-0000-4000-8000-000000000005', 'lost', 'hidden', 'Hidden', 10.3, 10.3, 5),
  ('44000000-0000-4000-8000-000000000006', 'lost', 'active', 'Outside', 12.0, 12.0, 6),
  ('44000000-0000-4000-8000-000000000007', 'found', 'active', 'West', 10.0, 9.5, 7)
) as v (id, type, status, title, lat, lng, minutes);

insert into public.item_images (item_id, storage_path, position) values
  ('44000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a7/44000000-0000-4000-8000-000000000001/54000000-0000-4000-8000-000000000002.webp', 1),
  ('44000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a7/44000000-0000-4000-8000-000000000001/54000000-0000-4000-8000-000000000001.webp', 0);

-- 305 items at one point for the row limit.
insert into public.items
  (user_id, type, title, description, category_id, occurred_on, created_at, location)
select '00000000-0000-4000-8000-0000000000a7', 'found', 'Bulk item ' || n,
  'Bulk item for the row limit.', 8, date '2001-06-01',
  timestamptz '2001-07-01 12:00+00' + n * interval '1 minute',
  extensions.st_setsrid(extensions.st_makepoint(20, 20), 4326)::extensions.geography
from generate_series(1, 305) as n;

-- Titles in an area, in result order.
create function pg_temp.area(
  min_lat double precision, min_lng double precision,
  max_lat double precision, max_lng double precision,
  item_type public.item_type default null,
  max_rows integer default 300
)
returns text[]
language sql
as $$
  select coalesce(array_agg(r.title order by r.ord), '{}')
  from public.items_in_bounds(min_lat, min_lng, max_lat, max_lng, item_type, max_rows)
    with ordinality as r
    (id, type, title, occurred_on, location_name, lat, lng, category_slug,
     category_name_mk, category_name_en, category_icon, cover_path, total_count, ord);
$$;
grant execute on function pg_temp.area to anon, authenticated;

select pg_temp.login_as_anon();

do $$
declare
  t text[];
  r record;
begin
  -- The rectangle, edges included; newest first; only active items.
  t := pg_temp.area(9.9, 9.9, 11, 11);
  assert t = array['Corner', 'North east', 'Center'], format('area, got %s', t);
  t := pg_temp.area(9.9, 9.4, 11, 11);
  assert t = array['West', 'Corner', 'North east', 'Center'], format('wider area, got %s', t);
  assert pg_temp.area(10.6, 10.6, 10.9, 10.9) = '{}', 'empty area';
  assert pg_temp.area(10, 10, 10, 10) = array['Center'], 'a point-sized area';
  assert pg_temp.area(-90, -180, 15, 180) @> array['Center', 'Outside', 'West'], 'every longitude';
  assert not pg_temp.area(-90, -180, 15, 180) && array['Resolved', 'Hidden'],
    'resolved and hidden items are never shown';

  -- Type filter.
  assert pg_temp.area(9.9, 9.4, 11, 11, 'lost') = array['Corner', 'Center'], 'lost';
  assert pg_temp.area(9.9, 9.4, 11, 11, 'found') = array['West', 'North east'], 'found';

  -- Row limit and total.
  select count(*) as n, min(total_count) as total into r
    from public.items_in_bounds(19, 19, 21, 21);
  assert r.n = 300 and r.total = 305, format('capped at 300 (%s rows, total %s)', r.n, r.total);
  select count(*) as n, min(total_count) as total into r
    from public.items_in_bounds(19, 19, 21, 21, max_rows => 1000);
  assert r.n = 300 and r.total = 305, 'max_rows cannot exceed 300';
  select count(*) as n into r from public.items_in_bounds(19, 19, 21, 21, max_rows => 0);
  assert r.n = 1, 'max_rows at least 1';
  assert pg_temp.area(19, 19, 21, 21, max_rows => 2) = array['Bulk item 305', 'Bulk item 304'],
    'newest first';

  -- Row contents.
  select * into r from public.items_in_bounds(9.9, 9.9, 10.1, 10.1);
  assert r.id = '44000000-0000-4000-8000-000000000001' and r.type = 'lost'
    and r.lat = 10 and r.lng = 10 and r.occurred_on = '2001-06-01', 'item fields';
  assert r.cover_path like '%/54000000-0000-4000-8000-000000000001.webp', 'cover = position 0';
  assert r.category_slug is not null and r.category_icon is not null
    and r.category_name_mk is not null and r.category_name_en is not null, 'category fields';
  assert r.total_count = 1, 'total_count';
  select * into r from public.items_in_bounds(10.4, 10.4, 10.6, 10.6);
  assert r.title = 'North east' and r.cover_path is null, 'no cover without photos';
end;
$$;

-- Invalid bounds.
do $$
declare
  calls text[] := array[
    'select pg_temp.area(null, 9, 11, 11)',
    'select pg_temp.area(9, null, 11, 11)',
    'select pg_temp.area(9, 9, null, 11)',
    'select pg_temp.area(9, 9, 11, null)',
    'select pg_temp.area(11, 9, 9, 11)',
    'select pg_temp.area(9, 11, 11, 9)',
    'select pg_temp.area(-91, 9, 11, 11)',
    'select pg_temp.area(9, 9, 91, 11)',
    'select pg_temp.area(9, -181, 11, 11)',
    'select pg_temp.area(9, 9, 11, 181)',
    'select pg_temp.area(''NaN'', 9, 11, 11)'
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

-- The owner and an admin do not get hidden or resolved items either.
select pg_temp.logout();
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a7');
do $$
begin
  assert pg_temp.area(9.9, 9.9, 11, 11) = array['Corner', 'North east', 'Center'], 'owner';
end;
$$;
select pg_temp.logout();
select pg_temp.login_as('00000000-0000-4000-8000-0000000000c7');
do $$
begin
  assert pg_temp.area(9.9, 9.9, 11, 11) = array['Corner', 'North east', 'Center'], 'admin';
end;
$$;
select pg_temp.logout();

-- The rectangle test can use the planar index.
do $$
declare
  line text;
  plan text := '';
begin
  set local enable_seqscan = off;
  for line in execute $q$
    explain select id from public.items
    where location::extensions.geometry operator(extensions.&&)
      extensions.st_makeenvelope(9, 9, 11, 11, 4326)
  $q$ loop
    plan := plan || line || e'\n';
  end loop;
  assert plan like '%items_location_geom_idx%', format('index not used: %s', plan);
end;
$$;
