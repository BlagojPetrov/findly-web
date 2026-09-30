-- P6.S3: automatic matching (§14). compute_matches(item) scores an item
-- against the active reports of the opposite type and keeps its suggested
-- matches up to date; triggers on items run it after an insert and after a
-- change of a column that affects the score. A backfill computes the matches
-- of the existing items.

-- Matches of one item. For an active item:
--   * candidates are prefiltered with the indexes (opposite type, active,
--     other owner, same or "other" category, ±90 days, ≤ 50 km); the exact
--     rules and the score come from private.match_score();
--   * pairs that already have a dismissed or confirmed row are skipped (they
--     are kept as they are and never become suggested again);
--   * the top 10 pairs with score ≥ 0.55 are upserted: new pairs are
--     inserted, existing suggested rows get the new score and breakdown (only
--     when they changed), so a match keeps its id and created_at while it
--     stays suggested (P7 notifies about new rows only);
--   * the item's other suggested rows are deleted.
-- A resolved or hidden item is left alone: its matches stay, and the UI shows
-- only matches of two active items. The cap of 10 applies to the item being
-- computed; the other item of a pair may collect more rows from other items'
-- runs until it is recomputed itself.
-- security definer: it reads other users' items and writes rows that belong
-- to both owners; matches have no insert/delete privileges for API roles.
create function private.compute_matches(target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.items;
  other_id smallint;
begin
  select * into target from public.items where id = target_id;
  if not found or target.status <> 'active' then
    return;
  end if;

  select c.id into other_id from public.categories c where c.slug = 'other';

  with scored as (
    select
      case when target.type = 'lost' then target.id else c.id end as lost_item_id,
      case when target.type = 'lost' then c.id else target.id end as found_item_id,
      s.score,
      s.breakdown,
      c.created_at,
      c.id
    from public.items c
    cross join lateral private.match_score(
      case when target.type = 'lost' then target else c end,
      case when target.type = 'lost' then c else target end
    ) as s
    where c.type <> target.type
      and c.status = 'active'
      and c.user_id <> target.user_id
      and (c.category_id = target.category_id
           or other_id in (c.category_id, target.category_id))
      and c.occurred_on between target.occurred_on - 90 and target.occurred_on + 90
      and extensions.st_dwithin(c.location, target.location, 50000)
  ),
  result as (
    select sc.lost_item_id, sc.found_item_id, sc.score, sc.breakdown
    from scored sc
    where sc.score >= 0.55
      and not exists (
        select 1 from public.matches m
        where m.lost_item_id = sc.lost_item_id
          and m.found_item_id = sc.found_item_id
          and m.status <> 'suggested'
      )
    order by sc.score desc, sc.created_at, sc.id
    limit 10
  ),
  upserted as (
    insert into public.matches as m (lost_item_id, found_item_id, score, breakdown)
    select r.lost_item_id, r.found_item_id, r.score, r.breakdown from result r
    on conflict (lost_item_id, found_item_id) do update
      set score = excluded.score, breakdown = excluded.breakdown
      where m.status = 'suggested'
        and (m.score, m.breakdown) is distinct from (excluded.score, excluded.breakdown)
  )
  delete from public.matches m
  where m.status = 'suggested'
    and target_id in (m.lost_item_id, m.found_item_id)
    and not exists (
      select 1 from result r
      where r.lost_item_id = m.lost_item_id and r.found_item_id = m.found_item_id
    );
end;
$$;

-- Trigger function. security definer as well: the trigger fires as the user
-- who changed the item, and API roles cannot execute compute_matches().
create function private.items_compute_matches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.compute_matches(new.id);
  return null;
end;
$$;

create trigger items_compute_matches
  after insert on public.items
  for each row execute function private.items_compute_matches();

-- Only when a column that affects the score really changed (lat/lng follow
-- location).
create trigger items_recompute_matches
  after update of type, category_id, occurred_on, location, title, description, status
  on public.items
  for each row
  when (
    (old.type, old.category_id, old.occurred_on, old.lat, old.lng, old.title,
     old.description, old.status)
    is distinct from
    (new.type, new.category_id, new.occurred_on, new.lat, new.lng, new.title,
     new.description, new.status)
  )
  execute function private.items_compute_matches();

revoke execute on function private.compute_matches(uuid) from public, anon, authenticated;
revoke execute on function private.items_compute_matches() from public, anon, authenticated;

-- Backfill: matches of the existing active items, oldest first.
do $$
declare
  item_id uuid;
begin
  for item_id in
    select id from public.items where status = 'active' order by created_at, id
  loop
    perform private.compute_matches(item_id);
  end loop;
end;
$$;
