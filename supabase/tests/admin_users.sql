-- Tests for admin_list_users() (P10.S5): admins only, search by name or
-- email, banned filter, counts, paging with the total, and that banning
-- through admin_set_banned() shows in the list and blocks writes at once.
--
-- The database holds other users too, so the tests search for this file's
-- own users (emails "admusers-…@example.com").

select pg_temp.create_user('00000000-0000-4000-8000-0000000000f1', 'admusers-admin@example.com',
  '{"display_name": "Admusers Admin"}');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000f1';
select pg_temp.create_user('00000000-0000-4000-8000-0000000000f2', 'admusers-ana@example.com',
  '{"display_name": "Ана Admusers"}');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000f3', 'admusers-bob@example.com',
  '{"display_name": "Bob 100%_Admusers"}');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000f4', 'admusers-banned@example.com',
  '{"display_name": "Banned One"}');
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-0000000000f4';
-- Creation order: f1 oldest … f4 newest.
update public.profiles set created_at = now() - (interval '1 minute' * (5 - right(id::text, 1)::int))
where id::text like '00000000-0000-4000-8000-0000000000f%';

-- Ana: two items, one with two open flags (one closed flag does not count).
insert into public.items (id, user_id, type, title, description, category_id, occurred_on, location)
select v.id::uuid, '00000000-0000-4000-8000-0000000000f2', 'found', v.title,
  'Test item for the user list.', 1, date '2001-07-10',
  extensions.st_setsrid(extensions.st_makepoint(21.4254, 41.9981), 4326)::extensions.geography
from (values
  ('62000000-0000-4000-8000-000000000001', 'Admusers one'),
  ('62000000-0000-4000-8000-000000000002', 'Admusers two')
) as v (id, title);
insert into public.reports (reporter_id, item_id, reason) values
  ('00000000-0000-4000-8000-0000000000f3', '62000000-0000-4000-8000-000000000001', 'spam'),
  ('00000000-0000-4000-8000-0000000000f4', '62000000-0000-4000-8000-000000000001', 'fraud');
insert into public.reports (reporter_id, item_id, reason) values
  ('00000000-0000-4000-8000-0000000000f1', '62000000-0000-4000-8000-000000000002', 'other');
update public.reports set status = 'dismissed'
where item_id = '62000000-0000-4000-8000-000000000002';

-- Visitors and regular users cannot list users.
do $$
begin
  perform pg_temp.login_as_anon();
  begin
    perform public.admin_list_users();
    assert false, 'anon must not call admin_list_users';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.logout();

  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000f2');
  begin
    perform public.admin_list_users();
    assert false, 'a user must not call admin_list_users';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.logout();
end;
$$;

-- Admins: search, order, counts, filter, paging.
do $$
declare
  rows_found int;
  r record;
  ids uuid[];
begin
  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000f1');

  -- Search by email, newest first, total on every row.
  select array_agg(u.id order by ord), max(u.total_count)::int
    into ids, rows_found
  from (
    select l.*, row_number() over () ord
    from public.admin_list_users('ADMUSERS-') l
  ) u;
  assert ids = array[
    '00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000f3',
    '00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f1'
  ]::uuid[], format('email search, newest first: %s', ids);
  assert rows_found = 4, format('total %s', rows_found);

  -- Search by name (Cyrillic, case-insensitive); % and _ are not wildcards.
  select count(*) into rows_found from public.admin_list_users('  ана admusers ');
  assert rows_found = 1, 'name search';
  select count(*) into rows_found from public.admin_list_users('100%_adm');
  assert rows_found = 1, 'literal % and _';
  select count(*) into rows_found from public.admin_list_users('admusers%');
  assert rows_found = 0, '% is not a wildcard';

  -- Columns and counts.
  select * into r from public.admin_list_users('admusers-ana@');
  assert r.email = 'admusers-ana@example.com' and r.display_name = 'Ана Admusers'
    and r.role = 'user' and not r.is_banned, 'row columns';
  assert r.item_count = 2 and r.open_report_count = 2,
    format('counts %s / %s', r.item_count, r.open_report_count);
  select * into r from public.admin_list_users('admusers-admin@');
  assert r.role = 'admin' and r.item_count = 0 and r.open_report_count = 0, 'admin row';

  -- Banned filter.
  select array_agg(id) into ids from public.admin_list_users('admusers-', true);
  assert ids = array['00000000-0000-4000-8000-0000000000f4']::uuid[], 'banned only';

  -- Paging: the second page of two, and a page past the end.
  select array_agg(id), max(total_count)::int into ids, rows_found
  from public.admin_list_users('admusers-', false, 2, 2);
  assert ids = array['00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f1']::uuid[]
    and rows_found = 4, 'second page';
  select count(*) into rows_found from public.admin_list_users('admusers-', false, 2, 4);
  assert rows_found = 0, 'past the end';

  -- Invalid pages.
  begin
    perform public.admin_list_users(null, false, 0, 0);
    assert false, 'page size 0';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_list_users(null, false, 101, 0);
    assert false, 'page size 101';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_list_users(null, false, 20, -1);
    assert false, 'negative offset';
  exception when invalid_parameter_value then null;
  end;

  -- No search (or a blank one): everyone; this file's users are the newest.
  select count(*) into rows_found
  from public.admin_list_users('   ', false, 4, 0)
  where id::text like '00000000-0000-4000-8000-0000000000f%';
  assert rows_found = 4, 'no search lists everyone, newest first';
  select max(total_count)::int into rows_found from public.admin_list_users();
  assert rows_found = (select count(*) from public.profiles), 'total of everyone';

  -- Banning shows in the list and blocks the next write at once.
  perform public.admin_set_banned('00000000-0000-4000-8000-0000000000f3', true);
  select * into r from public.admin_list_users('admusers-bob@');
  assert r.is_banned, 'banned in the list';
  perform pg_temp.logout();

  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000f3');
  begin
    insert into public.favorites (user_id, item_id)
    values ('00000000-0000-4000-8000-0000000000f3', '62000000-0000-4000-8000-000000000001');
    assert false, 'a banned user must not write';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.logout();

  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000f1');
  perform public.admin_set_banned('00000000-0000-4000-8000-0000000000f3', false);
  perform pg_temp.logout();

  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000f3');
  insert into public.favorites (user_id, item_id)
  values ('00000000-0000-4000-8000-0000000000f3', '62000000-0000-4000-8000-000000000001');
  perform pg_temp.logout();
end;
$$;

-- Users still cannot read other users' role, ban state or email directly.
do $$
begin
  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000f1');
  begin
    perform is_banned from public.profiles limit 1;
    assert false, 'is_banned must not be readable through the table';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.logout();
end;
$$;
