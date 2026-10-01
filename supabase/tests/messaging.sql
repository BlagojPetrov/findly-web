-- Tests for conversations and messages: constraints, privileges and policies
-- (only participants see and write, nobody sends as someone else, the owner
-- cannot contact themselves), the triggers (last_message_at, rate limit),
-- my_conversations(), mark_conversation_read() and Realtime.
--
-- All test items are "found" reports, so the matching triggers create no
-- matches between them. Conversation ids are generated (users cannot set
-- them); the tests pass them on with set_config('test.*').

-- Users: A (owner of I1–I3), B (requester, owner of I4), E (stranger),
-- D (banned), C (admin).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000a7', 'c-a@example.com',
  '{"display_name": "Owner A"}');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000b7', 'c-b@example.com',
  '{"display_name": "Requester B"}');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000c7', 'c-admin@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000d7', 'c-d@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000e7', 'c-e@example.com',
  '{"display_name": "Stranger E"}');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000c7';
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-0000000000d7';

-- I1 (A, active, with a cover), I2 (A, resolved), I3 (A, hidden), I4 (B, active).
insert into public.items
  (id, user_id, type, title, description, category_id, occurred_on, location)
select v.id::uuid, v.user_id::uuid, 'found', v.title,
  'Test item for messaging.', v.category_id, date '2001-06-01',
  extensions.st_setsrid(extensions.st_makepoint(20, 20), 4326)::extensions.geography
from (values
  ('47000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a7', 'Item one', 1),
  ('47000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a7', 'Item two', 2),
  ('47000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000a7', 'Item three', 3),
  ('47000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000b7', 'Item four', 4)
) as v (id, user_id, title, category_id);
update public.items set status = 'resolved' where id = '47000000-0000-4000-8000-000000000002';
update public.items set status = 'hidden' where id = '47000000-0000-4000-8000-000000000003';

insert into public.item_images (item_id, storage_path, position)
values (
  '47000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000a7/47000000-0000-4000-8000-000000000001/'
    || '48000000-0000-4000-8000-000000000001.webp',
  0
);

-- Constraints, defaults, triggers, indexes and Realtime (as the table owner) --
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a7';
  b uuid := '00000000-0000-4000-8000-0000000000b7';
  i1 uuid := '47000000-0000-4000-8000-000000000001';
  c public.conversations;
  m public.messages;
begin
  insert into public.conversations (item_id, owner_id, requester_id)
  values (i1, a, b) returning * into c;
  assert c.id is not null, 'conversation id has a default';
  assert c.last_message_at is null, 'a new conversation has no last message';
  assert c.created_at is not null, 'created_at has a default';

  begin
    insert into public.conversations (item_id, owner_id, requester_id) values (i1, a, b);
    raise exception 'a second conversation for the same item and requester should be rejected';
  exception when unique_violation then null;
  end;
  begin
    insert into public.conversations (item_id, owner_id, requester_id) values (i1, a, a);
    raise exception 'a conversation with oneself should be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.conversations (item_id, owner_id, requester_id)
    values (i1, a, '00000000-0000-4000-8000-0000000000f7');
    raise exception 'a conversation with an unknown user should be rejected';
  exception when foreign_key_violation then null;
  end;

  insert into public.messages (conversation_id, sender_id, body)
  values (c.id, b, repeat('x', 2000)) returning * into m;
  assert m.read_at is null, 'a new message is unread';
  assert m.created_at is not null, 'message created_at has a default';
  assert (select last_message_at from public.conversations where id = c.id) = m.created_at,
    'a message sets last_message_at';

  begin
    insert into public.messages (conversation_id, sender_id, body) values (c.id, b, '');
    raise exception 'an empty message should be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (c.id, b, E' \n\t ');
    raise exception 'a whitespace-only message should be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.messages (conversation_id, sender_id, body)
    values (c.id, b, repeat('x', 2001));
    raise exception 'a message over 2000 characters should be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.messages (conversation_id, sender_id, body)
    values ('49000000-0000-4000-8000-0000000000ff', b, 'Hi');
    raise exception 'a message to an unknown conversation should be rejected';
  exception when foreign_key_violation then null;
  end;

  -- An older message (e.g. delayed) does not move last_message_at back.
  insert into public.messages (conversation_id, sender_id, body, created_at)
  values (c.id, a, 'Old', timestamptz '2001-06-02 12:00+00');
  assert (select last_message_at from public.conversations where id = c.id) = m.created_at,
    'last_message_at never moves back';

  -- Deleting the conversation deletes its messages.
  delete from public.conversations where id = c.id;
  assert not exists (select 1 from public.messages where conversation_id = c.id),
    'messages go with their conversation';

  assert exists (
    select 1 from pg_indexes
    where tablename = 'messages' and indexname = 'messages_conversation_id_created_at_idx'
  ), 'chat index exists';
  assert exists (
    select 1 from pg_indexes
    where tablename = 'messages' and indexname = 'messages_conversation_id_unread_idx'
      and indexdef like '%WHERE (read_at IS NULL)%'
  ), 'partial unread index exists';
  assert exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ), 'messages are in the Realtime publication';
  assert not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ), 'conversations are not in the Realtime publication';
