-- Tests for match_words() and match_score() (§14): candidate rules,
-- component values, breakdown and the ordering of fixture pairs.
--
-- match_score() takes item rows, so these items (in Skopje, dated 2001) are
-- never compared with real reports. created_at is in the past so that the
-- daily item limit does not apply.

select pg_temp.create_user('00000000-0000-4000-8000-0000000000a9', 'ms-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000b9', 'ms-b@example.com');

-- L1: lost keys described in Cyrillic. Found items 11–22 are the same keys
-- described in Latin script (by default 1 day later, ~1 km north), each with
-- one thing changed; 23 is a different key.
insert into public.items
  (id, user_id, type, status, title, description, category_id, occurred_on, created_at,
   location)
select ('46000000-0000-4000-8000-0000000000' || v.n)::uuid,
  case v.owner when 'a' then '00000000-0000-4000-8000-0000000000a9'::uuid
               else '00000000-0000-4000-8000-0000000000b9'::uuid end,
  v.type::public.item_type, v.status::public.item_status,
  coalesce(v.title, 'Najdeni klucevi'),
  coalesce(v.description, 'Crn privezok so dva kluca i dalecinski, najden kaj parkot.'),
  (select id from public.categories where slug = v.category),
  date '2001-06-10' + v.day_offset, timestamptz '2001-06-20 12:00+00',
  extensions.st_setsrid(extensions.st_makepoint(21.43, 42.0 + v.lat_offset), 4326)::extensions.geography
from (values
  ('01', 'a', 'lost', 'active', 'Изгубени клучеви од кола',
   'Црн привезок со два клуча и далечински за Голф.', 'keys', 0, 0.0),
  ('11', 'b', 'found', 'active', null, null, 'keys', 1, 0.009),       -- clear match
  ('12', 'b', 'found', 'active', null, null, 'wallet', 1, 0.009),     -- other category
  ('13', 'b', 'found', 'active', null, null, 'other', 1, 0.009),      -- "other"
  ('14', 'b', 'found', 'active', null, null, 'keys', -3, 0.009),      -- 3 days before
  ('15', 'b', 'found', 'active', null, null, 'keys', -2, 0.009),      -- 2 days before
  ('16', 'b', 'found', 'active', null, null, 'keys', 90, 0.009),      -- 90 days after
  ('17', 'b', 'found', 'active', null, null, 'keys', 91, 0.009),      -- 91 days after
  ('18', 'b', 'found', 'active', null, null, 'keys', 1, 0.045),       -- ~5 km
  ('19', 'b', 'found', 'active', null, null, 'keys', 1, 0.18),        -- ~20 km
  ('20', 'b', 'found', 'active', null, null, 'keys', 1, 0.54),        -- ~60 km
  ('21', 'a', 'found', 'active', null, null, 'keys', 1, 0.009),       -- same owner
  ('22', 'b', 'found', 'resolved', null, null, 'keys', 1, 0.009),     -- not active
  ('23', 'b', 'found', 'active', 'Сребрен клуч',
   'Мал сребрен клуч од стан, пронајден на клупа.', 'keys', 1, 0.009) -- other keys
) as v (n, owner, type, status, title, description, category, day_offset, lat_offset);

-- Scores of L1 against every found item (no row = not a candidate).
create temporary table scores as
select right(f.id::text, 2) as n, m.score, m.breakdown
from public.items l
cross join public.items f
cross join lateral private.match_score(l, f) as m
where l.id = '46000000-0000-4000-8000-000000000001'
  and f.id::text like '46000000-0000-4000-8000-0000000000%'
  and f.type = 'found';

do $$
declare
  b jsonb := (select breakdown from scores where n = '11');
  s numeric := (select score from scores where n = '11');
  msg text;
