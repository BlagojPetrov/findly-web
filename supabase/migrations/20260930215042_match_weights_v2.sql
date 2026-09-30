-- P6.S6: matching weights v2, tuned on the demo dataset (supabase/seed/,
-- §14). With v1 (category 0.30, distance 0.25, date 0.20, text 0.25,
-- threshold 0.55) category + distance + date alone gave 0.69, so unrelated
-- reports of the same category nearby became matches (F-29): 26 false
-- pairs on the demo set. Text is what tells true pairs from false ones
-- there, so it gets the largest weight:
--   category 0.15, distance 0.15, date 0.15, text 0.55; stored at ≥ 0.60.
-- The component formulas and candidate rules are unchanged. A pair now needs
-- a text score of about 0.27 or more even when everything else is perfect.
-- Afterwards every active item is recomputed: suggested matches get v2
-- scores or are removed below the new threshold; dismissed and confirmed
-- matches keep their stored (v1) score and breakdown.

-- match_score(): as in 20260930182118_match_scoring.sql, with weights v2.
create or replace function private.match_score(lost public.items, found public.items)
returns table (score numeric, breakdown jsonb)
language plpgsql
stable
set search_path = ''
as $$
declare
  other_id smallint;
  days integer;
  distance_km double precision;
  lost_words text[];
  found_words text[];
  shared text[];
  c_category double precision;
  c_distance double precision;
  c_date double precision;
  c_text double precision;
begin
  if lost.type is distinct from 'lost' or found.type is distinct from 'found' then
    raise exception 'match_score_types'
      using errcode = 'invalid_parameter_value',
            detail = 'match_score expects a lost item and a found item.';
  end if;

  if lost.status <> 'active' or found.status <> 'active'
     or lost.user_id = found.user_id then
    return;
  end if;

  select c.id into other_id from public.categories c where c.slug = 'other';
  if lost.category_id = found.category_id and lost.category_id <> other_id then
    c_category := 1;
  elsif other_id in (lost.category_id, found.category_id) then
    c_category := 0.5;
  else
    return;
  end if;

  if found.occurred_on < lost.occurred_on - 2
     or abs(found.occurred_on - lost.occurred_on) > 90 then
    return;
  end if;
  days := abs(found.occurred_on - lost.occurred_on);

  distance_km := extensions.st_distance(lost.location, found.location) / 1000;
  if distance_km > 50 then
    return;
  end if;

  lost_words := private.match_words(lost.title, lost.description);
  found_words := private.match_words(found.title, found.description);
  shared := array(
    select unnest(lost_words) intersect select unnest(found_words) order by 1
  );

  c_distance := exp(-distance_km / 5);
  c_date := exp(-days / 14.0);
  c_text := greatest(
    extensions.similarity(
      array_to_string(lost_words, ' '), array_to_string(found_words, ' ')
    ),
    case
      when least(cardinality(lost_words), cardinality(found_words)) = 0 then 0
      else cardinality(shared)::double precision
        / least(cardinality(lost_words), cardinality(found_words))
    end
  );

  score := round(
    (0.15 * c_category + 0.15 * c_distance + 0.15 * c_date + 0.55 * c_text)::numeric,
    3
  );
  breakdown := jsonb_build_object(
    'version', 'v2',
    'category', round(c_category::numeric, 3),
    'distance', round(c_distance::numeric, 3),
    'date', round(c_date::numeric, 3),
    'text', round(c_text::numeric, 3),
    'distance_km', round(distance_km::numeric, 1),
    'days_between', days,
    'shared_words', to_jsonb(coalesce(shared[1:10], '{}'))
  );
  return next;
end;
$$;

-- compute_matches(): as in 20260930203111_compute_matches.sql, with the
-- threshold 0.60.
create or replace function private.compute_matches(target_id uuid)
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
    where sc.score >= 0.60
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

-- Recompute the matches of all active items, oldest first.
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
