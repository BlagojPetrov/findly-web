-- Tests for matches: constraints, privileges and policies (owners of either
-- item see a match and change only its status; nobody inserts or deletes).
--
-- Test items lie at 10° N 10° E, far from any real report.

-- Users: A (owns the lost items), B (owns F1), D (banned, owns F2),
-- E (stranger), C (admin).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000a8', 'm-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000b8', 'm-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000c8', 'm-admin@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000d8', 'm-d@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000e8', 'm-e@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000c8';
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-0000000000d8';

insert into public.items
  (id, user_id, type, title, description, category_id, occurred_on, location)
select v.id::uuid, v.user_id::uuid, v.type::public.item_type, v.title,
  'Test item for matches.', 8, date '2001-06-01',
  extensions.st_setsrid(extensions.st_makepoint(10, 10), 4326)::extensions.geography
from (values
  ('45000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a8', 'lost', 'Lost one'),
  ('45000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a8', 'lost', 'Lost two'),
  ('45000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000b8', 'found', 'Found one'),
  ('45000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000d8', 'found', 'Found two')
) as v (id, user_id, type, title);

-- The insert trigger (P6.S3) already matched these items; this file tests the
-- table with its own rows.
delete from public.matches
where lost_item_id in ('45000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000002');

-- M1: L1 ↔ F1 (A, B); M2: L1 ↔ F2 (A, D); M3: L2 ↔ F1 (A, B).
insert into public.matches
  (id, lost_item_id, found_item_id, score, breakdown, created_at, updated_at)
values
  ('55000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000003', 0.812, '{"version": "v1"}',
   timestamptz '2001-06-02 12:00+00', timestamptz '2001-06-02 12:00+00'),
  ('55000000-0000-4000-8000-000000000002', '45000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000004', 0.6, '{"version": "v1"}',
   timestamptz '2001-06-02 12:00+00', timestamptz '2001-06-02 12:00+00'),
  ('55000000-0000-4000-8000-000000000003', '45000000-0000-4000-8000-000000000002',
   '45000000-0000-4000-8000-000000000003', 0.7, '{"version": "v1"}',
   timestamptz '2001-06-02 12:00+00', timestamptz '2001-06-02 12:00+00');

-- Constraints and defaults (as the table owner) ------------------------------
do $$
declare
  l1 uuid := '45000000-0000-4000-8000-000000000001';
  f1 uuid := '45000000-0000-4000-8000-000000000003';
  f2 uuid := '45000000-0000-4000-8000-000000000004';
begin
  assert (select status from public.matches where id = '55000000-0000-4000-8000-000000000001')
    = 'suggested', 'status defaults to suggested';
  assert (select score from public.matches where id = '55000000-0000-4000-8000-000000000001')
    = 0.812, 'score keeps three decimals';

  begin
    insert into public.matches (lost_item_id, found_item_id, score) values (l1, f1, 0.9);
    raise exception 'a duplicate pair should be rejected';
  exception when unique_violation then null;
  end;
  begin
    insert into public.matches (lost_item_id, found_item_id, score) values (l1, l1, 0.9);
    raise exception 'a pair of the same item should be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.matches (lost_item_id, found_item_id, score)
    values ('45000000-0000-4000-8000-000000000002', f2, 1.5);
    raise exception 'a score above 1 should be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.matches (lost_item_id, found_item_id, score)
    values ('45000000-0000-4000-8000-000000000002', f2, -0.1);
    raise exception 'a negative score should be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.matches (lost_item_id, found_item_id, score, breakdown)
    values ('45000000-0000-4000-8000-000000000002', f2, 0.9, '[]');
    raise exception 'a breakdown that is not an object should be rejected';
  exception when check_violation then null;
  end;
end;
$$;

-- Anonymous visitors have no access ------------------------------------------
select pg_temp.login_as_anon();

do $$
begin
  begin
    perform 1 from public.matches;
    raise exception 'anon should not read matches';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select pg_temp.logout();

-- Owner A (lost side): sees all three, updates only status -------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a8');

do $$
declare
  m1 uuid := '55000000-0000-4000-8000-000000000001';
  n int;
begin
  assert (select count(*) from public.matches) = 3, 'A sees the matches of both lost items';

  update public.matches set status = 'dismissed' where id = m1;
  get diagnostics n = row_count;
  assert n = 1, 'A can change the status';
  assert (select status from public.matches where id = m1) = 'dismissed', 'status changed';
  assert (select updated_at from public.matches where id = m1)
    > timestamptz '2001-06-02 12:00+00', 'updated_at is refreshed';

  begin
    update public.matches set score = 1 where id = m1;
    raise exception 'A should not change the score';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.matches set breakdown = '{}' where id = m1;
    raise exception 'A should not change the breakdown';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.matches set found_item_id = '45000000-0000-4000-8000-000000000004'
    where id = m1;
    raise exception 'A should not change the pair';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.matches (lost_item_id, found_item_id, score)
    values ('45000000-0000-4000-8000-000000000002', '45000000-0000-4000-8000-000000000004', 0.9);
    raise exception 'A should not insert matches';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.matches where id = m1;
    raise exception 'A should not delete matches';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select pg_temp.logout();

-- Owner B (found side): sees M1 and M3, also after its item is hidden ---------
update public.items set status = 'hidden' where id = '45000000-0000-4000-8000-000000000003';
select pg_temp.login_as('00000000-0000-4000-8000-0000000000b8');

do $$
declare
  n int;
begin
  assert (select count(*) from public.matches) = 2, 'B sees the matches of F1';
  assert not exists (
    select 1 from public.matches where id = '55000000-0000-4000-8000-000000000002'
  ), 'B does not see the match of another found item';

  update public.matches set status = 'confirmed'
  where id = '55000000-0000-4000-8000-000000000003';
  get diagnostics n = row_count;
  assert n = 1, 'B can change the status';

  update public.matches set status = 'dismissed'
  where id = '55000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'B cannot change a match it does not see';
end;
$$;

select pg_temp.logout();
update public.items set status = 'active' where id = '45000000-0000-4000-8000-000000000003';

-- Banned owner D: reads its match, cannot change it --------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000d8');

do $$
begin
  assert (select count(*) from public.matches) = 1, 'banned D still sees its match';
  begin
    update public.matches set status = 'dismissed'
    where id = '55000000-0000-4000-8000-000000000002';
    raise exception 'banned D should not change the status';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select pg_temp.logout();

-- Stranger E and admin C see nothing ------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000e8');

do $$
declare
  n int;
begin
  assert (select count(*) from public.matches) = 0, 'E sees no matches';
  update public.matches set status = 'dismissed';
  get diagnostics n = row_count;
  assert n = 0, 'E cannot change any match';
end;
$$;

select pg_temp.logout();
select pg_temp.login_as('00000000-0000-4000-8000-0000000000c8');

do $$
begin
  assert (select count(*) from public.matches) = 0, 'admins see no matches';
end;
$$;

select pg_temp.logout();

-- Matches are removed with their items ----------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a8');
delete from public.items where id = '45000000-0000-4000-8000-000000000001';
select pg_temp.logout();

do $$
begin
  assert (select count(*) from public.matches
    where id in ('55000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000002'))
    = 0, 'deleting the lost item deletes its matches';
  assert exists (select 1 from public.matches where id = '55000000-0000-4000-8000-000000000003'),
    'other matches stay';
end;
$$;