end;
$$;

-- Anonymous visitors have no access ------------------------------------------
select pg_temp.login_as_anon();

do $$
begin
  begin
    perform 1 from public.conversations;
    raise exception 'anon should not read conversations';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.messages;
    raise exception 'anon should not read messages';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.conversations (item_id, owner_id, requester_id)
    values ('47000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a7',
            '00000000-0000-4000-8000-0000000000b7');
    raise exception 'anon should not start conversations';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.my_conversations();
    raise exception 'anon should not call my_conversations()';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.mark_conversation_read('49000000-0000-4000-8000-000000000001');
    raise exception 'anon should not call mark_conversation_read()';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select pg_temp.logout();

-- B starts a conversation about A's item -------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000b7');

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a7';
  b uuid := '00000000-0000-4000-8000-0000000000b7';
  e uuid := '00000000-0000-4000-8000-0000000000e7';
  i1 uuid := '47000000-0000-4000-8000-000000000001';
  c public.conversations;
  r record;
  rows int;
begin
  begin
    insert into public.conversations (id, item_id, owner_id)
    values ('49000000-0000-4000-8000-000000000001', i1, a);
    raise exception 'B should not choose the conversation id';
  exception when insufficient_privilege then null;
  end;

  insert into public.conversations (item_id, owner_id) values (i1, a) returning * into c;
  assert c.requester_id = b, 'requester_id defaults to the caller';
  perform set_config('test.ab', c.id::text, true);

  -- Starting again: the unique constraint, or nothing with "on conflict".
  begin
    insert into public.conversations (item_id, owner_id) values (i1, a);
    raise exception 'B should not start a second conversation about I1';
  exception when unique_violation then null;
  end;
  insert into public.conversations (item_id, owner_id) values (i1, a)
  on conflict (item_id, requester_id) do nothing;
  get diagnostics rows = row_count;
  assert rows = 0, '"on conflict do nothing" keeps the existing conversation';
  assert (select count(*) from public.conversations) = 1, 'B sees one conversation';

  begin
    insert into public.conversations (item_id, owner_id) values (i1, e);
    raise exception 'owner_id must be the item''s owner';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.conversations (item_id, owner_id)
    values ('47000000-0000-4000-8000-000000000002', a);
    raise exception 'B should not contact the owner of a resolved item';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.conversations (item_id, owner_id)
    values ('47000000-0000-4000-8000-000000000003', a);
    raise exception 'B should not contact the owner of a hidden item';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.conversations (item_id, owner_id, requester_id)
    values ('47000000-0000-4000-8000-000000000004', b, e);
    raise exception 'B should not start a conversation for someone else';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.conversations (item_id, owner_id) values (null, a);
    raise exception 'a conversation needs an item';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.conversations (item_id, owner_id, last_message_at)
    values ('47000000-0000-4000-8000-000000000002', a, now());
    raise exception 'B should not set last_message_at';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.conversations set last_message_at = now();
    raise exception 'B should not update conversations';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.conversations;
    raise exception 'B should not delete conversations';
  exception when insufficient_privilege then null;
  end;

  -- Before the first message only the requester lists it.
  select * into strict r from public.my_conversations();
  assert r.id = c.id and r.item_id = i1, 'B lists the new conversation';
  assert r.item_title = 'Item one' and r.item_type = 'found' and r.item_status = 'active',
    'with the item''s title, type and status';
  assert r.item_cover_path like '%/48000000-0000-4000-8000-000000000001.webp',
    'and its cover';
  assert not r.is_owner, 'B is not the owner';
  assert r.other_user_id = a and r.other_display_name = 'Owner A', 'the other participant is A';
  assert r.last_message_body is null and r.last_message_at is null and r.unread_count = 0,
    'no messages yet';

  -- First message.
  insert into public.messages (conversation_id, body) values (c.id, 'Hello, is it mine?');
  assert (select sender_id from public.messages where conversation_id = c.id) = b,
    'sender_id defaults to the caller';
  assert (select last_message_at from public.conversations where id = c.id) is not null,
    'the message sets last_message_at';

  begin
    insert into public.messages (conversation_id, sender_id, body) values (c.id, a, 'Fake');
    raise exception 'B should not send as A';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.messages (conversation_id, body, created_at)
    values (c.id, 'Backdated', timestamptz '2001-06-02 12:00+00');
    raise exception 'B should not set created_at';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.messages set body = 'Edited';
    raise exception 'B should not edit messages';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.messages;
    raise exception 'B should not delete messages';
  exception when insufficient_privilege then null;
  end;

  -- The sender cannot mark its own message read.
  update public.messages set read_at = now() where conversation_id = c.id;
  get diagnostics rows = row_count;
  assert rows = 0, 'the sender cannot mark its own message read';
  assert public.mark_conversation_read(c.id) = 0, 'nothing for B to read yet';
