-- Tests for favorites: constraints, cascades, privileges and policies (users
-- see, add and remove only their own; only visible, not hidden items) and
-- is_favorite in search_items().
--
-- Test items all occurred in July 2001, and every search filters by those
-- dates, so real items in the database do not affect the results.

-- Users: A and B, C (admin), D (banned).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000ac', 'fav-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000bc', 'fav-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000cc', 'fav-admin@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000dc', 'fav-d@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000cc';
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-0000000000dc';

-- B's items: I1 (active), I2 (resolved), I3 (hidden), I5 (active, deleted
-- below). A's item: I4 (active).
insert into public.items
  (id, user_id, type, status, title, description, category_id, occurred_on, created_at,
   location)
select v.id::uuid, v.user_id::uuid, v.type::public.item_type, v.status::public.item_status,
  v.title, 'Test item for favorites.', 8, date '2001-07-10',
  timestamptz '2001-08-01 12:00+00' + v.minutes * interval '1 minute',
  extensions.st_setsrid(extensions.st_makepoint(21.4254, 41.9981), 4326)::extensions.geography
from (values
  ('60000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000bc',
   'lost', 'active', 'Favorite one', 1),
  ('60000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000bc',
   'found', 'resolved', 'Favorite two', 2),
  ('60000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000bc',
   'lost', 'hidden', 'Favorite three', 3),
  ('60000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000ac',
   'found', 'active', 'Favorite four', 4),
  ('60000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-0000000000bc',
   'found', 'active', 'Favorite five', 5)
) as v (id, user_id, type, status, title, minutes);

-- A saved I1 and I5, B saved I4, D saved I1.
insert into public.favorites (user_id, item_id)
values
  ('00000000-0000-4000-8000-0000000000ac', '60000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-0000000000ac', '60000000-0000-4000-8000-000000000005'),
  ('00000000-0000-4000-8000-0000000000bc', '60000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-0000000000dc', '60000000-0000-4000-8000-000000000001');

-- Ids of July items in the search results that have is_favorite set (with
-- the item status filter off, so resolved items count too).
create function pg_temp.favorite_hits()
returns uuid[]
language sql
as $$
  select coalesce(array_agg(r.id order by r.id) filter (where r.is_favorite), '{}')
  from public.search_items(
    item_status => null, date_from => '2001-07-01', date_to => '2001-07-31'
  ) as r;
$$;
grant execute on function pg_temp.favorite_hits to anon, authenticated;

-- Constraints, defaults, indexes and cascades (as the table owner) ------------
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000ac';
  f public.favorites;
begin
  insert into public.favorites (user_id, item_id)
  values (a, '60000000-0000-4000-8000-000000000002')
  returning * into f;
  assert f.created_at is not null, 'created_at has a default';

  begin
    insert into public.favorites (user_id, item_id)
    values (a, '60000000-0000-4000-8000-000000000002');
    raise exception 'the same favorite twice should be rejected';
  exception when unique_violation then null;
  end;
  delete from public.favorites where user_id = a and item_id = f.item_id;

  begin
    insert into public.favorites (user_id, item_id)
    values (a, '60000000-0000-4000-8000-0000000000ff');
    raise exception 'a favorite of an unknown item should be rejected';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.favorites (user_id, item_id)
    values ('00000000-0000-4000-8000-0000000000ff', '60000000-0000-4000-8000-000000000001');
    raise exception 'a favorite of an unknown user should be rejected';
  exception when foreign_key_violation then null;
  end;

  assert exists (
    select 1 from pg_indexes
    where tablename = 'favorites' and indexname = 'favorites_user_id_created_at_idx'
  ), 'list index exists';
  assert exists (
    select 1 from pg_indexes
    where tablename = 'favorites' and indexname = 'favorites_item_id_idx'
  ), 'item index exists';
end;
$$;

-- Anonymous visitors see nothing and change nothing ----------------------------
select pg_temp.login_as_anon();

do $$
declare
  n integer;
begin
  select count(*) into n from public.favorites;
  assert n = 0, format('visitors see no favorites, got %s', n);

  begin
    insert into public.favorites (user_id, item_id)
    values ('00000000-0000-4000-8000-0000000000ac', '60000000-0000-4000-8000-000000000004');
    raise exception 'visitors should not add favorites';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.favorites;
    raise exception 'visitors should not remove favorites';
  exception when insufficient_privilege then null;
  end;

  assert pg_temp.favorite_hits() = '{}', 'search_items: no favorites for visitors';
  assert (
    select count(*) from public.search_items(
      item_status => null, date_from => '2001-07-01', date_to => '2001-07-31'
    ) where is_favorite is null
  ) = 0, 'search_items: is_favorite is never null';
