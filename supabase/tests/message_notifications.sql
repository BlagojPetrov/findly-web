-- Tests for message notifications (§15, P8.S6): the recipient of a new
-- message is notified, at most one unread notification per conversation;
-- reading the conversation marks it read; the next message after that
-- notifies again; notifications roll back with their message and go with
-- the conversation; users cannot run the functions.
--
-- All test items are "found" reports, so the matching triggers create no
-- matches (and no match notifications) between them.

-- Users: A (owner of I1 and I2), B (requester), C (another requester).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000a9', 'mnote-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000b9', 'mnote-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000c9', 'mnote-c@example.com');

insert into public.items
  (id, user_id, type, title, description, category_id, occurred_on, location)
select v.id::uuid, '00000000-0000-4000-8000-0000000000a9', 'found', v.title,
  'Test item for message notifications.', v.category_id, date '2001-06-01',
  extensions.st_setsrid(extensions.st_makepoint(20, 20), 4326)::extensions.geography
from (values
  ('49000000-0000-4000-8000-000000000001', 'Item one', 1),
  ('49000000-0000-4000-8000-000000000002', 'Item two', 2)
) as v (id, title, category_id);

-- Message notifications of a user about a conversation, as the test runner.
create function pg_temp.message_notes(recipient uuid, conversation uuid)
returns setof public.notifications
language sql
as $$
  select * from public.notifications
  where user_id = recipient and type = 'message'
    and data ->> 'conversation_id' = conversation::text
  order by created_at, id;
$$;

-- Sends a message as the given user (like the app: under RLS).
create function pg_temp.send(sender uuid, conversation uuid, body text default 'Hello')
returns void
language plpgsql
as $$
begin
  perform pg_temp.login_as(sender);
  insert into public.messages (conversation_id, body) values (conversation, body);
  perform pg_temp.logout();
end;
$$;

-- Index and trigger ------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from pg_indexes
    where tablename = 'notifications' and indexname = 'notifications_message_conversation_key'
  ), 'unique index for message notifications exists';
  assert (select count(*) from pg_trigger
    where tgrelid = 'public.messages'::regclass
      and tgname in ('messages_notify', 'messages_read_notifications')) = 2,
    'the message triggers exist';
  assert exists (select 1 from pg_trigger
    where tgrelid = 'public.conversations'::regclass
      and tgname = 'conversations_delete_notifications'), 'the conversation trigger exists';
end;
$$;

-- B and C start conversations about I1 (as the app does) ------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000b9');
insert into public.conversations (item_id, owner_id)
values ('49000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a9');
select set_config('test.ab', (select id::text from public.conversations), false);
select pg_temp.login_as('00000000-0000-4000-8000-0000000000c9');
insert into public.conversations (item_id, owner_id)
values ('49000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a9');
select set_config('test.ac', (select id::text from public.conversations), false);
select pg_temp.logout();

do $$
begin
  assert not exists (select 1 from public.notifications
    where user_id in ('00000000-0000-4000-8000-0000000000a9',
      '00000000-0000-4000-8000-0000000000b9', '00000000-0000-4000-8000-0000000000c9')),
    'starting a conversation notifies nobody';
end;
$$;

-- 1. The first message notifies the recipient -----------------------------------
select pg_temp.send('00000000-0000-4000-8000-0000000000b9', current_setting('test.ab')::uuid);

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  b uuid := '00000000-0000-4000-8000-0000000000b9';
  ab uuid := current_setting('test.ab')::uuid;
  n public.notifications;
begin
  assert (select count(*) from pg_temp.message_notes(a, ab)) = 1, 'A gets one notification';
  select * into n from pg_temp.message_notes(a, ab);
  assert n.data = jsonb_build_object(
      'conversation_id', ab,
      'item_id', '49000000-0000-4000-8000-000000000001'::uuid,
      'sender_id', b),
    'data: conversation, item and sender ids: ' || n.data;
  assert n.read_at is null, 'it is unread';
  assert not exists (select 1 from public.notifications where user_id = b),
    'the sender is not notified';
  perform set_config('test.n1', n.id::text, false);
end;
$$;

-- 2. More messages keep the one unread notification ------------------------------
create temporary table t_first as
select * from public.notifications where id = current_setting('test.n1')::uuid;

select pg_temp.send('00000000-0000-4000-8000-0000000000b9', current_setting('test.ab')::uuid, 'Two');
select pg_temp.send('00000000-0000-4000-8000-0000000000b9', current_setting('test.ab')::uuid, 'Three');

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  ab uuid := current_setting('test.ab')::uuid;
begin
  assert (select count(*) from pg_temp.message_notes(a, ab)) = 1,
    'still one notification after three messages';
  assert (select (id, data, read_at, created_at)::text from pg_temp.message_notes(a, ab))
    = (select (id, data, read_at, created_at)::text from t_first),
    'the notification is unchanged';
