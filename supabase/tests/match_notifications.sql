-- Tests for match notifications (§15, P7.S2): a new match notifies each
-- distinct owner once; rescoring, status changes and a recreated pair do not
-- notify again; notifications roll back with their match; notifications
-- about a deleted report are removed; users cannot run the functions.
--
-- Test items lie around 15° N 15° E, far from any real report.

-- Users: A (lost reports), B and C (found reports), D (banned later).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000ab', 'mn-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000bb', 'mn-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000cb', 'mn-c@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000db', 'mn-d@example.com');

create temporary table t_ids as
select
  (select id from public.categories where slug = 'keys') as keys_id,
  (select id from public.categories where slug = 'wallet') as wallet_id,
  (now() at time zone 'Europe/Skopje')::date as today;
grant select on t_ids to authenticated;

-- Notifications of the test users, as the test runner.
create function pg_temp.match_notes(owner uuid)
returns setof public.notifications
language sql
as $$
  select * from public.notifications
  where user_id = owner and type = 'match'
  order by created_at, id;
$$;

-- 1. A new match notifies both owners ----------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000ab');
select public.create_item(
  'lost', 'Изгубени клучеви од кола', 'Црн привезок со два клуча и далечински за Голф.',
  (select keys_id from t_ids), (select today - 10 from t_ids), 15.0, 15.0,
  item_id => '48000000-0000-4000-8000-000000000001');
select pg_temp.logout();

do $$
begin
  assert not exists (select pg_temp.match_notes('00000000-0000-4000-8000-0000000000ab')),
    'a report without a match notifies nobody';
end;
$$;

select pg_temp.login_as('00000000-0000-4000-8000-0000000000bb');
select public.create_item(
  'found', 'Najdeni klucevi', 'Crn privezok so dva kluca i dalecinski za Golf.',
  (select keys_id from t_ids), (select today - 9 from t_ids), 15.009, 15.0,
  item_id => '48000000-0000-4000-8000-000000000002');
select pg_temp.logout();

do $$
declare
  l1 uuid := '48000000-0000-4000-8000-000000000001';
  f1 uuid := '48000000-0000-4000-8000-000000000002';
  m public.matches;
  na public.notifications;
  nb public.notifications;
begin
  select * into strict m from public.matches where lost_item_id = l1;
  assert m.found_item_id = f1, 'the found report creates the match';

  assert (select count(*) from pg_temp.match_notes('00000000-0000-4000-8000-0000000000ab')) = 1,
    'the lost-side owner gets exactly one notification';
  assert (select count(*) from pg_temp.match_notes('00000000-0000-4000-8000-0000000000bb')) = 1,
    'the found-side owner gets exactly one notification';
  select * into na from pg_temp.match_notes('00000000-0000-4000-8000-0000000000ab');
  select * into nb from pg_temp.match_notes('00000000-0000-4000-8000-0000000000bb');

  assert na.data = jsonb_build_object('match_id', m.id, 'item_id', l1, 'other_item_id', f1),
    'A''s data: match id, own lost report, other report: ' || na.data;
  assert nb.data = jsonb_build_object('match_id', m.id, 'item_id', f1, 'other_item_id', l1),
    'B''s data: match id, own found report, other report: ' || nb.data;
  assert na.read_at is null and nb.read_at is null, 'both are unread';
  assert not exists (select 1 from public.notifications
    where user_id = '00000000-0000-4000-8000-0000000000cb'), 'nobody else is notified';
end;
$$;

-- Each owner sees only its own notification.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000ab');

do $$
begin
  assert (select count(*) from public.notifications) = 1, 'A sees one notification';
  assert (select data ->> 'item_id' from public.notifications)
    = '48000000-0000-4000-8000-000000000001', 'A sees its own';
  -- A reads it; later changes must keep that.
  update public.notifications set read_at = now();
end;
$$;

select pg_temp.login_as('00000000-0000-4000-8000-0000000000bb');

