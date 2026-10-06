-- Tests for hiding a conversation from the user's own list (§16): only
-- participants can hide, nothing is deleted for the other participant, the
-- user's unread messages and message notification are cleared, a newer
-- message (from either side) brings the conversation back with working
-- unread counts and notifications, and nobody writes hidden_conversations
-- directly or sees another user's rows.
--
-- All test items are "found" reports, so the matching triggers create no
-- matches between them.

-- Users: A (owner of I1), B and E (requesters), S (stranger), D (banned
-- requester).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000aa', 'hide-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000ba', 'hide-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000ea', 'hide-e@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000fa', 'hide-s@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000da', 'hide-d@example.com');
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-0000000000da';

insert into public.items
  (id, user_id, type, title, description, category_id, occurred_on, location)
values (
  '4a000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000aa',
  'found', 'Item one', 'Test item for hidden conversations.', 1, date '2001-06-01',
  extensions.st_setsrid(extensions.st_makepoint(20, 20), 4326)::extensions.geography
);

-- C1: A ↔ B with messages both ways; C2: A ↔ D (banned); C3: A ↔ E without
-- messages.
insert into public.conversations (id, item_id, owner_id, requester_id)
values
  ('4b000000-0000-4000-8000-000000000001', '4a000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-0000000000ba'),
  ('4b000000-0000-4000-8000-000000000002', '4a000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-0000000000da'),
  ('4b000000-0000-4000-8000-000000000003', '4a000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-0000000000ea');
insert into public.messages (conversation_id, sender_id, body)
values
  ('4b000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000ba', 'Is it mine?'),
  ('4b000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000aa', 'Maybe, describe it.'),
  ('4b000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000aa', 'Hello D');

-- Table, privileges and the function's settings (as the table owner) --------
do $$
begin
  assert (select relrowsecurity from pg_class where oid = 'public.hidden_conversations'::regclass),
    'RLS is enabled on hidden_conversations';
  assert not has_table_privilege('anon', 'public.hidden_conversations', 'select'),
    'anon cannot read hidden_conversations';
  assert has_table_privilege('authenticated', 'public.hidden_conversations', 'select'),
    'signed-in users read their own rows';
  assert not has_table_privilege('authenticated', 'public.hidden_conversations',
      'insert, update, delete'),
    'signed-in users cannot write hidden_conversations directly';
  assert not has_function_privilege('anon', 'public.hide_conversation(uuid)', 'execute'),
    'anon cannot call hide_conversation()';
  assert (select prosecdef from pg_proc where oid = 'public.hide_conversation(uuid)'::regprocedure),
    'hide_conversation() is security definer';
  assert (select proconfig from pg_proc where oid = 'public.hide_conversation(uuid)'::regprocedure)
      = array['search_path=""'],
    'hide_conversation() has an empty search_path';
  assert (select count(*) from public.notifications
          where user_id = '00000000-0000-4000-8000-0000000000ba' and type = 'message'
            and read_at is null) = 1,
    'B has an unread message notification about C1';
end;
$$;

-- Guests -------------------------------------------------------------------
select pg_temp.login_as_anon();
do $$
begin
  begin
    perform public.hide_conversation('4b000000-0000-4000-8000-000000000001');
    raise exception 'anon should not call hide_conversation()';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- A stranger cannot hide someone else's conversation ------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000fa');
do $$
begin
  begin
    perform public.hide_conversation('4b000000-0000-4000-8000-000000000001');
    raise exception 'a stranger should not hide C1';
  exception when no_data_found then null;
  end;
  begin
    perform public.hide_conversation('4b000000-0000-4000-8000-0000000000ff');
    raise exception 'an unknown conversation should not be hidden';
  exception when no_data_found then null;
  end;
end;
$$;

-- A banned participant cannot hide -----------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000da');
do $$
begin
  begin
    perform public.hide_conversation('4b000000-0000-4000-8000-000000000002');
    raise exception 'a banned user should not hide a conversation';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- B hides C1 ---------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000ba');
do $$
declare
  c1 uuid := '4b000000-0000-4000-8000-000000000001';
  b uuid := '00000000-0000-4000-8000-0000000000ba';
