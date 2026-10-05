-- Tests for category management (P10.S6): fixed slugs, the protected "other"
-- category, admin_reorder_categories() and admin_category_item_counts().
-- Admin insert/update/delete policies are tested in moderation.sql.

select pg_temp.create_user('00000000-0000-4000-8000-0000000000e7', 'cat-admin@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000e7';
select pg_temp.create_user('00000000-0000-4000-8000-0000000000e8', 'cat-user@example.com');

-- Two new categories (as the table owner); one item in the first, hidden.
insert into public.categories (slug, name_mk, name_en, icon, sort_order) values
  ('cat-test-a', 'Тест А', 'Test A', 'package', 500),
  ('cat-test-b', 'Тест Б', 'Test B', 'package', 510);
insert into public.items (id, user_id, type, status, title, description, category_id, occurred_on, location)
values ('63000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e8', 'lost', 'hidden',
  'Category test', 'Test item for category management.',
  (select id from public.categories where slug = 'cat-test-a'), date '2001-07-10',
  extensions.st_setsrid(extensions.st_makepoint(21.4254, 41.9981), 4326)::extensions.geography);

-- Visitors and users: no admin functions.
do $$
begin
  perform pg_temp.login_as_anon();
  begin
    perform public.admin_category_item_counts();
    raise exception 'anon must not call admin_category_item_counts';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_reorder_categories(array[1]::smallint[]);
    raise exception 'anon must not call admin_reorder_categories';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.logout();

  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000e8');
  begin
    perform public.admin_category_item_counts();
    raise exception 'users must not call admin_category_item_counts';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_reorder_categories(
      array(select id from public.categories order by sort_order desc));
    raise exception 'users must not reorder categories';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.logout();
end;
$$;

-- Admins
do $$
declare
  a smallint := (select id from public.categories where slug = 'cat-test-a');
  b smallint := (select id from public.categories where slug = 'cat-test-b');
  ids smallint[];
  n int;
  counts record;
begin
  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000e7');

  -- Item counts include hidden items; unused categories count 0.
  select * into counts from public.admin_category_item_counts() where category_id = a;
  assert counts.item_count = 1, format('count of A: %s', counts.item_count);
  select * into counts from public.admin_category_item_counts() where category_id = b;
  assert counts.item_count = 0, 'count of B';
  select count(*) into n from public.admin_category_item_counts();
  assert n = (select count(*) from public.categories), 'a row per category';

  -- Slugs are fixed; names and icons still change.
  begin
    update public.categories set slug = 'cat-test-renamed' where id = a;
    raise exception 'slugs must not change';
  exception when insufficient_privilege then null;
  end;
  update public.categories set name_en = 'Test A2', name_mk = 'Тест А2', icon = 'wallet' where id = a;
  assert (select name_en from public.categories where id = a) = 'Test A2', 'rename';

  -- Reorder: B first, then A, then the rest in their old order.
  ids := array[b, a] || array(
    select id from public.categories where id not in (a, b) order by sort_order, id);
  perform public.admin_reorder_categories(ids);
  select array_agg(id order by sort_order) into ids from public.categories;
  assert ids[1] = b and ids[2] = a, format('new order %s', ids);
  assert (select array_agg(sort_order order by sort_order) from public.categories)
    = array(select (g * 10)::smallint from generate_series(1, cardinality(ids)) g),
    'sort_order 10, 20, …';

  -- Incomplete, duplicated, unknown or empty lists are refused.
  begin
    perform public.admin_reorder_categories(ids[2:]);
    raise exception 'a missing category must be refused';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_reorder_categories(ids || ids[1]);
    raise exception 'a duplicate must be refused';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_reorder_categories(ids[2:] || array[32000]::smallint[]);
    raise exception 'an unknown id must be refused';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_reorder_categories(null);
    raise exception 'null must be refused';
  exception when invalid_parameter_value then null;
  end;
  assert (select array_agg(id order by sort_order) from public.categories) = ids,
    'refused lists change nothing';

  -- "other" cannot be deleted (even unused); a category in use cannot either.
  begin
    delete from public.categories where slug = 'other';
    raise exception 'other must not be deletable';
  exception when sqlstate 'FL409' then null;
  end;
  begin
    delete from public.categories where id = a;
    raise exception 'a category in use must not be deletable';
  exception when foreign_key_violation then null;
  end;
  delete from public.categories where id = b;
  get diagnostics n = row_count;
  assert n = 1, 'unused category deleted';

  perform pg_temp.logout();
end;
$$;

-- As the table owner too, "other" stays.
do $$
begin
  begin
    delete from public.categories where slug = 'other';
    raise exception 'other must not be deletable by anyone';
  exception when sqlstate 'FL409' then null;
  end;
end;
$$;
