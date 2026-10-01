-- P8.S1 follow-up: at most 20 new conversations per user in 24 hours (spam
-- protection, §16). Existing conversations and messages are not changed.
--
-- Errors the app shows to the user have their own SQLSTATE:
--   FL429 "daily_conversation_limit"
--
-- Only conversations that are really created count: starting a conversation
-- that already exists (P8.S2 inserts with "on conflict do nothing") passes
-- the trigger and then conflicts as before, so it works at the limit too.
-- Messages in existing conversations have their own limit (30 per minute).
--
-- Concurrency: unlike the count-only item limit, this trigger first takes a
-- transaction-level advisory lock per requester, so concurrent inserts of
-- one user run one after the other and each count sees the rows committed
-- before it (read committed, the API's isolation level). Different users
-- never wait for each other. The lock is held until the inserting
-- transaction ends.
--
-- security invoker: the requester can always see its own conversations. A
-- row with someone else's requester_id is rejected by the insert policy
-- after this trigger, so it can neither use nor consume another user's
-- quota. Users cannot set created_at, delete conversations or disable
-- triggers, so the count cannot be lowered.

create function private.conversations_check_daily_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('conversations_daily_limit:' || new.requester_id::text, 0)
  );

  if exists (
    select 1 from public.conversations
    where item_id = new.item_id
      and requester_id = new.requester_id
  ) then
    -- Not a new conversation: the unique constraint decides.
    return new;
  end if;

  if (
    select count(*) from public.conversations
    where requester_id = new.requester_id
      and created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'daily_conversation_limit'
      using errcode = 'FL429',
            detail = 'A user can start at most 20 conversations in 24 hours.';
  end if;
  return new;
end;
$$;

create trigger conversations_check_daily_limit
  before insert on public.conversations
  for each row execute function private.conversations_check_daily_limit();

revoke execute on function private.conversations_check_daily_limit()
  from public, anon, authenticated;