do $$
begin
  assert (select count(*) from public.notifications) = 1, 'B sees one notification';
  assert (select data ->> 'item_id' from public.notifications)
    = '48000000-0000-4000-8000-000000000002', 'B sees its own';
end;
$$;

-- 2. Rescoring and status changes do not notify --------------------------------
select pg_temp.logout();
create temporary table t_before as
select * from public.notifications
where user_id in ('00000000-0000-4000-8000-0000000000ab', '00000000-0000-4000-8000-0000000000bb');
create temporary table t_match as
select * from public.matches where lost_item_id = '48000000-0000-4000-8000-000000000001';
grant select on t_before, t_match to authenticated;

-- B edits the description: same row, new score.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000bb');
update public.items set description = 'Crn privezok so dva kluca za Golf.'
where id = '48000000-0000-4000-8000-000000000002';
select pg_temp.logout();

do $$
begin
  assert (select id from public.matches where lost_item_id = '48000000-0000-4000-8000-000000000001')
    = (select id from t_match), 'the match row is kept';
  assert (select (score, breakdown) from public.matches
      where lost_item_id = '48000000-0000-4000-8000-000000000001')
    is distinct from (select (score, breakdown) from t_match), 'the match is rescored';
end;
$$;

-- A recomputes too (title change), then both change the status.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000ab');
update public.items set title = 'Изгубени клучеви од Голф'
where id = '48000000-0000-4000-8000-000000000001';
update public.matches set status = 'confirmed'
where lost_item_id = '48000000-0000-4000-8000-000000000001';
select pg_temp.login_as('00000000-0000-4000-8000-0000000000bb');
update public.matches set status = 'suggested'
where lost_item_id = '48000000-0000-4000-8000-000000000001';
select pg_temp.logout();

do $$
begin
  assert (select count(*) from public.notifications
    where user_id in ('00000000-0000-4000-8000-0000000000ab', '00000000-0000-4000-8000-0000000000bb'))
    = 2, 'still one notification per owner';
  assert (select array_agg((id, data, read_at, created_at)::text order by id) from public.notifications
    where user_id in ('00000000-0000-4000-8000-0000000000ab', '00000000-0000-4000-8000-0000000000bb'))
    = (select array_agg((id, data, read_at, created_at)::text order by id) from t_before),
    'the notifications are unchanged (A''s stays read)';
end;
$$;

-- 3. A pair that drops out and comes back is not new -------------------------
-- Another category removes the suggested row; changing back recreates it with
-- a new id. The notifications keep their id and read state and point to the
-- new match.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000bb');
update public.items set category_id = (select wallet_id from t_ids)
where id = '48000000-0000-4000-8000-000000000002';
select pg_temp.logout();

do $$
begin
  assert not exists (select 1 from public.matches
    where lost_item_id = '48000000-0000-4000-8000-000000000001'), 'the match is removed';
  assert (select count(*) from public.notifications n join t_before b using (id)) = 2,
    'the notifications stay while the match is gone';
end;
$$;

select pg_temp.login_as('00000000-0000-4000-8000-0000000000bb');
update public.items set category_id = (select keys_id from t_ids)
where id = '48000000-0000-4000-8000-000000000002';
select pg_temp.logout();

do $$
declare
  m public.matches;
begin
  select * into strict m from public.matches
  where lost_item_id = '48000000-0000-4000-8000-000000000001';
  assert m.id <> (select id from t_match), 'the match is recreated with a new id';
  assert (select count(*) from public.notifications
    where user_id in ('00000000-0000-4000-8000-0000000000ab', '00000000-0000-4000-8000-0000000000bb'))
    = 2, 'no new notification for a recreated pair';
  assert (select count(*) from public.notifications n join t_before b using (id)
    where n.data ->> 'match_id' = m.id::text
      and n.read_at is not distinct from b.read_at and n.created_at = b.created_at) = 2,
    'both notifications point to the new match, same id, read state and time';
end;
$$;

