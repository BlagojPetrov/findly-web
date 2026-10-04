-- Tests for moderation (P10.S1): reports (constraints, resolution trigger,
-- privileges, policies), admin policies on categories, admin_set_banned(),
-- admin_stats(), moderation notifications and resolved_at of hidden items,
-- and that banned users cannot insert anything.
--
-- admin_stats() counts the whole database, so its test compares the numbers
-- before and after the test data is added.

-- The admin first, for the baseline of admin_stats().
select pg_temp.create_user('00000000-0000-4000-8000-0000000000c1', 'mod-admin@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000c1';

create temp table baseline (
  users bigint, banned_users bigint, active_lost_items bigint,
  active_found_items bigint, hidden_items bigint, matches bigint,
  confirmed_matches bigint, open_reports bigint, reported_items bigint
);
do $$
declare
  s record;
begin
  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000c1');
  select * into s from public.admin_stats();
  perform pg_temp.logout();
  insert into baseline values (s.users, s.banned_users, s.active_lost_items,
    s.active_found_items, s.hidden_items, s.matches, s.confirmed_matches,
    s.open_reports, s.reported_items);
end;
$$;

-- Users: A (reporter), B (owner), D (banned), E (second admin).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000a1', 'mod-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000b1', 'mod-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000d1', 'mod-d@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000e1', 'mod-e@example.com');
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-0000000000d1';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000e1';

-- B's items: I1 (found, active), I2 (found, resolved), I3 (found, hidden).
-- A's item: I4 (lost, active). D's item: I5 (found, active). C's (admin)
-- item: I6 (found, active). Found items are electronics (1), the lost one
-- documents (2), never "other": the matching triggers create no matches, and
-- the test adds its own below.
insert into public.items
  (id, user_id, type, status, title, description, category_id, occurred_on, location)
select v.id::uuid, v.user_id::uuid, v.type::public.item_type, v.status::public.item_status,
  v.title, 'Test item for moderation.', v.category_id, date '2001-07-10',
  extensions.st_setsrid(extensions.st_makepoint(21.4254, 41.9981), 4326)::extensions.geography
from (values
  ('61000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1',
   'found', 'active', 'Moderation one', 1),
  ('61000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000b1',
   'found', 'resolved', 'Moderation two', 1),
  ('61000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000b1',
   'found', 'hidden', 'Moderation three', 1),
  ('61000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000a1',
   'lost', 'active', 'Moderation four', 2),
  ('61000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-0000000000d1',
   'found', 'active', 'Moderation five', 1),
  ('61000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-0000000000c1',
   'found', 'active', 'Moderation six', 1)
) as v (id, user_id, type, status, title, category_id);

-- Matches: I4 with I1 (confirmed), I2 (suggested), I5 (dismissed).
insert into public.matches (lost_item_id, found_item_id, score, status)
values
  ('61000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000001', 0.9, 'confirmed'),
  ('61000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000002', 0.8, 'suggested'),
  ('61000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000005', 0.7, 'dismissed');

-- Constraints, defaults, resolution trigger and cascades (as the table owner)
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  i1 uuid := '61000000-0000-4000-8000-000000000001';
  r public.reports;
begin
  insert into public.reports (reporter_id, item_id, reason)
  values (a, i1, 'spam')
  returning * into r;
  assert r.status = 'open' and r.resolved_by is null and r.resolved_at is null,
    'a new report is open';
  assert r.created_at is not null and r.details is null, 'defaults';

  begin
    insert into public.reports (reporter_id, item_id, reason)
    values (a, i1, 'fraud');
    raise exception 'a second open report of the same item should be rejected';
  exception when unique_violation then null;
  end;

  -- Closing records the time; a closed report allows a new open one.
  update public.reports set status = 'resolved' where id = r.id returning * into r;
  assert r.resolved_at is not null, 'closing sets resolved_at';
  insert into public.reports (reporter_id, item_id, reason) values (a, i1, 'fraud');
  delete from public.reports where reporter_id = a;

  -- An insert cannot start closed.
  insert into public.reports (reporter_id, item_id, reason, status, resolved_at)
  values (a, i1, 'spam', 'resolved', now())
  returning * into r;
  assert r.status = 'open' and r.resolved_at is null, 'inserts are always open';
  delete from public.reports where id = r.id;

  begin
    insert into public.reports (reporter_id, item_id, reason, details)
    values (a, i1, 'other', repeat('x', 501));
    raise exception 'details over 500 characters should be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.reports (reporter_id, item_id, reason, details)
    values (a, i1, 'other', E' \n\t ');
    raise exception 'whitespace-only details should be rejected';
  exception when check_violation then null;
  end;
  insert into public.reports (reporter_id, item_id, reason, details)
  values (a, i1, 'other', repeat('x', 500));
  delete from public.reports where reporter_id = a;

  begin
    insert into public.reports (reporter_id, item_id, reason)
    values (a, '61000000-0000-4000-8000-0000000000ff', 'spam');
    raise exception 'an unknown item should be rejected';
  exception when foreign_key_violation then null;
  end;

  assert (select count(*) from pg_indexes
          where schemaname = 'public' and tablename = 'reports'
            and indexname in ('reports_open_reporter_item_key', 'reports_item_id_idx',
              'reports_open_created_at_idx', 'reports_reporter_id_idx',
              'reports_resolved_by_idx')) = 5,
    'reports indexes exist';
end;
$$;

-- Cascades: deleting the item or the reporter removes the report; deleting
-- the admin who closed it keeps it.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b1';
  item uuid;
  r uuid;
  admin uuid := '00000000-0000-4000-8000-0000000000f1';
begin
  insert into public.items
    (user_id, type, title, description, category_id, occurred_on, location)
  values (b, 'found', 'Cascade item', 'Test item for moderation.', 1, date '2001-07-10',
    extensions.st_setsrid(extensions.st_makepoint(21.4254, 41.9981), 4326)::extensions.geography)
  returning id into item;
  insert into public.reports (reporter_id, item_id, reason) values (a, item, 'spam')
  returning id into r;
  delete from public.items where id = item;
  assert not exists (select 1 from public.reports where id = r), 'item delete cascades';

  perform pg_temp.create_user(admin, 'mod-f@example.com');
  update public.profiles set role = 'admin' where id = admin;
  perform pg_temp.create_user('00000000-0000-4000-8000-0000000000f2', 'mod-g@example.com');
  insert into public.reports (reporter_id, item_id, reason)
  values ('00000000-0000-4000-8000-0000000000f2', '61000000-0000-4000-8000-000000000001', 'spam')
  returning id into r;
  perform pg_temp.login_as(admin);
  update public.reports set status = 'dismissed' where id = r;
  perform pg_temp.logout();
  assert (select resolved_by from public.reports where id = r) = admin, 'resolved_by is the admin';
  delete from auth.users where id = admin;
  assert (select resolved_by is null and status = 'dismissed' from public.reports where id = r),
    'deleting the admin keeps the report';
  delete from auth.users where id = '00000000-0000-4000-8000-0000000000f2';
  assert not exists (select 1 from public.reports where id = r), 'reporter delete cascades';
end;
$$;

-- Visitors: no access -------------------------------------------------------
do $$
begin
  perform pg_temp.login_as_anon();
  begin
    perform 1 from public.reports;
    raise exception 'visitors should not read reports';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.reports (item_id, reason)
    values ('61000000-0000-4000-8000-000000000001', 'spam');
    raise exception 'visitors should not file reports';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_stats();
    raise exception 'visitors should not call admin_stats';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_set_banned('00000000-0000-4000-8000-0000000000a1', true);
    raise exception 'visitors should not call admin_set_banned';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.categories (slug, name_mk, name_en, icon)
    values ('anon-test', 'Тест', 'Test', 'package');
    raise exception 'visitors should not add categories';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.categories) > 0, 'visitors still read categories';
  perform pg_temp.logout();
