-- hide_conversation() (20261006215253): "on conflict (user_id,
-- conversation_id)" is ambiguous with the parameter conversation_id (42702).
-- The conflict target is now the primary key by name; nothing else changes.
create or replace function public.hide_conversation(conversation_id uuid)
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

  insert into public.hidden_conversations as h (user_id, conversation_id)
  values (uid, hide_conversation.conversation_id)
  on conflict on constraint hidden_conversations_pkey
    do update set hidden_at = clock_timestamp();
end;
$$;