end;
$$;

-- A reply notifies the other side; another conversation has its own -------------
select pg_temp.send('00000000-0000-4000-8000-0000000000a9', current_setting('test.ab')::uuid, 'Reply');
select pg_temp.send('00000000-0000-4000-8000-0000000000c9', current_setting('test.ac')::uuid, 'From C');

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  b uuid := '00000000-0000-4000-8000-0000000000b9';
  c uuid := '00000000-0000-4000-8000-0000000000c9';
  ab uuid := current_setting('test.ab')::uuid;
  ac uuid := current_setting('test.ac')::uuid;
begin
  assert (select count(*) from pg_temp.message_notes(b, ab)) = 1, 'B is notified of the reply';
  assert (select data ->> 'sender_id' from pg_temp.message_notes(b, ab)) = a::text,
    'sent by A';
  assert (select count(*) from pg_temp.message_notes(a, ab)) = 1,
    'A''s own reply does not notify A';
  assert (select count(*) from pg_temp.message_notes(a, ac)) = 1,
    'A has a separate notification for C''s conversation';
  assert (select count(*) from public.notifications where user_id = a) = 2,
    'A has two notifications';
  assert not exists (select 1 from public.notifications where user_id = c),
    'C is not notified';
end;
$$;

-- Each user sees only its own (RLS) ----------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000b9');

do $$
begin
  assert (select count(*) from public.notifications) = 1, 'B sees one notification';
  assert (select user_id from public.notifications) = '00000000-0000-4000-8000-0000000000b9',
    'B sees only its own';
  begin
    insert into public.notifications (user_id, type, data)
    values ('00000000-0000-4000-8000-0000000000b9', 'message', '{}');
    raise exception 'users should not insert notifications';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- 3. Reading the conversation marks its notification read --------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a9');

do $$
begin
  assert public.mark_conversation_read(current_setting('test.ab')::uuid) = 3,
    'A reads B''s three messages';
end;
$$;

select pg_temp.logout();

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  b uuid := '00000000-0000-4000-8000-0000000000b9';
  ab uuid := current_setting('test.ab')::uuid;
  ac uuid := current_setting('test.ac')::uuid;
begin
  assert (select read_at from pg_temp.message_notes(a, ab)) is not null,
    'A''s notification of the conversation is read';
  assert (select read_at from pg_temp.message_notes(a, ac)) is null,
    'the other conversation''s notification stays unread';
  assert (select read_at from pg_temp.message_notes(b, ab)) is null,
    'B''s notification stays unread (B has not read the reply)';
end;
$$;

-- Reading again changes nothing (no unread messages, statement with no rows).
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a9');

do $$
begin
  assert public.mark_conversation_read(current_setting('test.ab')::uuid) = 0, 'nothing to read';
end;
$$;

select pg_temp.logout();

-- 4. The next message after reading notifies again ---------------------------------
select pg_temp.send('00000000-0000-4000-8000-0000000000b9', current_setting('test.ab')::uuid, 'Again');

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  ab uuid := current_setting('test.ab')::uuid;
  n public.notifications;
begin
  assert (select count(*) from pg_temp.message_notes(a, ab)) = 1,
    'still one notification per conversation';
  select * into n from pg_temp.message_notes(a, ab);
  assert n.id <> current_setting('test.n1')::uuid, 'it is a new row (an insert: a new alert)';
  assert n.read_at is null, 'the new one is unread';
  assert n.created_at >= (select created_at from t_first), 'with a new time';
end;
$$;

-- 5. Partly read: the notification stays unread until all are read ----------------
select pg_temp.send('00000000-0000-4000-8000-0000000000b9', current_setting('test.ab')::uuid, 'More');
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a9');

do $$
declare
  ab uuid := current_setting('test.ab')::uuid;
begin
  update public.messages set read_at = now()
  where id = (
    select id from public.messages
    where conversation_id = ab and read_at is null
    order by created_at limit 1
  );
  assert (select read_at from public.notifications
    where data ->> 'conversation_id' = ab::text) is null,
    'one unread message left: the notification stays unread';

  update public.messages set read_at = now()
  where conversation_id = ab and read_at is null
    and sender_id <> '00000000-0000-4000-8000-0000000000a9';
  assert (select read_at from public.notifications
    where data ->> 'conversation_id' = ab::text) is not null,
    'all read (direct update): the notification is read';

  -- Marking a message unread again does not touch the notification.
  update public.messages set read_at = null
  where id = (select id from public.messages where conversation_id = ab
    and sender_id <> '00000000-0000-4000-8000-0000000000a9' order by created_at desc limit 1);
  assert (select read_at from public.notifications
    where data ->> 'conversation_id' = ab::text) is not null,
    'marking a message unread keeps the notification read';