end;
$$;

-- A (signed-in user): files reports, sees only their own ----------------------
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b1';
  r public.reports;
  n int;
begin
  perform pg_temp.login_as(a);

  insert into public.reports (item_id, reason, details)
  values ('61000000-0000-4000-8000-000000000001', 'fraud', 'Asks for money first.')
  returning * into r;
  assert r.reporter_id = a and r.status = 'open', 'reporter_id defaults to the user';
  -- A resolved item can be reported too.
  insert into public.reports (item_id, reason)
  values ('61000000-0000-4000-8000-000000000002', 'duplicate');

  begin
    insert into public.reports (item_id, reason)
    values ('61000000-0000-4000-8000-000000000001', 'spam');
    raise exception 'a second open report of the same item should be rejected';
  exception when unique_violation then null;
  end;
  begin
    insert into public.reports (item_id, reason)
    values ('61000000-0000-4000-8000-000000000003', 'spam');
    raise exception 'a hidden item should not be reportable';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.reports (item_id, reason)
    values ('61000000-0000-4000-8000-000000000004', 'spam');
    raise exception 'an own item should not be reportable';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.reports (reporter_id, item_id, reason)
    values (b, '61000000-0000-4000-8000-000000000005', 'spam');
    raise exception 'reporting in the name of another user should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.reports (item_id, reason, status)
    values ('61000000-0000-4000-8000-000000000005', 'spam', 'resolved');
    raise exception 'setting the status on insert should be denied';
  exception when insufficient_privilege then null;
  end;

  assert (select count(*) from public.reports) = 2, 'A sees only own reports';

  update public.reports set status = 'dismissed' where id = r.id;
  get diagnostics n = row_count;
  assert n = 0, 'A cannot change the status';
  begin
    update public.reports set reason = 'spam' where id = r.id;
    raise exception 'updating the reason should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.reports where id = r.id;
    raise exception 'deleting reports should be denied';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_stats();
    raise exception 'users should not get admin_stats';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_set_banned(b, true);
    raise exception 'users should not ban';
  exception when insufficient_privilege then null;
  end;

  -- Categories: read-only for users.
  begin
    insert into public.categories (slug, name_mk, name_en, icon)
    values ('user-test', 'Тест', 'Test', 'package');
    raise exception 'users should not add categories';
  exception when insufficient_privilege then null;
  end;
  update public.categories set name_en = 'Changed' where id = 1;
  get diagnostics n = row_count;
  assert n = 0, 'users cannot rename categories';
  delete from public.categories where slug = 'other';
  get diagnostics n = row_count;
  assert n = 0, 'users cannot delete categories';

  perform pg_temp.logout();

  -- B (the owner of the reported items) does not see who reported them.
  perform pg_temp.login_as(b);
  assert (select count(*) from public.reports) = 0, 'B sees no reports about B''s items';
  perform pg_temp.logout();
