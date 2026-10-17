-- Tests for search_item_locations() (P11.S3): the same results in the same
-- order as search_items() for every filter and sort, hidden items never
-- returned, the row cap with total_count, row contents and argument checks.
--
-- Test items lie around 10° N 10° E and 20° N 20° E (far from any real
-- report, which are in North Macedonia) and occurred in 2001. Comparisons
-- with search_items() use its largest page (50 rows), so they also hold for
-- calls that match real items.

select pg_temp.create_user('00000000-0000-4000-8000-0000000000a8', 'sil-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000c8', 'sil-admin@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000c8';

insert into public.items
  (id, user_id, type, status, title, description, category_id, occurred_on, created_at,
   location_name, location)
select v.id::uuid, '00000000-0000-4000-8000-0000000000a8', v.type::public.item_type,
  v.status::public.item_status, v.title, 'Test item for the map view.', v.category,
  v.occurred::date, timestamptz '2001-08-20 12:00+00' + v.minutes * interval '1 minute',
  v.place,
  extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography
from (values
  ('45000000-0000-4000-8000-000000000001', 'lost', 'active', 'Црн паричник', 3, '2001-08-01', 10.0, 10.0, 1, 'Test square'),
  ('45000000-0000-4000-8000-000000000002', 'found', 'active', 'Black wallet with cards', 3, '2001-08-05', 10.05, 10.0, 2, null),
  ('45000000-0000-4000-8000-000000000003', 'lost', 'active', 'Car keys', 4, '2001-08-10', 10.1, 10.1, 3, null),
  ('45000000-0000-4000-8000-000000000004', 'found', 'resolved', 'Resolved wallet', 3, '2001-08-12', 10.02, 10.02, 4, null),
  ('45000000-0000-4000-8000-000000000005', 'lost', 'hidden', 'Hidden wallet', 3, '2001-08-14', 10.01, 10.01, 5, null),
  ('45000000-0000-4000-8000-000000000006', 'found', 'active', 'Far phone', 1, '2001-08-15', 10.6, 10.6, 6, null),
  ('45000000-0000-4000-8000-000000000007', 'lost', 'active', 'Paricnik kafen', 3, '2001-08-16', 10.0, 10.3, 7, null)
) as v (id, type, status, title, category, occurred, lat, lng, minutes, place);

insert into public.item_images (item_id, storage_path, position) values
  ('45000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a8/45000000-0000-4000-8000-000000000001/55000000-0000-4000-8000-000000000002.webp', 1),
  ('45000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a8/45000000-0000-4000-8000-000000000001/55000000-0000-4000-8000-000000000001.webp', 0);

-- 305 items at one point for the row cap.
insert into public.items
  (user_id, type, title, description, category_id, occurred_on, created_at, location)
select '00000000-0000-4000-8000-0000000000a8', 'found', 'Bulk item ' || n,
  'Bulk item for the row cap.', 8, date '2001-09-01',
  timestamptz '2001-09-02 12:00+00' + n * interval '1 minute',
  extensions.st_setsrid(extensions.st_makepoint(20, 20), 4326)::extensions.geography
from generate_series(1, 305) as n;

-- Whether both functions return the same ids in the same order (and the
-- same total) for the arguments: search_items' first page of 50 against
-- the first 50 map rows.
create function pg_temp.same(
  q text default null,
  item_type public.item_type default null,
  category_slugs text[] default null,
  item_status public.item_status default 'active',
  date_from date default null,
  date_to date default null,
  near_lat double precision default null,
  near_lng double precision default null,
  radius_km double precision default null,
  sort text default 'newest'
)
returns boolean
language sql
as $$
  with list as (
    select coalesce(array_agg(s.id order by s.ord), '{}') as ids,
      max(s.total_count) as total
    from public.search_items(
      q => q, item_type => item_type, category_slugs => category_slugs,
      item_status => item_status, date_from => date_from, date_to => date_to,
      near_lat => near_lat, near_lng => near_lng, radius_km => radius_km,
      sort => sort, page_size => 50, page => 1
    ) with ordinality as s
    (id, type, status, title, occurred_on, location_name, created_at, category_id,
     category_slug, category_name_mk, category_name_en, category_icon, cover_path,
     distance_m, is_favorite, rank, total_count, ord)
  ), map as (
    select coalesce(array_agg(m.id order by m.ord), '{}') as ids,
      max(m.total_count) as total
    from public.search_item_locations(
      q => q, item_type => item_type, category_slugs => category_slugs,
      item_status => item_status, date_from => date_from, date_to => date_to,
      near_lat => near_lat, near_lng => near_lng, radius_km => radius_km,
      sort => sort, max_rows => 50
    ) with ordinality as m
    (id, type, status, title, occurred_on, location_name, lat, lng, category_slug,
     category_name_mk, category_name_en, category_icon, cover_path, total_count, ord)
  )
  select list.ids = map.ids and list.total is not distinct from map.total
  from list, map;
$$;
grant execute on function pg_temp.same to anon, authenticated;

-- Titles of an August 2001 search (only test items), in result order.
create function pg_temp.titles(
  q text default null,
  item_status public.item_status default 'active',
  near_lat double precision default null,
  near_lng double precision default null,
  radius_km double precision default null,
  sort text default 'newest'
)
returns text[]
language sql
as $$
  select coalesce(array_agg(m.title order by m.ord), '{}')
  from public.search_item_locations(
    q => q, item_status => item_status, date_from => '2001-08-01',
    date_to => '2001-08-31', near_lat => near_lat, near_lng => near_lng,
    radius_km => radius_km, sort => sort
  ) with ordinality as m
  (id, type, status, title, occurred_on, location_name, lat, lng, category_slug,
   category_name_mk, category_name_en, category_icon, cover_path, total_count, ord);
$$;
grant execute on function pg_temp.titles to anon, authenticated;

select pg_temp.login_as_anon();

do $$
declare
  aug_from constant date := '2001-08-01';
  aug_to constant date := '2001-08-31';
begin
  -- The same results as the list for every filter and sort.
  assert pg_temp.same(), 'defaults';
  assert pg_temp.same(item_status => null), 'every status';
  assert pg_temp.same(item_status => 'resolved'), 'resolved';
  assert pg_temp.same(date_from => aug_from, date_to => aug_to), 'dates';
  assert pg_temp.same(item_type => 'lost', date_from => aug_from, date_to => aug_to), 'type lost';
  assert pg_temp.same(item_type => 'found', item_status => null, date_from => aug_from, date_to => aug_to),
    'type found, every status';
  assert pg_temp.same(category_slugs => array['wallet'], date_from => aug_from, date_to => aug_to),
    'one category';
  assert pg_temp.same(category_slugs => array['wallet', 'keys'], item_status => null,
    date_from => aug_from, date_to => aug_to), 'two categories';
  assert pg_temp.same(q => 'паричник', date_from => aug_from, date_to => aug_to), 'text, newest';
  assert pg_temp.same(q => 'paricnik', sort => 'relevance', date_from => aug_from, date_to => aug_to),
    'text, relevance';
  assert pg_temp.same(q => 'walet', sort => 'relevance', item_status => null), 'typo, relevance';
  assert pg_temp.same(near_lat => 10, near_lng => 10, sort => 'nearest',
    date_from => aug_from, date_to => aug_to), 'center, nearest';
  assert pg_temp.same(near_lat => 10, near_lng => 10, radius_km => 25, sort => 'nearest'),
    'radius, nearest';
  assert pg_temp.same(near_lat => 10, near_lng => 10, radius_km => 50, sort => 'newest',
    item_status => null), 'radius, newest, every status';
  assert pg_temp.same(q => 'wallet', near_lat => 10, near_lng => 10, radius_km => 10,
    sort => 'relevance', item_status => null), 'text and radius, relevance';
  assert pg_temp.same(q => 'nothing like this anywhere'), 'no results';

  -- Order and filters on the test items.
  assert pg_temp.titles() = array['Paricnik kafen', 'Far phone', 'Car keys',
    'Black wallet with cards', 'Црн паричник'], format('newest, got %s', pg_temp.titles());
  assert pg_temp.titles(near_lat => 10, near_lng => 10, radius_km => 10, sort => 'nearest')
    = array['Црн паричник', 'Black wallet with cards'],
    format('radius, nearest, got %s', pg_temp.titles(near_lat => 10, near_lng => 10, radius_km => 10, sort => 'nearest'));
  assert pg_temp.titles(q => 'паричник') = array['Paricnik kafen', 'Црн паричник'],
    format('normalized text, got %s', pg_temp.titles(q => 'паричник'));
end;
$$;

-- Hidden items are never returned, not even to their owner or an admin.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a8');
do $$
begin
  assert not 'Hidden wallet' = any (pg_temp.titles(item_status => null)), 'owner: hidden';
  assert 'Resolved wallet' = any (pg_temp.titles(item_status => null)), 'owner: resolved';
  assert pg_temp.same(item_status => null, date_from => '2001-08-01', date_to => '2001-08-31'),
    'owner: same as the list';
end;
$$;
select pg_temp.login_as('00000000-0000-4000-8000-0000000000c8');
do $$
begin
  assert not 'Hidden wallet' = any (pg_temp.titles(item_status => null)), 'admin: hidden';
  assert pg_temp.same(item_status => null, date_from => '2001-08-01', date_to => '2001-08-31'),
    'admin: same as the list';
end;
$$;

select pg_temp.login_as_anon();
do $$
declare
  r record;
  n bigint;
begin
  -- Row contents: the point, the place, the category and the cover.
  select * into r
  from public.search_item_locations(q => 'црн', date_from => '2001-08-01', date_to => '2001-08-31');
  assert r.id = '45000000-0000-4000-8000-000000000001', format('row id, got %s', r.id);
  assert r.type = 'lost' and r.status = 'active', 'type and status';
  assert r.title = 'Црн паричник' and r.occurred_on = '2001-08-01', 'title and date';
  assert r.location_name = 'Test square', 'place';
  assert abs(r.lat - 10.0) < 1e-9 and abs(r.lng - 10.0) < 1e-9, format('point, got %s %s', r.lat, r.lng);
  assert r.category_slug = 'wallet' and r.category_name_mk is not null
    and r.category_name_en is not null and r.category_icon is not null, 'category';
  assert r.cover_path like '%/55000000-0000-4000-8000-000000000001.webp', format('cover, got %s', r.cover_path);
  assert r.total_count = 1, format('total, got %s', r.total_count);

  -- At most 300 rows (the newest), each with the total; max_rows clamped.
  select count(*) into n
  from public.search_item_locations(date_from => '2001-09-01', date_to => '2001-09-01');
  assert n = 300, format('cap, got %s', n);
  select max(m.total_count) as total into r
  from public.search_item_locations(date_from => '2001-09-01', date_to => '2001-09-01') as m;
  assert r.total = 305, format('total over the cap, got %s', r.total);
  select m.title into r
  from public.search_item_locations(date_from => '2001-09-01', date_to => '2001-09-01') as m
  limit 1;
  assert r.title = 'Bulk item 305', format('newest first, got %s', r.title);
  select count(*) into n
  from public.search_item_locations(date_from => '2001-09-01', date_to => '2001-09-01', max_rows => 1000);
  assert n = 300, format('max_rows above the cap, got %s', n);
  select count(*) into n
  from public.search_item_locations(date_from => '2001-09-01', date_to => '2001-09-01', max_rows => 0);
  assert n = 1, format('max_rows below 1, got %s', n);
  select count(*) into n
  from public.search_item_locations(date_from => '2001-09-01', date_to => '2001-09-01', max_rows => 10);
  assert n = 10, format('max_rows 10, got %s', n);
end;
$$;

-- Argument checks: the same errors as search_items().
do $$
declare
  calls text[] := array[
    'select * from public.search_item_locations(sort => ''oldest'')',
    'select * from public.search_item_locations(near_lat => 10)',
    'select * from public.search_item_locations(near_lng => 10)',
    'select * from public.search_item_locations(near_lat => 91, near_lng => 10)',
    'select * from public.search_item_locations(near_lat => 10, near_lng => 181)',
    'select * from public.search_item_locations(radius_km => 5)',
    'select * from public.search_item_locations(near_lat => 10, near_lng => 10, radius_km => 0)',
    'select * from public.search_item_locations(near_lat => 10, near_lng => 10, radius_km => 51)'
  ];
  call text;
  failed boolean;
begin
  foreach call in array calls loop
    failed := false;
    begin
      execute call;
    exception when invalid_parameter_value then
      failed := true;
    end;
    assert failed, format('expected 22023 for %s', call);
  end loop;
end;
$$;
