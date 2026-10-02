-- P8.S6: a notification for the recipient of a new message, at most one
-- unread per conversation (§15, §16).
--
-- Each recipient has one message notification per conversation. While it is
-- unread, more messages change nothing (no new alert per message). Once it
-- has been read, the next message replaces it with a new, unread row (an
-- insert, so the bell shows a new notification). Reading the conversation
-- (mark_conversation_read() or any update of read_at) marks it read.

-- ---------------------------------------------------------------------------
-- One message notification per recipient and conversation. data =
-- { conversation_id, item_id (null once the item is deleted), sender_id }.
-- ---------------------------------------------------------------------------
create unique index notifications_message_conversation_key
  on public.notifications ((data ->> 'conversation_id'), user_id)
  where type = 'message';

-- ---------------------------------------------------------------------------
-- After a message insert: notify the other participant. A read notification
-- of the conversation is deleted and a new one inserted; an unread one stays
-- as it is. If the recipient marks the notification read while this runs,
-- the insert conflicts with it, waits and makes it unread again (the update
-- branch), so a new message never leaves only a read notification behind.
-- Runs in the inserting transaction: a rolled-back message notifies nobody.
-- ---------------------------------------------------------------------------
create function private.messages_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.conversations;
  recipient uuid;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if not found then
    return null;
  end if;
  recipient := case when new.sender_id = c.owner_id then c.requester_id else c.owner_id end;

  delete from public.notifications n
  where n.type = 'message'
    and n.user_id = recipient
    and n.data ->> 'conversation_id' = c.id::text
    and n.read_at is not null;

  insert into public.notifications (user_id, type, data)
  values (
    recipient,
    'message',
    jsonb_strip_nulls(jsonb_build_object(
      'conversation_id', c.id,
      'item_id', c.item_id,
      'sender_id', new.sender_id
    ))
  )
  on conflict ((data ->> 'conversation_id'), user_id) where type = 'message'
    do update set data = excluded.data, read_at = null, created_at = now()
    where public.notifications.read_at is not null;

  return null;
end;
$$;

create trigger messages_notify
  after insert on public.messages
  for each row execute function private.messages_notify();

-- ---------------------------------------------------------------------------
-- After messages are marked read: the recipient's message notification of
-- each conversation that has no unread message from the other participant
-- left is marked read too. Only recipients can update messages (read_at),
-- so this follows mark_conversation_read() and direct updates alike.
-- Statement level (one run per mark_conversation_read() call); transition
-- tables cannot be combined with "update of read_at".
-- ---------------------------------------------------------------------------
create function private.messages_read_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notifications n
  set read_at = now()
  from (
    select distinct
      c.id,
      case when r.sender_id = c.owner_id then c.requester_id else c.owner_id end as recipient
    from read_messages r
    join public.conversations c on c.id = r.conversation_id
    where r.read_at is not null
  ) as done
  where n.type = 'message'
    and n.user_id = done.recipient
    and n.data ->> 'conversation_id' = done.id::text
    and n.read_at is null
    and not exists (
      select 1 from public.messages m
      where m.conversation_id = done.id
        and m.sender_id <> done.recipient
        and m.read_at is null
    );
  return null;
end;
$$;

create trigger messages_read_notifications
  after update on public.messages
  referencing new table as read_messages
  for each statement execute function private.messages_read_notifications();

-- ---------------------------------------------------------------------------
-- A conversation goes with the account of a participant: the other
-- participant's message notifications about it are removed (they would lead
-- to a chat that no longer exists).
-- ---------------------------------------------------------------------------
create function private.conversations_delete_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications n
  where n.type = 'message'
    and n.data ->> 'conversation_id' = old.id::text;
  return null;
end;
$$;

create trigger conversations_delete_notifications
  after delete on public.conversations
  for each row execute function private.conversations_delete_notifications();

revoke execute on function private.messages_notify() from public, anon, authenticated;
revoke execute on function private.messages_read_notifications()
  from public, anon, authenticated;
revoke execute on function private.conversations_delete_notifications()
  from public, anon, authenticated;