end;
$$;

-- A (owner) lists it now, replies and reads ----------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a7');

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a7';
  b uuid := '00000000-0000-4000-8000-0000000000b7';
  ab uuid := current_setting('test.ab')::uuid;
  r record;
  rows int;
begin
  select * into strict r from public.my_conversations();
  assert r.id = ab and r.is_owner, 'A lists the conversation as owner';
  assert r.other_user_id = b and r.other_display_name = 'Requester B',
    'the other participant is B';
  assert r.last_message_body = 'Hello, is it mine?' and r.last_message_sender_id = b,
    'with B''s last message';
  assert r.last_message_at is not null, 'and its time';
  assert r.unread_count = 1, 'A has one unread message';
  assert (select count(*) from public.messages) = 1, 'A sees the message';

  begin
    insert into public.conversations (item_id, owner_id)
    values ('47000000-0000-4000-8000-000000000001', a);
    raise exception 'A should not contact itself about its own item';
  exception when check_violation then null;
  end;

  insert into public.messages (conversation_id, body) values (ab, 'Describe it, please.');

  -- The recipient marks read: directly (only read_at) or through the function.
  update public.messages set read_at = now() where sender_id = b;
  get diagnostics rows = row_count;
  assert rows = 1, 'A can mark B''s message read';
  update public.messages set read_at = null where sender_id = b;
  get diagnostics rows = row_count;
  assert rows = 1, 'and unread again';
  update public.messages set read_at = now() where sender_id = a;
  get diagnostics rows = row_count;
  assert rows = 0, 'A cannot mark its own message read';
  begin
    update public.messages set body = 'x' where sender_id = b;
    raise exception 'A should not change the body';
  exception when insufficient_privilege then null;
  end;

  assert public.mark_conversation_read(ab) = 1, 'A reads B''s message';
  assert public.mark_conversation_read(ab) = 0, 'reading again changes nothing';
  assert (select read_at from public.messages where sender_id = b) is not null,
    'B''s message is read';
  assert (select read_at from public.messages where sender_id = a) is null,
    'A''s own message stays unread';
  assert (select unread_count from public.my_conversations()) = 0, 'A has nothing unread';
end;
$$;

-- B has A's reply unread and answers twice -----------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000b7');

do $$
declare
  r record;
