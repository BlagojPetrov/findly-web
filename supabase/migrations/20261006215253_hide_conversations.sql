-- Deleting a conversation from the user's own list (§16). Nothing is deleted:
-- the conversation and its messages stay for the other participant (and for
-- the user in the chat itself). The list leaves the conversation out until
-- there is newer activity: a message after hiding, from either participant,
-- brings it back.

-- ---------------------------------------------------------------------------
-- One row per user and hidden conversation. hidden_at is the clock time of
-- the (last) hiding, compared with conversations.last_message_at (also clock
-- time, from messages.created_at).
-- ---------------------------------------------------------------------------
create table public.hidden_conversations (
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  hidden_at timestamptz not null default clock_timestamp(),
  primary key (user_id, conversation_id)
);

-- The primary key covers user_id; this one the cascade from conversations.
create index hidden_conversations_conversation_id_idx
  on public.hidden_conversations (conversation_id);

-- ---------------------------------------------------------------------------
-- Security. Users read only their own rows (my_conversations() is security
-- invoker); nobody writes directly, only through hide_conversation(), so
-- hidden_at is always the server's time. The other participant cannot see
-- that a conversation was hidden.
-- ---------------------------------------------------------------------------
alter table public.hidden_conversations enable row level security;

revoke all on public.hidden_conversations from anon, authenticated;
grant select on public.hidden_conversations to authenticated;

create policy "Users can view their hidden conversations"
  on public.hidden_conversations for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- hide_conversation(conversation_id): removes a conversation from the
-- signed-in user's list. The user's unread messages in it are marked read
-- (the unread counts stay the sum of the list's counts; the trigger
-- messages_read_notifications marks the message notification read) and the
-- user's message notification about it is removed. Hiding again moves
-- hidden_at forward.
-- security definer: users have no write privilege on hidden_conversations.
-- Errors: 42501 for guests and users who cannot write (banned), P0002
-- "not_found" when the conversation does not exist or the user does not
-- take part in it (the same answer, so it reveals nothing).
-- ---------------------------------------------------------------------------
create function public.hide_conversation(conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not (select private.can_write()) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.conversations c
    where c.id = hide_conversation.conversation_id
      and (c.owner_id = uid or c.requester_id = uid)
  ) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;

  update public.messages m
  set read_at = now()
  where m.conversation_id = hide_conversation.conversation_id
    and m.sender_id <> uid
    and m.read_at is null;

  delete from public.notifications n
  where n.type = 'message'
    and n.user_id = uid
    and n.data ->> 'conversation_id' = hide_conversation.conversation_id::text;

  insert into public.hidden_conversations (user_id, conversation_id)
  values (uid, hide_conversation.conversation_id)
  on conflict (user_id, conversation_id)
    do update set hidden_at = clock_timestamp();
end;
$$;

revoke execute on function public.hide_conversation(uuid) from public, anon;
grant execute on function public.hide_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- my_conversations(): as before (P8.S1), without the conversations the
-- caller hid, unless they have a message newer than the hiding or an unread
-- message (one that arrived while hiding).
-- ---------------------------------------------------------------------------
create or replace function public.my_conversations()
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
    u.unread_count,
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
  cross join lateral (
    select count(*) as unread_count
    from public.messages as m
    where m.conversation_id = c.id
      and m.read_at is null
      and m.sender_id <> (select auth.uid())
  ) as u
  left join public.hidden_conversations as h
    on h.conversation_id = c.id
    and h.user_id = (select auth.uid())
  where (
      c.requester_id = (select auth.uid())
      or (c.owner_id = (select auth.uid()) and c.last_message_at is not null)
    )
    and (
      h.hidden_at is null
      or c.last_message_at > h.hidden_at
      or u.unread_count > 0
    )
  order by coalesce(c.last_message_at, c.created_at) desc, c.id desc;
$$;
