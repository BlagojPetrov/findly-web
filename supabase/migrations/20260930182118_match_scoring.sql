-- P6.S2: scoring of a lost ↔ found pair (§14, weights version v1).
--
-- private.match_score(lost, found) applies the candidate rules and returns
-- one row (score, breakdown) for a candidate pair, or no row otherwise, so
-- compute_matches (P6.S3) can use it in a lateral join. It only reads; both
-- functions are internal (schema private, not executable by API roles).

-- Words of a report used for text matching: normalized title and
-- description (not the place, which the distance already covers), distinct,
-- at least 3 characters, without common words and the words for "lost" and
-- "found" (in normalized form, so Cyrillic and Latin spellings are covered).
create function private.match_words(title text, description text)
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(array_agg(distinct word order by word), '{}')
  from regexp_split_to_table(
    private.normalize_text(concat_ws(' ', title, description)), ' '
  ) as word
  where char_length(word) >= 3
    and word <> all (array[
      -- Macedonian
      'kaj', 'koj', 'koja', 'koe', 'koi', 'sto', 'ova', 'ovoj', 'ovaa', 'toj',
      'taa', 'tie', 'bese', 'bea', 'bil', 'bila', 'bilo', 'ima', 'imase',
      'nema', 'ili', 'ama', 'ako', 'pred', 'posle', 'okolu', 'blizu', 'samo',
      'site', 'moj', 'moja', 'moe', 'moi', 'mojot', 'mojata', 'eden', 'edna',
      'edno', 'nekoj', 'nekade', 'bez', 'izgubi', 'izgubiv', 'izgubil',
      'izgubila', 'izguben', 'izgubena', 'izgubeno', 'izgubeni', 'najde',
      'najdov', 'najdol', 'najdena', 'najden', 'najdeno', 'najdeni',
      -- English
      'the', 'and', 'with', 'for', 'was', 'were', 'has', 'have', 'had', 'near',
      'lost', 'found', 'this', 'that', 'from', 'its', 'our', 'your', 'his',
      'her', 'one', 'are', 'not', 'but', 'someone'
    ]);
$$;

-- Candidate rules (a pair that breaks one gets no row):
--   * both active, different owners (lost must be "lost" and found "found",
--     otherwise the call itself is wrong and raises 22023);
--   * same category, or either item in "other";
--   * found.occurred_on >= lost.occurred_on - 2 days, and at most 90 days
--     apart;
--   * at most 50 km apart (every item has a location since P5.S3).
-- Components (0–1) and weights:
--   category 0.30  1 for the same category, 0.5 when "other" is involved
--   distance 0.25  exp(-km / 5)
--   date     0.20  exp(-days / 14), days = absolute difference
--   text     0.25  greater of the trigram similarity of the two word lists
--                  and the share of shared words in the shorter list
-- score = Σ weight × component, rounded to 3 decimals. The breakdown keeps
-- the components (3 decimals), distance_km (1 decimal), days_between and up
-- to 10 shared words in alphabetical order.
create function private.match_score(lost public.items, found public.items)
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
    (0.30 * c_category + 0.25 * c_distance + 0.20 * c_date + 0.25 * c_text)::numeric,
    3
  );
  breakdown := jsonb_build_object(
    'version', 'v1',
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

revoke execute on function private.match_words(text, text) from public, anon, authenticated;
revoke execute on function private.match_score(public.items, public.items)
  from public, anon, authenticated;