end;
$$;

-- Banned users cannot insert anything ---------------------------------------
do $$
declare
  d uuid := '00000000-0000-4000-8000-0000000000d1';
  conversation uuid;
begin
  -- A conversation of D about B's item, created before the ban mattered.
  insert into public.conversations (item_id, owner_id, requester_id)
  values ('61000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', d)
  returning id into conversation;

  perform pg_temp.login_as(d);
  begin
    insert into public.reports (item_id, reason)
    values ('61000000-0000-4000-8000-000000000001', 'spam');
    raise exception 'a banned user should not file reports';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.items
      (type, title, description, category_id, occurred_on, location)
    values ('lost', 'Banned item', 'Test item for moderation.', 1, date '2001-07-10',
      extensions.st_setsrid(extensions.st_makepoint(21.4254, 41.9981), 4326)::extensions.geography);
    raise exception 'a banned user should not create items';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.item_images (item_id, storage_path, position)
    values ('61000000-0000-4000-8000-000000000005', d::text || '/banned.webp', 0);
    raise exception 'a banned user should not add images';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.favorites (user_id, item_id)
    values (d, '61000000-0000-4000-8000-000000000001');
    raise exception 'a banned user should not add favorites';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.conversations (item_id, owner_id)
    values ('61000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-0000000000c1');
    raise exception 'a banned user should not start conversations';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.messages (conversation_id, body) values (conversation, 'Hello');
    raise exception 'a banned user should not send messages';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', d::text || '/banned.webp', d::text);
    raise exception 'a banned user should not upload files';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set display_name = 'Banned name' where id = d;
    raise exception 'a banned user should not update the profile';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.logout();
