-- P8.S1: conversations and messages between an item's owner and an
-- interested user, their security, the conversation list and read state
-- (§16). Delivered live through Realtime.

-- ---------------------------------------------------------------------------
-- Conversations. One per (item, requester): the requester contacts the owner
-- of an active item. The chat survives the item (item_id becomes null), not
-- the accounts of its participants. last_message_at is null until the first
-- message and is kept by a trigger (users cannot update conversations).
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items (id) on delete set null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  requester_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversations_item_id_requester_id_key unique (item_id, requester_id),
  constraint conversations_participants_check check (owner_id <> requester_id)
);

-- The unique constraint is the index for item_id.
create index conversations_owner_id_idx on public.conversations (owner_id);
create index conversations_requester_id_idx on public.conversations (requester_id);

-- ---------------------------------------------------------------------------
-- Messages. body is at most 2000 characters and not only whitespace (also
-- newlines and tabs, which btrim() would keep; the app trims it); read_at is
-- set when the recipient reads it (mark_conversation_read()). created_at is
-- the clock time, not the transaction start, so messages sent in one
-- transaction keep their order.
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  body text not null
    check (char_length(body) <= 2000 and body ~ '[^[:space:]]'),
  read_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);

-- The chat (oldest to newest), the rate limit and the unread counts.
create index messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at);
create index messages_sender_id_created_at_idx
  on public.messages (sender_id, created_at);
create index messages_conversation_id_unread_idx
  on public.messages (conversation_id)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- Triggers. Errors the app shows to the user have their own SQLSTATE:
--   FL429 "message_rate_limit"
-- ---------------------------------------------------------------------------

-- At most 30 messages per user per minute (spam protection). Counts the
-- sender's own messages, which a participant can always see, so it works as
-- security invoker. Concurrent inserts may exceed the limit slightly.
create function private.messages_check_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.messages
    where sender_id = new.sender_id
      and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'message_rate_limit'
      using errcode = 'FL429',
            detail = 'A user can send at most 30 messages per minute.';
  end if;
  return new;
end;
$$;

create trigger messages_check_rate_limit
  before insert on public.messages
  for each row execute function private.messages_check_rate_limit();

-- A new message moves its conversation to the top of both lists. security
-- definer: users have no update privilege on conversations.
create function private.messages_set_last_message_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = greatest(coalesce(last_message_at, new.created_at), new.created_at)
  where id = new.conversation_id;
  return null;
end;
$$;

create trigger messages_set_last_message_at
  after insert on public.messages
  for each row execute function private.messages_set_last_message_at();

revoke execute on function private.messages_check_rate_limit() from public, anon, authenticated;
revoke execute on function private.messages_set_last_message_at()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Security. Privileges are reset (Supabase grants everything by default):
--   * conversations: signed-in users read and insert (item, owner,
--     requester); nobody updates or deletes (rows go with the accounts);
--   * messages: signed-in users read, insert (conversation, sender, body)
--     and update only read_at; nobody deletes.
-- Anonymous visitors have no access. Admins have no special access (chats
-- are private; moderation works on items and users).
-- Policies:
--   * participants (owner and requester) see a conversation and its
--     messages;
--   * a user (not banned) starts a conversation as requester about an
--     active item they can see, with that item's owner as owner_id; the
--     check constraint rejects the owner contacting themselves;
--   * a participant (not banned) sends messages as themselves;
--   * the recipient (the participant who did not send it) marks a message
--     read.
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations from anon, authenticated;
grant select on public.conversations to authenticated;
grant insert (item_id, owner_id, requester_id) on public.conversations to authenticated;

revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

create policy "Participants can view their conversations"
  on public.conversations for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or requester_id = (select auth.uid())
  );

create policy "Users can contact the owner of an active item"
  on public.conversations for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and exists (
      select 1 from public.items i
      where i.id = item_id
        and i.user_id = owner_id
        and i.status = 'active'
    )
    and (select private.can_write())
  );

create policy "Participants can view messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.owner_id = (select auth.uid()) or c.requester_id = (select auth.uid()))
    )
  );

create policy "Participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.owner_id = (select auth.uid()) or c.requester_id = (select auth.uid()))
    )
    and (select private.can_write())
  );

create policy "Recipients can mark messages read"
  on public.messages for update
  to authenticated
  using (
    sender_id <> (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.owner_id = (select auth.uid()) or c.requester_id = (select auth.uid()))
    )
  )
  with check (
    sender_id <> (select auth.uid())
    and (select private.can_write())
  );

-- ---------------------------------------------------------------------------
-- my_conversations(): the signed-in user's conversations for /messages,
-- newest activity first. security invoker: the policies above apply, and the
-- item (title, type, cover) only when the caller can see it (null for a
-- deleted item or another user's hidden one). The owner sees a conversation
-- once it has a message; the requester also sees it before.
-- ---------------------------------------------------------------------------
create function public.my_conversations()
returns table (
  id uuid,
  item_id uuid,
  item_title text,
  item_type public.item_type,
  item_status public.item_status,
  item_cover_path text,
  is_owner boolean,
  other_user_id uuid,
  other_display_name text,
  other_avatar_path text,
  last_message_body text,
  last_message_sender_id uuid,
  last_message_at timestamptz,
  unread_count bigint,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.item_id,
    i.title,
    i.type,
    i.status,
    (
      select im.storage_path
      from public.item_images as im
      where im.item_id = i.id
      order by im.position
      limit 1
    ),
    c.owner_id = (select auth.uid()),
    p.id,
    p.display_name,
    p.avatar_path,
    lm.body,
    lm.sender_id,
    c.last_message_at,
    (
      select count(*)
      from public.messages as m
      where m.conversation_id = c.id
        and m.read_at is null
        and m.sender_id <> (select auth.uid())
    ),
    c.created_at
  from public.conversations as c
  left join public.items as i on i.id = c.item_id
  join public.profiles as p
    on p.id = case when c.owner_id = (select auth.uid()) then c.requester_id else c.owner_id end
  left join lateral (
    select m.body, m.sender_id
    from public.messages as m
    where m.conversation_id = c.id
    order by m.created_at desc, m.id desc
    limit 1
  ) as lm on true
  where (
      c.requester_id = (select auth.uid())
      or (c.owner_id = (select auth.uid()) and c.last_message_at is not null)
    )
  order by coalesce(c.last_message_at, c.created_at) desc, c.id desc;
$$;

revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- ---------------------------------------------------------------------------
-- mark_conversation_read(conversation_id): marks the other participant's
-- unread messages read and returns how many changed. security invoker: a
-- non-participant changes nothing (0). A banned user cannot write, so reading
-- a chat does not fail for them: it changes nothing (0).
-- ---------------------------------------------------------------------------
create function public.mark_conversation_read(conversation_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not (select private.can_write()) then
    return 0;
  end if;

  update public.messages as m
  set read_at = now()
  where m.conversation_id = mark_conversation_read.conversation_id
    and m.sender_id <> (select auth.uid())
    and m.read_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: the chat subscribes to inserts of its conversation (P8.S4).
-- Realtime applies the select policy, so clients receive only messages of
-- their own conversations.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
