-- P7.S2: a notification for both owners when a new match is created (§15).
--
-- compute_matches() upserts: a rescored pair goes through "on conflict do
-- update", which fires update triggers, not insert triggers, so only really
-- new rows notify. It also deletes suggested rows that drop out and inserts
-- them again later; such a pair is not new to its owners, so a unique index
-- allows one match notification per owner and pair: a recreated pair only
-- moves the existing notification to the new match id (read state kept, no
-- new insert, so no new alert).

-- ---------------------------------------------------------------------------
-- One match notification per recipient and pair. data = { match_id, item_id
-- (the recipient's own report), other_item_id }. other_item_id leads, so the
-- index also finds the notifications about a deleted item (below).
-- ---------------------------------------------------------------------------
create unique index notifications_match_pair_key
  on public.notifications ((data ->> 'other_item_id'), (data ->> 'item_id'), user_id)
  where type = 'match';

-- ---------------------------------------------------------------------------
-- After a match insert: one notification for each distinct owner of the two
-- items. The matching functions never pair two items of the same owner; if a
-- row ever did, that owner gets one notification (about the lost report).
-- Runs in the inserting transaction: if the match is rolled back, so are its
-- notifications.
-- ---------------------------------------------------------------------------
create function private.matches_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lost_owner uuid;
  found_owner uuid;
begin
  select i.user_id into lost_owner from public.items i where i.id = new.lost_item_id;
  select i.user_id into found_owner from public.items i where i.id = new.found_item_id;

  insert into public.notifications (user_id, type, data)
  select r.user_id, 'match',
    jsonb_build_object(
      'match_id', new.id,
      'item_id', r.item_id,
      'other_item_id', r.other_item_id
    )
  from (
    values
      (lost_owner, new.lost_item_id, new.found_item_id),
      (found_owner, new.found_item_id, new.lost_item_id)
  ) as r (user_id, item_id, other_item_id)
  where r.user_id is not null
    and (r.item_id = new.lost_item_id or r.user_id is distinct from lost_owner)
  on conflict ((data ->> 'other_item_id'), (data ->> 'item_id'), user_id)
    where type = 'match'
    do update set data = excluded.data
    where public.notifications.data is distinct from excluded.data;

  return null;
end;
$$;

create trigger matches_notify
  after insert on public.matches
  for each row execute function private.matches_notify();

-- ---------------------------------------------------------------------------
-- After an item is deleted (by its owner, an admin or with its account), its
-- matches go with it; the match notifications about it would only link to a
-- report that no longer exists, so they are removed too: the other owners'
-- (other_item_id) and the owner's own (item_id). Notifications of hidden or
-- resolved items stay (the UI decides what it can still show).
-- ---------------------------------------------------------------------------
create function private.items_delete_match_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications n
  where n.type = 'match'
    and (
      n.data ->> 'other_item_id' = old.id::text
      or (n.user_id = old.user_id and n.data ->> 'item_id' = old.id::text)
    );
  return null;
end;
$$;

create trigger items_delete_match_notifications
  after delete on public.items
  for each row execute function private.items_delete_match_notifications();

revoke execute on function private.matches_notify() from public, anon, authenticated;
revoke execute on function private.items_delete_match_notifications()
  from public, anon, authenticated;
