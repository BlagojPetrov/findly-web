-- The matching on the demo dataset (P6.S6, §14): every true pair is stored
-- and ranked in the top 3 from both sides, and no other pair of demo reports
-- is stored (the false positives of weights v1, F-29). The dataset is
-- loaded inside the test transaction, so nothing is kept.
-- @include ../seed/demo.sql

-- Every candidate pair of demo reports, scored and ranked from both sides.
create temporary table demo_pairs as
select
  l.id as lost_id,
  f.id as found_id,
  right(l.id::text, 3) like '1__'
    and right(f.id::text, 3) = '2' || right(l.id::text, 2) as true_pair,
  s.score,
  rank() over (partition by l.id order by s.score desc) as lost_rank,
  rank() over (partition by f.id order by s.score desc) as found_rank
from public.items l
join public.items f on l.type = 'lost' and f.type = 'found'
cross join lateral private.match_score(l, f) as s
where l.id::text like 'de100000-%' and f.id::text like 'de100000-%';

-- Demo matches stored by the insert triggers. The triggers also pair demo
-- reports with real reports on the linked project (e.g. a real found wallet
-- with demo wallet 101, F-31); only pairs of two demo reports are evaluated.
create temporary table demo_stored as
select m.lost_item_id, m.found_item_id,
  right(m.lost_item_id::text, 3) like '1__'
    and right(m.found_item_id::text, 3) = '2' || right(m.lost_item_id::text, 2) as true_pair
from public.matches m
where m.status = 'suggested'
  and m.lost_item_id::text like 'de100000-%'
  and m.found_item_id::text like 'de100000-%';

do $$
declare
  missing text;
begin
  assert (select count(*) from public.items where id::text like 'de100000-%') = 44,
    'the demo set has 44 reports';
  assert (select count(*) from demo_pairs where true_pair) = 14,
    'all 14 true pairs are candidates';

  select string_agg(right(lost_id::text, 3), ', ') into missing
  from demo_pairs where true_pair and (lost_rank > 3 or found_rank > 3);
  assert missing is null, 'true pairs outside the top 3: ' || missing;

  assert (select count(*) from demo_stored where true_pair) = 14,
    'every true pair is stored as a suggested match';
  select string_agg(right(lost_item_id::text, 3) || '-' || right(found_item_id::text, 3), ', ')
  into missing from demo_stored where not true_pair;
  assert missing is null, 'false positives stored: ' || missing;
end;
$$;