begin
  -- match_words: normalized, distinct, sorted, no short or common words.
  assert private.match_words('Изгубени клучеви од кола', 'Црн привезок со два клуча и далечински за Голф.')
    = array['crn', 'dalecinski', 'dva', 'golf', 'kluca', 'klucevi', 'kola', 'privezok'],
    'match_words of the Cyrillic report';
  assert private.match_words('Lost keys', 'Found the keys near the park.') = array['keys', 'park'],
    'English common words are dropped';
  assert private.match_words('ab', 'cd, ef') = '{}', 'no words gives an empty array';

  -- Candidates.
  assert (select array_agg(n order by n) from scores)
    = array['11', '13', '15', '16', '18', '19', '23'],
    'candidates: same or "other" category, date window, ≤ 50 km, active, other owner';

  -- Clear match: the breakdown in detail.
  assert b ->> 'version' = 'v1', 'weights version';
  assert (b ->> 'category')::numeric = 1, 'same category = 1';
  assert (b ->> 'distance_km')::numeric = 1.0, 'distance ~1 km';
  assert (b ->> 'distance')::numeric between 0.817 and 0.820, 'distance = exp(-1/5)';
  assert (b ->> 'days_between')::int = 1, 'one day apart';
  assert (b ->> 'date')::numeric = 0.931, 'date = exp(-1/14)';
  assert b -> 'shared_words' = '["crn", "dalecinski", "dva", "kluca", "klucevi", "privezok"]',
    'shared words across Cyrillic and Latin, sorted, without "lost"/"found" words';
  assert (b ->> 'text')::numeric = 0.857, 'text = 6 shared of the 7 found words';
  assert abs(s - (0.30 * 1 + 0.25 * (b ->> 'distance')::numeric + 0.20 * 0.931
    + 0.25 * 0.857)) <= 0.002, 'score is the weighted sum of the components';
  assert s between 0.90 and 0.91, 'clear match scores ~0.905';

  -- "other" halves the category component; everything else equal.
  assert (select (breakdown ->> 'category')::numeric from scores where n = '13') = 0.5,
    '"other" category = 0.5';
  assert s - (select score from scores where n = '13') between 0.149 and 0.151,
    '"other" costs 0.30 × 0.5';

  -- Dates: 2 days before the loss is tolerated; 90 days is the limit.
  assert (select (breakdown ->> 'days_between')::int from scores where n = '15') = 2,
    'days_between is the absolute difference';
  assert (select (breakdown ->> 'date')::numeric from scores where n = '15') = 0.867,
    'date = exp(-2/14)';
  assert (select (breakdown ->> 'date')::numeric from scores where n = '16') = 0.002,
    'date = exp(-90/14)';

  -- Distance decay.
  assert (select (breakdown ->> 'distance_km')::numeric from scores where n = '18') = 5.0,
    'distance ~5 km';
  assert (select (breakdown ->> 'distance')::numeric from scores where n = '18')
    between 0.366 and 0.370, 'distance = exp(-5/5)';
  assert (select (breakdown ->> 'distance_km')::numeric from scores where n = '19') = 20.0,
    'distance ~20 km';
  assert (select (breakdown ->> 'distance')::numeric from scores where n = '19')
    between 0.017 and 0.019, 'distance = exp(-20/5)';

  -- Different keys at the same place and day: weak text.
  assert (select (breakdown ->> 'text')::numeric from scores where n = '23') < 0.3,
    'different keys: low text score';
  assert (select breakdown -> 'shared_words' from scores where n = '23') = '[]',
    'different keys: no shared words';

  -- Ordering: the clear match first, then 2 days apart, 5 km, "other".
  -- 90 days, different keys and 20 km end within 0.015 of each other
  -- (0.719, 0.711, 0.705 with weights v1; tuned in P6.S6).
  assert (select array_agg(n order by score desc) from scores)
    = array['11', '15', '18', '13', '16', '23', '19'],
    'fixture ordering';
  assert (select score from scores where n = '13')
    > (select max(score) from scores where n in ('16', '19', '23')),
    'the weak variants rank below the ones that differ in one mild way';
  assert (select bool_and(score between 0 and 1) from scores), 'scores within 0–1';

  -- Wrong item types are a programming error.
  begin
    perform private.match_score(f, l)
    from public.items l, public.items f
    where l.id = '46000000-0000-4000-8000-000000000001'
      and f.id = '46000000-0000-4000-8000-000000000011';
    raise exception 'swapped arguments should be rejected';
  exception when invalid_parameter_value then
    get stacked diagnostics msg = message_text;
    assert msg = 'match_score_types', 'swapped arguments: match_score_types';
  end;
end;
$$;

-- The functions are internal.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a9');

do $$
begin
  begin
    perform private.match_words('a', 'b');
    raise exception 'users should not call match_words';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select pg_temp.logout();
