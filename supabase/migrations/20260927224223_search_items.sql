-- P4.S2: search_items(): the public feed's search, filters and pagination.
--
-- security invoker: runs as the caller, so the items policies apply. Hidden
-- items are also excluded explicitly, so owners and admins never see them in
-- the feed either (they have their own pages).
--
-- Text search (q) uses the columns from P4.S1: the query is normalized like
-- items.search_text, then an item matches when it contains every word
-- (full text) or when the query is similar to part of its text (trigram
-- word similarity >= 0.4, which catches typos and unfinished words).
-- normalize_text() removes quotes and minus signs, so plainto_tsquery is
-- used (websearch operators could never reach it).
--
-- Filters that are null (or an empty category list) are ignored.
-- item_status null means active and resolved.
-- sort: 'newest' (default) or 'relevance' (by rank, then newest; the same as
-- newest without q). 'nearest' and the radius filter come in P5.S5.
-- Pagination: page_size is clamped to 1–50, page to at least 1. Every row
-- carries total_count (all matches); a page past the end returns no rows.

-- The function sets pg_trgm.word_similarity_threshold. Until pg_trgm's
-- library is loaded in the session that parameter is only a placeholder,
-- which a non-superuser may not put into a function definition. Calling any
-- pg_trgm function loads the library. (Callers need nothing: setting the
-- parameter at call time works for every role.)
select extensions.show_limit();

create function public.search_items(
  q text default null,
  item_type public.item_type default null,
  category_slugs text[] default null,
  item_status public.item_status default 'active',
  date_from date default null,
  date_to date default null,
  sort text default 'newest',
  page_size integer default 20,
  page integer default 1
)
returns table (
  id uuid,
  type public.item_type,
  status public.item_status,
  title text,
  occurred_on date,
  location_name text,
  created_at timestamptz,
  category_id smallint,
  category_slug text,
  category_name_mk text,
  category_name_en text,
  category_icon text,
  cover_path text,
  rank real,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
-- Threshold of the <% operator (word similarity), which can use the trigram
-- index on search_text.
set pg_trgm.word_similarity_threshold = 0.4
as $$
#variable_conflict use_column
declare
  search text := nullif(private.normalize_text(search_items.q), '');
  size integer := least(greatest(coalesce(search_items.page_size, 20), 1), 50);
  skip integer := (greatest(coalesce(search_items.page, 1), 1) - 1) * size;
  by_relevance boolean;
begin
  if coalesce(search_items.sort, 'newest') not in ('newest', 'relevance') then
    raise exception 'invalid_sort'
      using errcode = 'invalid_parameter_value',
            detail = 'sort must be newest or relevance.';
  end if;
  by_relevance := search_items.sort = 'relevance' and search is not null;

  return query
  with matched as (
    select
      i.id, i.type, i.status, i.title, i.occurred_on, i.location_name,
      i.created_at, i.category_id,
      c.slug, c.name_mk, c.name_en, c.icon,
      case
        when search is null then 0::real
        else ts_rank(i.search_vector, plainto_tsquery('simple'::regconfig, search))
          + extensions.word_similarity(search, i.search_text)
      end as rank
    from public.items as i
    join public.categories as c on c.id = i.category_id
    where i.status <> 'hidden'
      and (search_items.item_status is null or i.status = search_items.item_status)
      and (search_items.item_type is null or i.type = search_items.item_type)
      and (
        coalesce(cardinality(search_items.category_slugs), 0) = 0
        or c.slug = any (search_items.category_slugs)
      )
      and (search_items.date_from is null or i.occurred_on >= search_items.date_from)
      and (search_items.date_to is null or i.occurred_on <= search_items.date_to)
      and (
        search is null
        or i.search_vector @@ plainto_tsquery('simple'::regconfig, search)
        or search operator(extensions.<%) i.search_text
      )
  )
  select
    m.id, m.type, m.status, m.title, m.occurred_on, m.location_name,
    m.created_at, m.category_id, m.slug, m.name_mk, m.name_en, m.icon,
    (
      select im.storage_path
      from public.item_images as im
      where im.item_id = m.id
      order by im.position
      limit 1
    ),
    m.rank,
    count(*) over ()
  from matched as m
  order by
    case when by_relevance then m.rank end desc nulls last,
    m.created_at desc,
    m.id desc
  limit size
  offset skip;
end;
$$;

revoke execute on function public.search_items(
  text, public.item_type, text[], public.item_status, date, date, text, integer, integer
) from public;
grant execute on function public.search_items(
  text, public.item_type, text[], public.item_status, date, date, text, integer, integer
) to anon, authenticated;