end;
$$;

select pg_temp.logout();

-- A: own rows only -------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000ac');

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000ac';
  b uuid := '00000000-0000-4000-8000-0000000000bc';
  ids uuid[];
  n integer;
begin
  select array_agg(item_id order by item_id) into ids from public.favorites;
  assert ids = array[
    '60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000005'
  ]::uuid[], format('A sees only own favorites, got %s', ids);

  assert pg_temp.favorite_hits() = array[
    '60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000005'
  ]::uuid[], format('search_items: A''s favorites, got %s', pg_temp.favorite_hits());

  -- Adding: a resolved item and an own item are allowed.
  insert into public.favorites (user_id, item_id)
  values (a, '60000000-0000-4000-8000-000000000002'),
         (a, '60000000-0000-4000-8000-000000000004');

  begin
    insert into public.favorites (user_id, item_id)
    values (b, '60000000-0000-4000-8000-000000000002');
    raise exception 'A should not add a favorite for B';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.favorites (user_id, item_id)
    values (a, '60000000-0000-4000-8000-000000000003');
    raise exception 'A should not save a hidden item';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.favorites (user_id, item_id)
    values (a, '60000000-0000-4000-8000-0000000000ff');
    raise exception 'A should not save an unknown item';
  exception when insufficient_privilege then null;
  end;

  -- Nothing is updated.
  begin
    update public.favorites set created_at = now() where user_id = a;
    raise exception 'favorites should not be updated';
  exception when insufficient_privilege then null;
  end;

  -- Removing: B's rows are invisible, so nothing happens to them.
  delete from public.favorites where user_id = b;
  get diagnostics n = row_count;
  assert n = 0, 'A cannot remove B''s favorites';

  delete from public.favorites where item_id = '60000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count;
  assert n = 1, 'A removes an own favorite';

  assert pg_temp.favorite_hits() = array[
    '60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004',
    '60000000-0000-4000-8000-000000000005'
  ]::uuid[], format('search_items after changes, got %s', pg_temp.favorite_hits());
end;
$$;

select pg_temp.logout();

-- B: sees only own, even of items B owns ----------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000bc');

do $$
declare
  ids uuid[];
begin
  select array_agg(item_id) into ids from public.favorites;
  assert ids = array['60000000-0000-4000-8000-000000000004']::uuid[],
    format('B sees only own favorites, not who saved B''s items, got %s', ids);
  assert pg_temp.favorite_hits() = array['60000000-0000-4000-8000-000000000004']::uuid[],
    format('search_items: B''s favorites, got %s', pg_temp.favorite_hits());

  -- B may not save B's own hidden item either.
  begin
    insert into public.favorites (user_id, item_id)
    values ('00000000-0000-4000-8000-0000000000bc', '60000000-0000-4000-8000-000000000003');
    raise exception 'B should not save an own hidden item';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select pg_temp.logout();

-- C (admin): no access to other users' favorites --------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000cc');

do $$
declare
  n integer;
begin
  select count(*) into n from public.favorites;
  assert n = 0, format('admins do not see other users'' favorites, got %s', n);
  delete from public.favorites;
  get diagnostics n = row_count;
  assert n = 0, 'admins do not remove other users'' favorites';
  begin
    insert into public.favorites (user_id, item_id)
    values ('00000000-0000-4000-8000-0000000000cc', '60000000-0000-4000-8000-000000000003');
    raise exception 'admins should not save a hidden item';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select pg_temp.logout();

-- D (banned): cannot add, can remove --------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000dc');

do $$
declare
  n integer;
begin
  begin
    insert into public.favorites (user_id, item_id)
    values ('00000000-0000-4000-8000-0000000000dc', '60000000-0000-4000-8000-000000000004');
    raise exception 'banned users should not add favorites';
  exception when insufficient_privilege then null;
  end;
  delete from public.favorites;
  get diagnostics n = row_count;
  assert n = 1, 'banned users can remove their favorites';
end;
$$;

select pg_temp.logout();

-- Cascades: deleting an item or an account removes its favorites ---------------
do $$
declare
  n integer;
begin
  delete from public.items where id = '60000000-0000-4000-8000-000000000005';
  select count(*) into n from public.favorites
  where item_id = '60000000-0000-4000-8000-000000000005';
  assert n = 0, 'deleting an item removes its favorites';

  delete from auth.users where id = '00000000-0000-4000-8000-0000000000bc';
  select count(*) into n from public.favorites
  where user_id = '00000000-0000-4000-8000-0000000000bc';
  assert n = 0, 'deleting an account removes its favorites';
end;
$$;