end;
$$;

-- Admins: all reports, status changes, categories --------------------------
do $$
declare
  c uuid := '00000000-0000-4000-8000-0000000000c1';
  r public.reports;
  category smallint;
  n int;
begin
  perform pg_temp.login_as(c);
  assert (select count(*) from public.reports
          where item_id in ('61000000-0000-4000-8000-000000000001',
                            '61000000-0000-4000-8000-000000000002')) = 2,
    'admins see all reports';

  update public.reports set status = 'resolved'
  where item_id = '61000000-0000-4000-8000-000000000001'
  returning * into r;
  assert r.status = 'resolved' and r.resolved_by = c and r.resolved_at is not null,
    'resolving records the admin and the time';
  update public.reports set status = 'open' where id = r.id returning * into r;
  assert r.resolved_by is null and r.resolved_at is null, 'reopening clears them';
  update public.reports set status = 'dismissed' where id = r.id returning * into r;
  assert r.status = 'dismissed' and r.resolved_by = c, 'dismissing records the admin';
  begin
    update public.reports set details = 'Changed' where id = r.id;
    raise exception 'admins should change only the status';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.reports (item_id, reason)
    values ('61000000-0000-4000-8000-000000000006', 'spam');
    raise exception 'an admin should not report an own item';
  exception when insufficient_privilege then null;
  end;

  insert into public.categories (slug, name_mk, name_en, icon, sort_order)
  values ('moderation-test', 'Тест', 'Test', 'package', 90)
  returning id into category;
  update public.categories set name_en = 'Test two', sort_order = 95 where id = category;
  get diagnostics n = row_count;
  assert n = 1, 'admins rename and reorder categories';
  delete from public.categories where id = category;
  get diagnostics n = row_count;
  assert n = 1, 'admins delete unused categories';
  begin
    delete from public.categories where id = 1;
    raise exception 'a category in use should not be deletable';
  exception when foreign_key_violation then null;
  end;
  perform pg_temp.logout();
end;
$$;

-- admin_set_banned -----------------------------------------------------------
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  c uuid := '00000000-0000-4000-8000-0000000000c1';
begin
  perform pg_temp.login_as(c);
  assert public.admin_set_banned(a, true) = true, 'returns the new value';
  perform pg_temp.logout();
  assert (select is_banned from public.profiles where id = a), 'A is banned';

  -- The ban applies to A's next write at once.
  perform pg_temp.login_as(a);
  begin
    insert into public.reports (item_id, reason)
    values ('61000000-0000-4000-8000-000000000005', 'spam');
    raise exception 'a freshly banned user should not file reports';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.logout();

  perform pg_temp.login_as(c);
  assert public.admin_set_banned(a, false) = false, 'unban returns false';
  begin
    perform public.admin_set_banned(c, true);
    raise exception 'admins should not ban themselves';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_set_banned('00000000-0000-4000-8000-0000000000e1', true);
    raise exception 'admins should not ban admins';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_set_banned('00000000-0000-4000-8000-0000000000ff', true);
    raise exception 'an unknown user should be reported';
  exception when no_data_found then null;
  end;
  perform pg_temp.logout();

  perform pg_temp.login_as(a);
  insert into public.reports (item_id, reason)
  values ('61000000-0000-4000-8000-000000000005', 'spam');
  perform pg_temp.logout();
  assert not (select is_banned from public.profiles where id = '00000000-0000-4000-8000-0000000000e1'),
    'the other admin stays unbanned';
end;
$$;

-- admin_stats: the test data changes every number by a known amount -------
do $$
declare
  s record;
  b record;
