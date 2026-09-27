-- P4.S1: text normalization and search columns on items.
--
-- normalize_text() turns Macedonian Cyrillic and the usual Latin spellings
-- of it into one form, so "Паричник", "paričnik", "parichnik" and
-- "PARICNIK" all become "paricnik". Stored text (items.search_text) and the
-- user's query go through the same function, so they always compare alike.
-- search_items() (P4.S2) and matching (P6) use these columns.

-- unaccent() is only "stable" (the dictionary could change), so it cannot be
-- used in an index or a generated column. With the dictionary named
-- explicitly the result is fixed, so this wrapper is declared immutable.
create function private.immutable_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value);
$$;

-- Normalizes text for search:
--   1. lower case;
--   2. Macedonian Cyrillic → Latin without diacritics (ч→c, ш→s, ж→z,
--      ѓ→g, ќ→k, џ/ѕ→dz, љ→lj, њ→nj);
--   3. unaccent (č→c, š→s, ž→z, ǵ→g, ḱ→k, …);
--   4. Latin digraphs used for the same letters (dzh, zh, ch, sh, gj, kj)
--      folded the same way;
--   5. anything that is not a letter or digit → one space; trimmed.
-- Some letters collide (ц and ч are both "c"); for search that only makes
-- matching a little more lenient.
create function private.normalize_text(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      replace(replace(replace(replace(replace(replace(
        private.immutable_unaccent(
          translate(
            replace(replace(replace(replace(
              lower(value),
              'џ', 'dz'), 'ѕ', 'dz'), 'љ', 'lj'), 'њ', 'nj'),
            'абвгдѓежзијклмнопрстќуфхцчшѐѝ',
            'abvgdgezzijklmnoprstkufhccsei'
          )
        ),
        'dzh', 'dz'), 'zh', 'z'), 'ch', 'c'), 'sh', 's'), 'gj', 'g'), 'kj', 'k'),
      '[^[:alnum:]]+', ' ', 'g'
    )
  );
$$;

-- search_items() runs as the caller (security invoker), so visitors and
-- users need to be able to normalize their query.
revoke execute on function private.immutable_unaccent(text) from public;
revoke execute on function private.normalize_text(text) from public;
grant execute on function private.immutable_unaccent(text) to anon, authenticated;
grant execute on function private.normalize_text(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- items.search_text: normalized title, description and place, kept up to
-- date by a trigger (users have no privilege on the column itself).
-- ---------------------------------------------------------------------------
alter table public.items add column search_text text;

create function private.items_set_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := private.normalize_text(
    concat_ws(' ', new.title, new.description, new.location_name)
  );
  return new;
end;
$$;

create trigger items_set_search_text
  before insert or update of title, description, location_name on public.items
  for each row execute function private.items_set_search_text();

revoke execute on function private.items_set_search_text() from public, anon, authenticated;

-- Backfill existing items without touching updated_at.
alter table public.items disable trigger items_set_updated_at;
update public.items
set search_text = private.normalize_text(
  concat_ws(' ', title, description, location_name)
);
alter table public.items enable trigger items_set_updated_at;

alter table public.items alter column search_text set not null;

-- Full-text vector of the normalized text. The "simple" configuration only
-- splits words (no stemming), which fits text that is already transliterated.
alter table public.items
  add column search_vector tsvector
  generated always as (to_tsvector('simple'::regconfig, search_text)) stored;

-- Whole-word search (@@) and typo-tolerant search (word_similarity, %>).
create index items_search_vector_idx
  on public.items using gin (search_vector);
create index items_search_text_trgm_idx
  on public.items using gin (search_text extensions.gin_trgm_ops);