begin
  select * into strict r from public.my_conversations();
  assert r.unread_count = 1, 'B has A''s reply unread';
  assert r.last_message_body = 'Describe it, please.', 'A''s reply is the last message';
  insert into public.messages (conversation_id, body) values (r.id, 'Black, with a red strap.');
  insert into public.messages (conversation_id, body) values (r.id, 'Lost near the park.');
  assert (select unread_count from public.my_conversations()) = 1,
    'B''s own messages do not count as unread for B';
end;
$$;

-- E: a stranger sees and changes nothing, then contacts B (rate limit) -------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000e7');

do $$
declare
  ab uuid := current_setting('test.ab')::uuid;
  c public.conversations;
  rows int;
begin
  assert not exists (select 1 from public.conversations), 'E sees no conversation';
  assert not exists (select 1 from public.messages), 'E sees no message';
  assert not exists (select 1 from public.my_conversations()), 'E lists nothing';

  begin
    insert into public.messages (conversation_id, body) values (ab, 'Spam');
    raise exception 'E should not write into a conversation of others';
  exception when insufficient_privilege then null;
  end;
  update public.messages set read_at = now() where conversation_id = ab;
  get diagnostics rows = row_count;
  assert rows = 0, 'E cannot mark messages of others read';
  assert public.mark_conversation_read(ab) = 0, 'mark_conversation_read() changes nothing for E';

  -- E contacts B about I4 and sends 30 messages within a minute; the 31st fails.
  insert into public.conversations (item_id, owner_id)
  values ('47000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000b7')
  returning * into c;
  perform set_config('test.eb', c.id::text, true);
  for n in 1..30 loop
    insert into public.messages (conversation_id, body) values (c.id, 'Message ' || n);
  end loop;
  begin
    insert into public.messages (conversation_id, body) values (c.id, 'One too many');
    raise exception 'the 31st message within a minute should be rejected';
  exception when sqlstate 'FL429' then
    assert sqlerrm = 'message_rate_limit', 'the rate limit has its error code';
  end;
  assert (select count(*) from public.messages) = 30, 'E sent 30 messages';
end;
$$;

select pg_temp.logout();

-- The rate limit counts only the last minute (as the table owner: older
-- messages of E do not count).
do $$
declare
  eb uuid := current_setting('test.eb')::uuid;
begin
  update public.messages set created_at = now() - interval '61 seconds'
  where conversation_id = eb;
  -- B's later reply makes E's conversation B's newest.
  insert into public.messages (conversation_id, sender_id, body, created_at)
  values (eb, '00000000-0000-4000-8000-0000000000b7', 'Later reply', now() + interval '1 minute');
end;
$$;

select pg_temp.login_as('00000000-0000-4000-8000-0000000000e7');

do $$
begin
  insert into public.messages (conversation_id, body)
  values (current_setting('test.eb')::uuid, 'After a minute');
end;
$$;

-- B lists both, newest activity first, with unread counts per conversation ---
select pg_temp.login_as('00000000-0000-4000-8000-0000000000b7');

do $$
declare
  ab uuid := current_setting('test.ab')::uuid;
  eb uuid := current_setting('test.eb')::uuid;
  e uuid := '00000000-0000-4000-8000-0000000000e7';
begin
  assert (select array_agg(id) from public.my_conversations()) = array[eb, ab],
    'newest activity first';
  assert (select is_owner from public.my_conversations() where id = eb),
    'B owns I4';
  assert (select other_user_id from public.my_conversations() where id = eb) = e,
    'the other participant is E';
  assert (select unread_count from public.my_conversations() where id = eb) = 31,
    'B has 31 unread from E';
  assert (select last_message_body from public.my_conversations() where id = eb)
    = 'Later reply', 'B''s reply is the last message';
  assert (select unread_count from public.my_conversations() where id = ab) = 1,
    'A''s reply is still unread';
  assert public.mark_conversation_read(eb) = 31, 'B reads E''s messages';
  assert (select count(*) from public.messages where read_at is null) = 4,
    'only the messages to A (2), B (1, from A) and E (1) stay unread';
end;
$$;

-- D (banned) reads its conversation but cannot write --------------------------
select pg_temp.logout();

insert into public.conversations (item_id, owner_id, requester_id)
values ('47000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000b7',
        '00000000-0000-4000-8000-0000000000d7');
