-- Tests for the daily conversation limit (20 new conversations per user in
-- 24 hours): the limit and its boundary, re-opening existing conversations,
-- single-statement (bulk) inserts, the time window, per-user quotas and
-- attempts to get around it through the API roles.
--
-- All test items are "found" reports, so no matches are created.

-- Users: O1 and O2 (owners of 12 items each), R and S (requesters).
select pg_temp.create_user('00000000-0000-4000-8000-0000000001a5', 'l-o1@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000001b5', 'l-o2@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000001c5', 'l-r@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000001d5', 'l-s@example.com');

-- Items 01–12 of O1, 13–24 of O2 (ids 44000000-…-0000000000NN).
insert into public.items
  (id, user_id, type, title, description, category_id, occurred_on, location)
select ('44000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  case when n <= 12 then '00000000-0000-4000-8000-0000000001a5'::uuid
       else '00000000-0000-4000-8000-0000000001b5'::uuid end,
  'found', 'Limit item ' || n, 'Test item for the conversation limit.', 1,
  date '2001-06-01',
  extensions.st_setsrid(extensions.st_makepoint(40, -40), 4326)::extensions.geography
from generate_series(1, 24) as n;

-- The item with number n and its owner.
create function pg_temp.item(n int) returns uuid language sql as $$
  select ('44000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.owner(n int) returns uuid language sql as $$
  select case when n <= 12 then '00000000-0000-4000-8000-0000000001a5'::uuid
              else '00000000-0000-4000-8000-0000000001b5'::uuid end;
$$;
grant execute on function pg_temp.item(int), pg_temp.owner(int) to authenticated;

-- R: 20 conversations one by one, the 21st is rejected -----------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000001c5');

do $$
declare
  rows int;
  first_id uuid;
begin
  for n in 1..20 loop
    insert into public.conversations (item_id, owner_id) values (pg_temp.item(n), pg_temp.owner(n));
  end loop;
  assert (select count(*) from public.conversations) = 20, 'R started 20 conversations';

  begin
    insert into public.conversations (item_id, owner_id) values (pg_temp.item(21), pg_temp.owner(21));
    raise exception 'the 21st conversation in 24 hours should be rejected';
  exception when sqlstate 'FL429' then
    assert sqlerrm = 'daily_conversation_limit', 'the limit has its error code';
  end;
  assert (select count(*) from public.conversations) = 20, 'nothing was added';

  -- Re-opening an existing conversation still works at the limit.
  insert into public.conversations (item_id, owner_id) values (pg_temp.item(1), pg_temp.owner(1))
  on conflict (item_id, requester_id) do nothing;
  get diagnostics rows = row_count;
  assert rows = 0, '"on conflict do nothing" on an existing conversation is not limited';
  begin
    insert into public.conversations (item_id, owner_id) values (pg_temp.item(1), pg_temp.owner(1));
    raise exception 'a duplicate should be rejected';
  exception when unique_violation then null;
  end;

  -- Messages in existing conversations are not affected.
  select id into first_id from public.conversations where item_id = pg_temp.item(1);
  insert into public.messages (conversation_id, body) values (first_id, 'Still allowed');

  -- Bypass attempts through the API role.
  begin
    insert into public.conversations (item_id, owner_id, created_at)
    values (pg_temp.item(21), pg_temp.owner(21), now() - interval '2 days');
    raise exception 'R should not backdate a conversation';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.conversations set created_at = now() - interval '2 days';
    raise exception 'R should not backdate its conversations';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.conversations where item_id = pg_temp.item(2);
    raise exception 'R should not delete a conversation to free its quota';
  exception when insufficient_privilege then null;
  end;
  begin
    alter table public.conversations disable trigger conversations_check_daily_limit;
    raise exception 'R should not disable the trigger';
  exception when insufficient_privilege then null;
  end;
  begin
    set local session_replication_role = replica;
    raise exception 'R should not switch off triggers with session_replication_role';
  exception when insufficient_privilege then null;
  end;
  begin
    perform private.conversations_check_daily_limit();
    raise exception 'R should not execute the trigger function';
  exception when insufficient_privilege then null;
  end;
  -- Someone else's requester_id is rejected by the policy, not counted for
  -- anybody (S's quota is checked below).
  begin
    insert into public.conversations (item_id, owner_id, requester_id)
    values (pg_temp.item(21), pg_temp.owner(21), '00000000-0000-4000-8000-0000000001d5');
    raise exception 'R should not start a conversation for S';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select pg_temp.logout();

-- The trigger serializes per requester: the inserting transaction holds an
-- advisory lock until it ends.
do $$
begin
  assert exists (
    select 1 from pg_locks
    where locktype = 'advisory' and pid = pg_backend_pid() and granted
      and ((classid::bigint << 32) | objid::bigint) = hashtextextended(
        'conversations_daily_limit:00000000-0000-4000-8000-0000000001c5', 0)
  ), 'the requester''s advisory lock is held until the transaction ends';
end;
$$;

-- S is not affected by R: a 21-row insert in one statement fails as a whole,
-- 20 in one statement pass, then the next one fails ------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000001d5');

do $$
begin
  assert not exists (select 1 from public.conversations), 'S has no conversation yet';
  begin
    insert into public.conversations (item_id, owner_id)
    select pg_temp.item(n), pg_temp.owner(n) from generate_series(1, 21) as n;
    raise exception '21 conversations in one statement should be rejected';
  exception when sqlstate 'FL429' then null;
  end;
  assert not exists (select 1 from public.conversations), 'the rejected statement added nothing';

  insert into public.conversations (item_id, owner_id)
  select pg_temp.item(n), pg_temp.owner(n) from generate_series(1, 20) as n;
  assert (select count(*) from public.conversations) = 20, 'S started 20 in one statement';

  begin
    insert into public.conversations (item_id, owner_id) values (pg_temp.item(24), pg_temp.owner(24));
    raise exception 'S''s 21st conversation should be rejected';
  exception when sqlstate 'FL429' then null;
  end;
end;
$$;

-- The 24-hour window (as the table owner, R's oldest conversation is moved
-- back in time) ---------------------------------------------------------------
select pg_temp.logout();

update public.conversations
set created_at = now() - interval '24 hours' + interval '1 second'
where item_id = pg_temp.item(1)
  and requester_id = '00000000-0000-4000-8000-0000000001c5';

select pg_temp.login_as('00000000-0000-4000-8000-0000000001c5');

do $$
begin
  begin
    insert into public.conversations (item_id, owner_id) values (pg_temp.item(21), pg_temp.owner(21));
    raise exception 'a conversation 1 second inside the window still counts';
  exception when sqlstate 'FL429' then null;
  end;
end;
$$;

select pg_temp.logout();

update public.conversations
set created_at = now() - interval '24 hours'
where item_id = pg_temp.item(1)
  and requester_id = '00000000-0000-4000-8000-0000000001c5';

select pg_temp.login_as('00000000-0000-4000-8000-0000000001c5');

do $$
begin
  insert into public.conversations (item_id, owner_id) values (pg_temp.item(21), pg_temp.owner(21));
  assert (select count(*) from public.conversations) = 21,
    'a conversation exactly 24 hours old no longer counts';
  begin
    insert into public.conversations (item_id, owner_id) values (pg_temp.item(22), pg_temp.owner(22));
    raise exception 'back at the limit, the next one should be rejected';
  exception when sqlstate 'FL429' then null;
  end;
end;
$$;

select pg_temp.logout();

-- Only conversations a user started count: O1 is the owner in 24 of them
-- today and can still contact O2 -------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000001a5');

do $$
begin
  assert (
    select count(*) from public.conversations
    where owner_id = '00000000-0000-4000-8000-0000000001a5'
  ) = 24, 'O1 owns 24 conversations (12 from R, 12 from S)';
  insert into public.conversations (item_id, owner_id) values (pg_temp.item(24), pg_temp.owner(24));
  assert (
    select count(*) from public.conversations
    where requester_id = '00000000-0000-4000-8000-0000000001a5'
  ) = 1, 'O1 started its own conversation';
end;
$$;

select pg_temp.logout();