end;
$$;

-- 6. A notification marked read by hand: the next message notifies again ----------
do $$
begin
  update public.notifications set read_at = now()
  where data ->> 'conversation_id' = current_setting('test.ac');
end;
$$;

select pg_temp.logout();
select pg_temp.send('00000000-0000-4000-8000-0000000000c9', current_setting('test.ac')::uuid, 'Hello?');

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  ac uuid := current_setting('test.ac')::uuid;
begin
  assert (select count(*) from pg_temp.message_notes(a, ac)) = 1, 'one notification';
  assert (select read_at from pg_temp.message_notes(a, ac)) is null, 'unread again';
end;
$$;

-- 7. A rolled-back message leaves no notification -----------------------------------
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  c uuid := '00000000-0000-4000-8000-0000000000c9';
  ac uuid := current_setting('test.ac')::uuid;
begin
  begin
    insert into public.messages (conversation_id, sender_id, body) values (ac, a, 'Rolled back');
    assert (select count(*) from public.notifications where user_id = c) = 1,
      'C is notified inside the transaction';
    raise exception 'roll back';
  exception when raise_exception then null;
  end;
  assert not exists (select 1 from public.notifications where user_id = c),
    'the rolled-back message leaves no notification';

  -- A rejected message (whitespace only) notifies nobody either.
  begin
    insert into public.messages (conversation_id, sender_id, body) values (ac, a, '   ');
    raise exception 'a whitespace-only message should be rejected';
  exception when check_violation then null;
  end;
  assert not exists (select 1 from public.notifications where user_id = c),
    'C is not notified of a rejected message';
end;
$$;

-- 8. A banned recipient is notified; reading changes nothing for them ---------------
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-0000000000a9';
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a9');

do $$
begin
  assert public.mark_conversation_read(current_setting('test.ac')::uuid) = 0,
    'a banned user marks nothing read';
end;
$$;

select pg_temp.logout();

do $$
begin
  assert (select read_at from pg_temp.message_notes('00000000-0000-4000-8000-0000000000a9',
    current_setting('test.ac')::uuid)) is null, 'the banned user''s notification stays unread';
end;
$$;

update public.profiles set is_banned = false where id = '00000000-0000-4000-8000-0000000000a9';

-- 9. Without its item the chat keeps notifying, without item_id ---------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a9');
select public.mark_conversation_read(current_setting('test.ab')::uuid);
select pg_temp.logout();
delete from public.items where id = '49000000-0000-4000-8000-000000000001';
select pg_temp.send('00000000-0000-4000-8000-0000000000b9', current_setting('test.ab')::uuid, 'Still there?');

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  b uuid := '00000000-0000-4000-8000-0000000000b9';
  ab uuid := current_setting('test.ab')::uuid;
begin
  assert (select data from pg_temp.message_notes(a, ab))
    = jsonb_build_object('conversation_id', ab, 'sender_id', b),
    'no item_id once the item is deleted: ' || (select data from pg_temp.message_notes(a, ab));
  assert (select read_at from pg_temp.message_notes(a, ab)) is null, 'unread';
end;
$$;

-- 10. A duplicate message notification is rejected (one per conversation) -----------
do $$
begin
  insert into public.notifications (user_id, type, data)
  values ('00000000-0000-4000-8000-0000000000a9', 'message',
    jsonb_build_object('conversation_id', current_setting('test.ab')));
  raise exception 'a second message notification for one conversation should be rejected';
exception when unique_violation then null;
end;
$$;

-- 11. Deleting an account removes the other side's notifications of its chats --------
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a9';
  ab uuid := current_setting('test.ab')::uuid;
  ac uuid := current_setting('test.ac')::uuid;
begin
  delete from auth.users where id = '00000000-0000-4000-8000-0000000000b9';
  assert not exists (select 1 from public.conversations where id = ab), 'B''s conversation is gone';
  assert not exists (select pg_temp.message_notes(a, ab)), 'A''s notification about it is gone';
  assert (select count(*) from pg_temp.message_notes(a, ac)) = 1, 'others stay';
end;
$$;

-- API roles cannot execute the trigger functions ----------------------------------
do $$
begin
  assert not has_function_privilege('authenticated', 'private.messages_notify()', 'execute'),
    'authenticated cannot execute messages_notify';
  assert not has_function_privilege('authenticated', 'private.messages_read_notifications()', 'execute'),
    'authenticated cannot execute messages_read_notifications';
  assert not has_function_privilege('authenticated', 'private.conversations_delete_notifications()', 'execute'),
    'authenticated cannot execute conversations_delete_notifications';
  assert not has_function_privilege('anon', 'private.messages_notify()', 'execute'),
    'anon cannot execute messages_notify';
end;
$$;