begin
  assert (select unread_count from public.my_conversations() where id = c1) = 1,
    'B has one unread message in C1';

  begin
    insert into public.hidden_conversations (user_id, conversation_id) values (b, c1);
    raise exception 'B should not insert into hidden_conversations';
  exception when insufficient_privilege then null;
  end;

  perform public.hide_conversation(c1);

  assert not exists (select 1 from public.my_conversations() where id = c1),
    'C1 is gone from B''s list';
  assert (select count(*) from public.messages where conversation_id = c1) = 2,
    'B still reads the chat itself';
  assert (select count(*) from public.messages
          where sender_id <> b and read_at is null) = 0,
    'B has no unread messages left (the header count)';
  assert not exists (select 1 from public.notifications
                     where type = 'message' and data ->> 'conversation_id' = c1::text),
    'B''s message notification about C1 is removed';
  assert (select count(*) from public.hidden_conversations) = 1,
    'B sees their own hidden row';

  begin
    update public.hidden_conversations set hidden_at = now() + interval '1 year';
    raise exception 'B should not move hidden_at';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.hidden_conversations;
    raise exception 'B should not delete hidden rows';
  exception when insufficient_privilege then null;
  end;

  -- Hiding again is fine.
  perform public.hide_conversation(c1);
  assert (select count(*) from public.hidden_conversations) = 1, 'still one row';
end;
$$;

-- A still sees everything and cannot see B's row ----------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000aa');
do $$
declare
  c1 uuid := '4b000000-0000-4000-8000-000000000001';
  r record;
begin
  select * into strict r from public.my_conversations() where id = c1;
  assert r.unread_count = 1, 'A''s unread message from B stays unread';
  assert r.last_message_body = 'Maybe, describe it.', 'A sees the last message';
  assert (select count(*) from public.hidden_conversations) = 0,
    'A cannot see that B hid C1';
  assert exists (select 1 from public.notifications
                 where type = 'message' and read_at is null
                   and data ->> 'conversation_id' = c1::text),
    'A''s notification about C1 is untouched';

  -- A replies: C1 comes back for B.
  insert into public.messages (conversation_id, body) values (c1, 'Still there?');
end;
$$;

select pg_temp.login_as('00000000-0000-4000-8000-0000000000ba');
do $$
declare
  c1 uuid := '4b000000-0000-4000-8000-000000000001';
  b uuid := '00000000-0000-4000-8000-0000000000ba';
  r record;
begin
  select * into strict r from public.my_conversations() where id = c1;
  assert r.unread_count = 1, 'B has the new message unread';
  assert r.last_message_body = 'Still there?', 'the new message is the last one';
  assert (select count(*) from public.messages
          where sender_id <> b and read_at is null) = 1,
    'the header count shows the new message';
  assert (select count(*) from public.notifications
          where type = 'message' and read_at is null
            and data ->> 'conversation_id' = c1::text) = 1,
    'B is notified about the new message';

  -- Reading it keeps C1 in the list (the message is newer than the hiding).
  assert public.mark_conversation_read(c1) = 1, 'B reads the new message';
  assert exists (select 1 from public.my_conversations() where id = c1),
    'C1 stays after reading';

  -- Hidden again, then B's own message brings it back too.
  perform public.hide_conversation(c1);
  assert not exists (select 1 from public.my_conversations() where id = c1),
    'C1 hidden again';
  insert into public.messages (conversation_id, body) values (c1, 'Yes, sorry!');
  assert exists (select 1 from public.my_conversations() where id = c1),
    'B''s own message brings C1 back';
end;
$$;

-- A conversation without messages (requester E) stays hidden ----------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000ea');
do $$
declare
  c3 uuid := '4b000000-0000-4000-8000-000000000003';
begin
  assert exists (select 1 from public.my_conversations() where id = c3),
    'E sees the new conversation';
  perform public.hide_conversation(c3);
  assert not exists (select 1 from public.my_conversations() where id = c3),
    'E''s empty conversation is hidden';
end;
$$;

-- An unread message older than the hiding still shows the conversation -----
-- (it arrived while hiding ran: hidden_at is later than its created_at).
select pg_temp.logout();
do $$
declare
  c1 uuid := '4b000000-0000-4000-8000-000000000001';
  b uuid := '00000000-0000-4000-8000-0000000000ba';
begin
  insert into public.messages (conversation_id, sender_id, body)
  values (c1, '00000000-0000-4000-8000-0000000000aa', 'Raced');
  update public.hidden_conversations set hidden_at = clock_timestamp()
  where user_id = b and conversation_id = c1;
end;
$$;

select pg_temp.login_as('00000000-0000-4000-8000-0000000000ba');
do $$
begin
  assert (select unread_count from public.my_conversations()
          where id = '4b000000-0000-4000-8000-000000000001') = 1,
    'an unread message keeps the conversation in the list';
end;
$$;

-- Hidden rows go with the conversation --------------------------------------
select pg_temp.logout();
do $$
begin
  delete from public.conversations where id = '4b000000-0000-4000-8000-000000000003';
  assert not exists (select 1 from public.hidden_conversations
                     where conversation_id = '4b000000-0000-4000-8000-000000000003'),
    'the hidden row is deleted with its conversation';
end;
$$;
