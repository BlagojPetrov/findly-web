-- Tests for notifications: constraints, privileges and policies (users see,
-- mark read and delete only their own; nobody inserts) and Realtime.

-- Users: A and B (owners of notifications), D (banned), C (admin).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000a9', 'n-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000b9', 'n-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000c9', 'n-admin@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000d9', 'n-d@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000c9';
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-0000000000d9';

-- N1, N2 (unread) and N3 (read) for A; N4 for B; N5 for D.
insert into public.notifications (id, user_id, type, data, read_at, created_at)
values
  ('56000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a9', 'match',
   '{"match_id": "55000000-0000-4000-8000-000000000001"}', null,
   timestamptz '2001-06-02 12:00+00'),
  ('56000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a9', 'message',
   '{"conversation_id": "57000000-0000-4000-8000-000000000001"}', null,
   timestamptz '2001-06-03 12:00+00'),
  ('56000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000a9', 'moderation',
   '{"item_id": "45000000-0000-4000-8000-000000000001"}', timestamptz '2001-06-02 13:00+00',
   timestamptz '2001-06-01 12:00+00'),
  ('56000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000b9', 'match',
   '{}', null, timestamptz '2001-06-02 12:00+00'),
  ('56000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-0000000000d9', 'match',
   '{}', null, timestamptz '2001-06-02 12:00+00');

-- Constraints, defaults, indexes and Realtime (as the table owner) -------------
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  n public.notifications;
begin
  insert into public.notifications (user_id, type) values (a, 'match') returning * into n;
  assert n.id is not null, 'id has a default';
  assert n.data = '{}', 'data defaults to an empty object';
  assert n.read_at is null, 'a new notification is unread';
  assert n.created_at is not null, 'created_at has a default';
  delete from public.notifications where id = n.id;

  begin
    insert into public.notifications (user_id, type, data) values (a, 'match', '[]');
    raise exception 'data that is not an object should be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.notifications (user_id, type) values (a, null);
    raise exception 'a notification without a type should be rejected';
  exception when not_null_violation then null;
  end;
  begin
    insert into public.notifications (user_id, type)
    values ('00000000-0000-4000-8000-0000000000f9', 'match');
    raise exception 'a notification for an unknown user should be rejected';
  exception when foreign_key_violation then null;
  end;

  assert exists (
    select 1 from pg_indexes
    where tablename = 'notifications' and indexname = 'notifications_user_id_created_at_idx'
  ), 'list index exists';
  assert exists (
    select 1 from pg_indexes
    where tablename = 'notifications' and indexname = 'notifications_user_id_unread_idx'
      and indexdef like '%WHERE (read_at IS NULL)%'
  ), 'partial unread index exists';
  assert exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ), 'notifications are in the Realtime publication';
end;
$$;

-- Anonymous visitors have no access ------------------------------------------
select pg_temp.login_as_anon();

do $$
begin
  begin
    perform 1 from public.notifications;
    raise exception 'anon should not read notifications';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.notifications set read_at = now();
    raise exception 'anon should not update notifications';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.notifications;
    raise exception 'anon should not delete notifications';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select pg_temp.logout();

-- User A: sees, marks read and deletes only its own -------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a9');

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  n1 uuid := '56000000-0000-4000-8000-000000000001';
  n4 uuid := '56000000-0000-4000-8000-000000000004';
  rows int;
begin
  assert (select count(*) from public.notifications) = 3, 'A sees its three notifications';
  assert (select array_agg(id order by created_at desc) from public.notifications) = array[
    '56000000-0000-4000-8000-000000000002', n1, '56000000-0000-4000-8000-000000000003'
  ]::uuid[], 'newest first';
  assert (select count(*) from public.notifications where read_at is null) = 2,
    'A has two unread';
  assert not exists (select 1 from public.notifications where id = n4),
    'A does not see B''s notification';

  update public.notifications set read_at = now() where id = n1;
  get diagnostics rows = row_count;
  assert rows = 1, 'A can mark a notification read';
  assert (select read_at from public.notifications where id = n1) is not null, 'read_at set';

  update public.notifications set read_at = null where id = n1;
  get diagnostics rows = row_count;
  assert rows = 1, 'A can mark a notification unread again';

  update public.notifications set read_at = now() where read_at is null;
  get diagnostics rows = row_count;
  assert rows = 2, 'mark all read touches only A''s unread notifications';

  update public.notifications set read_at = now() where id = n4;
  get diagnostics rows = row_count;
  assert rows = 0, 'A cannot mark B''s notification read';

  begin
    update public.notifications set data = '{}' where id = n1;
    raise exception 'A should not change data';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.notifications set type = 'moderation' where id = n1;
    raise exception 'A should not change the type';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.notifications set user_id = '00000000-0000-4000-8000-0000000000b9'
    where id = n1;
    raise exception 'A should not change the recipient';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.notifications set created_at = now() where id = n1;
    raise exception 'A should not change created_at';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.notifications (user_id, type) values (a, 'match');
    raise exception 'A should not insert notifications';
  exception when insufficient_privilege then null;
  end;

  delete from public.notifications where id = n4;
  get diagnostics rows = row_count;
  assert rows = 0, 'A cannot delete B''s notification';

  delete from public.notifications where id = n1;
  get diagnostics rows = row_count;
  assert rows = 1, 'A can delete its own notification';
end;
$$;

select pg_temp.logout();

do $$
begin
  assert exists (select 1 from public.notifications where id = '56000000-0000-4000-8000-000000000004'),
    'B''s notification is untouched';
  assert (select read_at from public.notifications where id = '56000000-0000-4000-8000-000000000004')
    is null, 'B''s notification is still unread';
end;
$$;

-- Banned user D: reads and deletes, cannot mark read ---------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000d9');

do $$
declare
  n5 uuid := '56000000-0000-4000-8000-000000000005';
  rows int;
begin
  assert (select count(*) from public.notifications) = 1, 'banned D still sees its notification';
  begin
    update public.notifications set read_at = now() where id = n5;
    raise exception 'banned D should not mark read';
  exception when insufficient_privilege then null;
  end;
  delete from public.notifications where id = n5;
  get diagnostics rows = row_count;
  assert rows = 1, 'banned D can delete its notification';
end;
$$;

select pg_temp.logout();

-- Admin C sees no notifications of others --------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000c9');

do $$
declare
  rows int;
begin
  assert (select count(*) from public.notifications) = 0, 'admins see only their own';
  update public.notifications set read_at = now();
  get diagnostics rows = row_count;
  assert rows = 0, 'admins cannot mark others'' notifications read';
end;
$$;

select pg_temp.logout();

-- Notifications are removed with their user ----------------------------------
delete from auth.users where id = '00000000-0000-4000-8000-0000000000b9';

do $$
begin
  assert not exists (
    select 1 from public.notifications where user_id = '00000000-0000-4000-8000-0000000000b9'
  ), 'deleting the user deletes its notifications';
  assert (select count(*) from public.notifications
    where user_id = '00000000-0000-4000-8000-0000000000a9') = 2, 'other notifications stay';
end;
$$;