insert into public.messages (conversation_id, sender_id, body)
select id, '00000000-0000-4000-8000-0000000000b7', 'Hi D'
from public.conversations where requester_id = '00000000-0000-4000-8000-0000000000d7';

select pg_temp.login_as('00000000-0000-4000-8000-0000000000d7');

do $$
declare
  cid uuid;
begin
  select id into strict cid from public.conversations;
  assert (select count(*) from public.messages) = 1, 'D reads its messages';
  assert (select unread_count from public.my_conversations()) = 1, 'D has one unread';

  begin
    insert into public.messages (conversation_id, body) values (cid, 'Reply');
    raise exception 'a banned user should not send messages';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.conversations (item_id, owner_id)
    values ('47000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a7');
    raise exception 'a banned user should not start conversations';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.messages set read_at = now();
    raise exception 'a banned user should not mark messages read';
  exception when insufficient_privilege then null;
  end;
  assert public.mark_conversation_read(cid) = 0, 'reading does not fail for D, changes nothing';
  assert (select unread_count from public.my_conversations()) = 1, 'D still has one unread';
end;
$$;

-- C (admin) has no access to others' chats -----------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000c7');

do $$
declare
  rows int;
begin
  assert not exists (select 1 from public.conversations), 'the admin sees no conversation';
  assert not exists (select 1 from public.messages), 'the admin sees no message';
  update public.messages set read_at = now();
  get diagnostics rows = row_count;
  assert rows = 0, 'the admin marks nothing read';
end;
$$;

-- Hidden and deleted items: the chat survives ---------------------------------
select pg_temp.logout();

update public.items set status = 'hidden' where id = '47000000-0000-4000-8000-000000000004';

select pg_temp.login_as('00000000-0000-4000-8000-0000000000e7');

do $$
declare
  r record;
begin
  select * into strict r from public.my_conversations();
  assert r.item_id = '47000000-0000-4000-8000-000000000004', 'the conversation keeps the item id';
  assert r.item_title is null and r.item_type is null and r.item_cover_path is null,
    'E does not see the hidden item';
  insert into public.messages (conversation_id, body) values (r.id, 'Still there?');
end;
$$;

select pg_temp.login_as('00000000-0000-4000-8000-0000000000b7');

do $$
begin
  assert (
    select item_title from public.my_conversations()
    where id = current_setting('test.eb')::uuid
  ) = 'Item four', 'the owner still sees its hidden item';
end;
$$;

select pg_temp.logout();

delete from public.items where id = '47000000-0000-4000-8000-000000000001';

do $$
declare
  ab uuid := current_setting('test.ab')::uuid;
begin
  assert (select item_id from public.conversations where id = ab) is null,
    'deleting the item keeps the conversation without it';
  assert (select count(*) from public.messages where conversation_id = ab) = 4,
    'and its messages';
end;
$$;

select pg_temp.login_as('00000000-0000-4000-8000-0000000000a7');

do $$
declare
  r record;
begin
  select * into strict r from public.my_conversations();
  assert r.item_id is null and r.item_title is null, 'A lists it without the item';
  assert r.unread_count = 2, 'with B''s two unread messages';
  insert into public.messages (conversation_id, body) values (r.id, 'I deleted the report.');
end;
$$;

select pg_temp.logout();

-- Deleting an account deletes its conversations and their messages -----------
do $$
declare
  eb uuid := current_setting('test.eb')::uuid;
  ab uuid := current_setting('test.ab')::uuid;
begin
  delete from auth.users where id = '00000000-0000-4000-8000-0000000000e7';
  assert not exists (select 1 from public.conversations where id = eb), 'E''s conversation is gone';
  assert not exists (select 1 from public.messages where conversation_id = eb),
    'with its messages';
  assert exists (select 1 from public.conversations where id = ab), 'others stay';
end;
$$;

-- API roles cannot execute the trigger functions ------------------------------
do $$
begin
  assert not has_function_privilege('authenticated', 'private.messages_check_rate_limit()', 'execute'),
    'authenticated cannot execute the rate limit trigger function';
  assert not has_function_privilege('authenticated', 'private.messages_set_last_message_at()', 'execute'),
    'authenticated cannot execute the last_message_at trigger function';
end;
$$;
