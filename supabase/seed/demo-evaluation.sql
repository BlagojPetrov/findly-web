-- Evaluation of the matching on the demo dataset (P6.S6, §14). Needs the
-- data of demo.sql; to evaluate without keeping it, run both in one
-- transaction that is rolled back:
--
--   (echo begin; cat supabase/seed/demo.sql supabase/seed/demo-evaluation.sql;
--    echo rollback;) > eval.sql
--   npx supabase db query --linked -f eval.sql
--
-- One row per candidate pair (match_score() returns a row), best first:
--   pair        lost key → found key (see the id scheme in demo.sql)
--   true_pair   the two reports are about the same item (keys 1NN → 2NN)
--   score       and its components from the breakdown
--   lost_rank   rank of this found report among the lost report's candidates
--   found_rank  rank of the lost report among the found report's candidates
--   stored      compute_matches() kept it as a suggested match
-- Goal: every true pair stored and in the top 3 from both sides; every
-- stored pair that is not true is a false positive to document.
with demo as (
  select * from public.items where id::text like 'de100000-%'
),
pairs as (
  select
    l.id as lost_id,
    f.id as found_id,
    right(l.id::text, 3) || ' → ' || right(f.id::text, 3) as pair,
    right(l.id::text, 3) like '1__'
      and right(f.id::text, 3) = '2' || right(l.id::text, 2) as true_pair,
    l.title as lost_title,
    f.title as found_title,
    s.score,
    s.breakdown
  from demo l
  join demo f on l.type = 'lost' and f.type = 'found'
  cross join lateral private.match_score(l, f) as s
)
select
  p.pair,
  p.true_pair,
  p.score,
  (p.breakdown ->> 'category')::numeric as category,
  (p.breakdown ->> 'distance_km')::numeric as km,
  (p.breakdown ->> 'days_between')::int as days,
  (p.breakdown ->> 'text')::numeric as text,
  rank() over (partition by p.lost_id order by p.score desc) as lost_rank,
  rank() over (partition by p.found_id order by p.score desc) as found_rank,
  exists (
    select 1 from public.matches m
    where m.lost_item_id = p.lost_id and m.found_item_id = p.found_id
      and m.status = 'suggested'
  ) as stored,
  p.lost_title,
  p.found_title
from pairs p
order by p.true_pair desc, p.score desc;