-- 4. Another match of the same report notifies its two owners -----------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000cb');
select public.create_item(
  'found', 'Pronajdeni klucevi od kola', 'Crn privezok, dva kluca i dalecinski Golf.',
  (select keys_id from t_ids), (select today - 8 from t_ids), 15.01, 15.0,
  item_id => '48000000-0000-4000-8000-000000000003');
select pg_temp.logout();

do $$
declare
  m2 uuid;
begin
  select id into strict m2 from public.matches
  where lost_item_id = '48000000-0000-4000-8000-000000000001'
    and found_item_id = '48000000-0000-4000-8000-000000000003';
  assert (select count(*) from pg_temp.match_notes('00000000-0000-4000-8000-0000000000ab')) = 2,
    'A gets a second notification for the second match';
  assert exists (select 1 from public.notifications
    where user_id = '00000000-0000-4000-8000-0000000000ab' and read_at is null
      and data = jsonb_build_object('match_id', m2,
        'item_id', '48000000-0000-4000-8000-000000000001'::uuid,
        'other_item_id', '48000000-0000-4000-8000-000000000003'::uuid)),
    'A''s new notification is unread and about C''s report';
  assert (select count(*) from pg_temp.match_notes('00000000-0000-4000-8000-0000000000cb')) = 1,
    'C gets one notification';
  assert (select count(*) from pg_temp.match_notes('00000000-0000-4000-8000-0000000000bb')) = 1,
    'B gets nothing for a match it is not part of';
end;
$$;

-- 5. Edge cases of the trigger (rows inserted as the table owner) --------------
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000ab';
  d uuid := '00000000-0000-4000-8000-0000000000db';
  before_a int;
begin
  insert into public.items
    (id, user_id, type, title, description, category_id, occurred_on, location)
  values
    ('48000000-0000-4000-8000-000000000011', a, 'found', 'Own found report',
     'Test item for match notifications.', (select keys_id from t_ids),
     (select today - 30 from t_ids),
     extensions.st_setsrid(extensions.st_makepoint(16, 16), 4326)::extensions.geography),
    ('48000000-0000-4000-8000-000000000012', d, 'found', 'Banned owner''s report',
     'Test item for match notifications.', (select keys_id from t_ids),
     (select today - 30 from t_ids),
     extensions.st_setsrid(extensions.st_makepoint(16, 16), 4326)::extensions.geography);
  before_a := (select count(*) from pg_temp.match_notes(a));

  -- Both items of one owner (the matching functions never do this): one notification.
  insert into public.matches (lost_item_id, found_item_id, score)
  values ('48000000-0000-4000-8000-000000000001', '48000000-0000-4000-8000-000000000011', 0.7);
  assert (select count(*) from pg_temp.match_notes(a)) = before_a + 1,
    'an owner of both items gets one notification';
  assert exists (select 1 from pg_temp.match_notes(a)
    where data ->> 'other_item_id' = '48000000-0000-4000-8000-000000000011'
      and data ->> 'item_id' = '48000000-0000-4000-8000-000000000001'), 'about the lost report';

  -- A failed transaction leaves no notification.
  before_a := (select count(*) from pg_temp.match_notes(a));
  begin
    insert into public.matches (lost_item_id, found_item_id, score)
    values ('48000000-0000-4000-8000-000000000001', '48000000-0000-4000-8000-000000000012', 0.7);
    assert (select count(*) from pg_temp.match_notes(a)) = before_a + 1,
      'the notification exists inside the transaction';
    raise exception 'rollback' using errcode = 'P0099';
  exception when sqlstate 'P0099' then null;
  end;
  assert (select count(*) from pg_temp.match_notes(a)) = before_a,
    'a rolled-back match leaves no notification for A';
  assert not exists (select pg_temp.match_notes(d)), 'nor for D';

  -- A banned owner still receives notifications (reading is allowed).
  update public.profiles set is_banned = true where id = d;
  insert into public.matches (lost_item_id, found_item_id, score)
  values ('48000000-0000-4000-8000-000000000001', '48000000-0000-4000-8000-000000000012', 0.7);
  assert (select count(*) from pg_temp.match_notes(d)) = 1, 'a banned owner is notified';
