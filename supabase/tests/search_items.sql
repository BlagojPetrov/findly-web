-- Tests for search_items(): filters, text search, sorting, pagination.
--
-- Test items all occurred in January 2001 (bulk items in March 2001), and
-- every call filters by those dates, so real items in the database do not
-- affect the results.

select pg_temp.create_user('00000000-0000-4000-8000-0000000000a5', 'si-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000b5', 'si-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000c5', 'si-admin@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000c5';

-- Inserted as the test runner (postgres), so status and created_at can be set.
insert into public.items
  (id, user_id, type, status, title, description, category_id, occurred_on, created_at,
   location)
select v.id::uuid, v.user_id::uuid, v.type::public.item_type, v.status::public.item_status,
  v.title, v.description, c.id, v.occurred_on::date,
  timestamptz '2001-02-01 12:00+00' + v.minutes * interval '1 minute',
  extensions.st_setsrid(extensions.st_makepoint(21.4254, 41.9981), 4326)::extensions.geography
from (values
  ('42000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a5',
   'lost', 'active', 'Црн кожен паричник', 'Паричник со лична карта.',
   'wallet', '2001-01-05', 1),
  ('42000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a5',
   'found', 'active', 'Кафеав паричник', 'Пронајден паричник кај автобуска станица.',
   'wallet', '2001-01-10', 2),
  ('42000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000a5',
   'found', 'active', 'Клучеви од стан', 'Три клуча на црвен привезок.',
   'keys', '2001-01-15', 3),
  ('42000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000a5',
   'lost', 'resolved', 'Samsung telefon', 'Crn Samsung Galaxy so pukanato staklo.',
   'electronics', '2001-01-20', 4),
  ('42000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-0000000000b5',
   'lost', 'hidden', 'Скриен паричник', 'Паричник што модератор го скри.',
   'wallet', '2001-01-12', 5),
  ('42000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-0000000000b5',
   'lost', 'active', 'Лична карта', 'Изгубена лична карта на име Марко.',
   'documents', '2001-01-25', 6)
) as v (id, user_id, type, status, title, description, slug, occurred_on, minutes)
join public.categories c on c.slug = v.slug;

-- Two photos for the first item, inserted with the cover (position 0) last.
insert into public.item_images (item_id, storage_path, position) values
  ('42000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a5/42000000-0000-4000-8000-000000000001/52000000-0000-4000-8000-000000000002.webp', 1),
  ('42000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a5/42000000-0000-4000-8000-000000000001/52000000-0000-4000-8000-000000000001.webp', 0);

-- 55 more items in March 2001 for the page size cap.
insert into public.items
  (user_id, type, title, description, category_id, occurred_on, created_at, location)
select '00000000-0000-4000-8000-0000000000a5', 'found', 'Bulk item ' || n,
  'Bulk item for the page size test.', 8, date '2001-03-01',
  timestamptz '2001-03-02 12:00+00' + n * interval '1 minute',
  extensions.st_setsrid(extensions.st_makepoint(21.4254, 41.9981), 4326)::extensions.geography
from generate_series(1, 55) as n;

-- Titles of a January search, in result order.
create function pg_temp.titles(
  q text default null,
  item_type public.item_type default null,
  category_slugs text[] default null,
  item_status public.item_status default 'active',
  date_from date default '2001-01-01',
  date_to date default '2001-01-31',
  sort text default 'newest',
  page_size integer default 20,
  page integer default 1
)
returns text[]
language sql
as $$
  select coalesce(array_agg(r.title order by r.ord), '{}')
  from public.search_items(
    q => q, item_type => item_type, category_slugs => category_slugs,
    item_status => item_status, date_from => date_from, date_to => date_to,
    sort => sort, page_size => page_size, page => page
  ) with ordinality as r
  (id, type, status, title, occurred_on, location_name, created_at, category_id,
   category_slug, category_name_mk, category_name_en, category_icon, cover_path,
   distance_m, is_favorite, rank, total_count, ord);
$$;
grant execute on function pg_temp.titles to anon, authenticated;

-- Everything below runs as a signed-out visitor.
select pg_temp.login_as_anon();

do $$
declare
  t text[];
  r record;
begin
  -- Defaults: active items, newest first, hidden and resolved left out.
  t := pg_temp.titles();
  assert t = array['Лична карта', 'Клучеви од стан', 'Кафеав паричник', 'Црн кожен паричник'],
    format('default search, got %s', t);

  -- Filters.
  t := pg_temp.titles(item_type => 'lost');
  assert t = array['Лична карта', 'Црн кожен паричник'], format('type, got %s', t);
  t := pg_temp.titles(category_slugs => array['wallet']);
  assert t = array['Кафеав паричник', 'Црн кожен паричник'], format('one category, got %s', t);
  t := pg_temp.titles(category_slugs => array['wallet', 'keys']);
  assert t = array['Клучеви од стан', 'Кафеав паричник', 'Црн кожен паричник'],
    format('two categories, got %s', t);
  assert cardinality(pg_temp.titles(category_slugs => '{}')) = 4, 'empty category list is ignored';
  t := pg_temp.titles(item_status => 'resolved');
  assert t = array['Samsung telefon'], format('resolved, got %s', t);
  t := pg_temp.titles(item_status => null);
  assert t = array['Лична карта', 'Samsung telefon', 'Клучеви од стан', 'Кафеав паричник', 'Црн кожен паричник'],
    format('any status = active and resolved, got %s', t);
  assert pg_temp.titles(item_status => 'hidden') = '{}', 'hidden items are never returned';
  t := pg_temp.titles(date_from => '2001-01-10', date_to => '2001-01-15');
  assert t = array['Клучеви од стан', 'Кафеав паричник'], format('date range (inclusive), got %s', t);
  t := pg_temp.titles(item_type => 'found', category_slugs => array['wallet', 'keys'], date_to => '2001-01-12');
  assert t = array['Кафеав паричник'], format('combined filters, got %s', t);

  -- Text search: Cyrillic, Latin, typos, unfinished words; never hidden.
  t := pg_temp.titles(q => 'паричник');
  assert t = array['Кафеав паричник', 'Црн кожен паричник'], format('Cyrillic query, got %s', t);
  assert pg_temp.titles(q => 'PARIČNIK') = t, 'Latin query with diacritics';
  assert pg_temp.titles(q => 'parichnk') = t, 'typo';
  assert pg_temp.titles(q => 'paric') = t, 'unfinished word';
  t := pg_temp.titles(q => 'klucevi');
  assert t = array['Клучеви од стан'], format('keys, got %s', t);
  t := pg_temp.titles(q => 'лична карта');
  assert t = array['Лична карта', 'Црн кожен паричник'], format('words from the description, got %s', t);
  assert pg_temp.titles(q => 'телевизор') = '{}', 'no match';
  assert cardinality(pg_temp.titles(q => '  !? ')) = 4, 'a query without letters is ignored';
  assert pg_temp.titles(q => 'samsung') = '{}', 'text search keeps the status filter';

  -- Sorting.
  t := pg_temp.titles(q => 'црн паричник');
  assert t[1] = 'Кафеав паричник', format('newest first by default, got %s', t);
  t := pg_temp.titles(q => 'црн паричник', sort => 'relevance');
  assert t[1] = 'Црн кожен паричник', format('relevance puts the best match first, got %s', t);
  assert pg_temp.titles(sort => 'relevance') = pg_temp.titles(), 'relevance without q = newest';
  assert pg_temp.titles(sort => null) = pg_temp.titles(), 'sort null = newest';
  begin
    perform pg_temp.titles(sort => 'closest');
    assert false, 'unknown sort must fail';
  exception when invalid_parameter_value then
    null;
  end;

  -- Pagination and totals.
  assert pg_temp.titles(page_size => 3) = array['Лична карта', 'Клучеви од стан', 'Кафеав паричник'],
    'page 1';
  assert pg_temp.titles(page_size => 3, page => 2) = array['Црн кожен паричник'], 'page 2';
  assert pg_temp.titles(page_size => 3, page => 3) = '{}', 'page past the end';
  assert pg_temp.titles(page_size => 3, page => 0) = pg_temp.titles(page_size => 3), 'page < 1 = page 1';
  assert cardinality(pg_temp.titles(page_size => 0)) = 1, 'page size at least 1';
  for r in select * from public.search_items(date_from => '2001-01-01', date_to => '2001-01-31', page_size => 3, page => 2) loop
    assert r.total_count = 4, format('total_count counts every match, got %s', r.total_count);
  end loop;

  select count(*) as n, min(total_count) as total into r
    from public.search_items(date_from => '2001-03-01', date_to => '2001-03-31', page_size => 500);
  assert r.n = 50 and r.total = 55, format('page size capped at 50 (%s rows, total %s)', r.n, r.total);

  -- Row contents.
  select * into r from public.search_items(q => 'црн кожен', date_from => '2001-01-01', date_to => '2001-01-31')
    where id = '42000000-0000-4000-8000-000000000001';
  assert found, 'the wallet is found';
  assert r.cover_path like '%/52000000-0000-4000-8000-000000000001.webp', 'cover = the photo at position 0';
  assert r.category_slug = 'wallet' and r.category_icon = 'wallet'
    and r.category_name_mk is not null and r.category_name_en is not null, 'category fields';
  assert r.rank > 0, 'rank with a query';
  select * into r from public.search_items(date_from => '2001-01-01', date_to => '2001-01-31')
    where id = '42000000-0000-4000-8000-000000000003';
  assert found and r.cover_path is null, 'no cover without photos';
  select * into r from public.search_items(date_from => '2001-01-01', date_to => '2001-01-31');
  assert r.rank = 0, 'rank 0 without a query';
  assert r.distance_m is null, 'no distance without a center';
end;
$$;

-- The owner of the hidden item and an admin do not get it in the feed either.
select pg_temp.logout();
select pg_temp.login_as('00000000-0000-4000-8000-0000000000b5');
do $$
begin
  assert pg_temp.titles(item_status => null) @> array['Лична карта']
    and not pg_temp.titles(item_status => null) @> array['Скриен паричник'],
    'owner: hidden item not in the feed';
end;
$$;
select pg_temp.logout();
select pg_temp.login_as('00000000-0000-4000-8000-0000000000c5');
do $$
begin
  assert (select count(*) from public.items where id = '42000000-0000-4000-8000-000000000005') = 1,
    'admin can see the hidden item directly';
  assert not pg_temp.titles(item_status => null) @> array['Скриен паричник'],
    'admin: hidden item not in the feed';
  assert pg_temp.titles(q => 'скриен', item_status => null) = '{}',
    'admin: not even when searched for';
end;
$$;
select pg_temp.logout();