begin
  select * into b from baseline;
  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000c1');
  select * into s from public.admin_stats();
  perform pg_temp.logout();
  -- Users: A, B, D, E (F and G were deleted).
  assert s.users - b.users = 4, format('users +4, got %s', s.users - b.users);
  assert s.banned_users - b.banned_users = 1, 'banned +1 (D)';
  -- Active: I4 lost; I1, I5, I6 found.
  assert s.active_lost_items - b.active_lost_items = 1, 'active lost +1';
  assert s.active_found_items - b.active_found_items = 3, 'active found +3';
  assert s.hidden_items - b.hidden_items = 1, 'hidden +1 (I3)';
  -- Matches: confirmed and suggested count, dismissed does not.
  assert s.matches - b.matches = 2, format('matches +2, got %s', s.matches - b.matches);
  assert s.confirmed_matches - b.confirmed_matches = 1, 'confirmed +1';
  -- Open: A about I2 and I5 (A's report about I1 was dismissed).
  assert s.open_reports - b.open_reports = 2, format('open reports +2, got %s', s.open_reports - b.open_reports);
  assert s.reported_items - b.reported_items = 2, 'reported items +2';
end;
$$;

-- Moderation notifications and resolved_at of hidden items ------------------
do $$
declare
  b uuid := '00000000-0000-4000-8000-0000000000b1';
  c uuid := '00000000-0000-4000-8000-0000000000c1';
  i1 uuid := '61000000-0000-4000-8000-000000000001';
  i2 uuid := '61000000-0000-4000-8000-000000000002';
  resolved timestamptz;
  n int;
begin
  resolved := (select resolved_at from public.items where id = i2);
  assert resolved is not null, 'I2 is resolved';

  perform pg_temp.login_as(c);
  update public.items set status = 'hidden' where id in (i1, i2);
  -- Editing a hidden item does not notify again.
  update public.items set title = 'Moderation one edited' where id = i1;
  perform pg_temp.logout();

  assert (select resolved_at from public.items where id = i2) = resolved,
    'a hidden item keeps resolved_at';
  assert (select count(*) from public.notifications
          where user_id = b and type = 'moderation'
            and data = jsonb_build_object('item_id', i1, 'action', 'item_hidden')) = 1,
    'hiding notifies the owner';
  assert (select count(*) from public.notifications
          where user_id = b and type = 'moderation' and data ->> 'item_id' = i2::text) = 1,
    'one notification per hidden item';

  -- B sees them; nobody else does.
  perform pg_temp.login_as(b);
  assert (select count(*) from public.notifications where type = 'moderation') = 2,
    'the owner sees the moderation notifications';
  perform pg_temp.logout();
  perform pg_temp.login_as('00000000-0000-4000-8000-0000000000a1');
  assert (select count(*) from public.notifications where type = 'moderation') = 0,
    'others do not';
  perform pg_temp.logout();

  -- Restoring: to active, and to resolved with the original time.
  perform pg_temp.login_as(c);
  update public.items set status = 'active' where id = i1;
  update public.items set status = 'resolved' where id = i2;
  perform pg_temp.logout();
  assert (select resolved_at from public.items where id = i2) = resolved,
    'restoring to resolved keeps the original resolved_at';
  assert (select resolved_at is null from public.items where id = i1),
    'an active item has no resolved_at';
  assert (select count(*) from public.notifications
          where user_id = b and type = 'moderation' and data ->> 'action' = 'item_restored') = 2,
    'restoring notifies the owner';

  -- Owner status changes (active ↔ resolved) do not notify.
  perform pg_temp.login_as(b);
  update public.items set status = 'resolved' where id = i1;
  update public.items set status = 'active' where id = i1;
  begin
    update public.items set status = 'hidden' where id = i1;
    raise exception 'owners should not hide items';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.logout();
  assert (select count(*) from public.notifications
          where user_id = b and type = 'moderation') = 4,
    'owner changes add no moderation notifications';
  assert (select resolved_at is null from public.items where id = i1),
    'active clears resolved_at';

  -- An admin hiding an own item gets no notification.
  perform pg_temp.login_as(c);
  update public.items set status = 'hidden' where id = '61000000-0000-4000-8000-000000000006';
  perform pg_temp.logout();
  assert not exists (select 1 from public.notifications where user_id = c and type = 'moderation'),
    'no notification for an admin''s own item';
end;
$$;