end;
$$;

-- 6. Security: users cannot create matches or notifications ----------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000cb');

do $$
begin
  begin
    insert into public.matches (lost_item_id, found_item_id, score)
    values ('48000000-0000-4000-8000-000000000001', '48000000-0000-4000-8000-000000000011', 0.9);
    raise exception 'C should not insert matches';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.notifications (user_id, type, data)
    values ('00000000-0000-4000-8000-0000000000ab', 'match', '{}');
    raise exception 'C should not insert notifications';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.notifications set read_at = now()
    where user_id = '00000000-0000-4000-8000-0000000000ab';
  end;
  assert (select count(*) from public.notifications) = 1, 'C still sees only its own';
end;
$$;

select pg_temp.logout();

do $$
begin
  assert not exists (select 1 from public.notifications
    where user_id = '00000000-0000-4000-8000-0000000000ab' and data ->> 'other_item_id'
      = '48000000-0000-4000-8000-000000000003' and read_at is not null),
    'C cannot mark A''s notifications read';
  assert not has_function_privilege('authenticated', 'private.matches_notify()', 'execute'),
    'authenticated cannot execute matches_notify';
  assert not has_function_privilege('anon', 'private.matches_notify()', 'execute'),
    'anon cannot execute matches_notify';
  assert not has_function_privilege('authenticated',
    'private.items_delete_match_notifications()', 'execute'),
    'authenticated cannot execute items_delete_match_notifications';
  assert not has_function_privilege('anon',
    'private.items_delete_match_notifications()', 'execute'),
    'anon cannot execute items_delete_match_notifications';
end;
$$;

-- 7. Deleted reports and accounts ----------------------------------------------
-- B deletes its found report: the match goes, and so do both notifications
-- about that pair; A's notification about C's report stays.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000bb');
delete from public.items where id = '48000000-0000-4000-8000-000000000002';
select pg_temp.logout();

do $$
begin
  assert not exists (select 1 from public.notifications
    where '48000000-0000-4000-8000-000000000002' in (data ->> 'item_id', data ->> 'other_item_id')),
    'notifications about the deleted report are removed';
  assert not exists (select pg_temp.match_notes('00000000-0000-4000-8000-0000000000bb')),
    'B''s own notification is removed';
  assert exists (select 1 from pg_temp.match_notes('00000000-0000-4000-8000-0000000000ab')
    where data ->> 'other_item_id' = '48000000-0000-4000-8000-000000000003'),
    'A keeps the notification about C''s report';
end;
$$;

-- Other notification types are not touched by a report deletion.
insert into public.notifications (user_id, type, data)
values ('00000000-0000-4000-8000-0000000000ab', 'moderation',
  '{"item_id": "48000000-0000-4000-8000-000000000003"}');

-- C's account is deleted: its report and its notifications go; A loses the
-- notification about C's report.
delete from auth.users where id = '00000000-0000-4000-8000-0000000000cb';

do $$
begin
  assert not exists (select 1 from public.notifications
    where user_id = '00000000-0000-4000-8000-0000000000cb'), 'C''s notifications are removed';
  assert not exists (select 1 from pg_temp.match_notes('00000000-0000-4000-8000-0000000000ab')
    where data ->> 'other_item_id' = '48000000-0000-4000-8000-000000000003'),
    'A''s notification about C''s report is removed';
  assert exists (select 1 from public.notifications
    where user_id = '00000000-0000-4000-8000-0000000000ab' and type = 'moderation'),
    'other notification types stay';
end;
$$;

-- Deleting A's lost report (as the table owner, like an admin) removes A's own remaining match notifications.
delete from public.items where id = '48000000-0000-4000-8000-000000000001';

do $$
begin
  assert not exists (select pg_temp.match_notes('00000000-0000-4000-8000-0000000000ab')),
    'A''s match notifications about its deleted report are removed';
  assert not exists (select pg_temp.match_notes('00000000-0000-4000-8000-0000000000db')),
    'D''s notification about A''s deleted report is removed';
end;
$$;
