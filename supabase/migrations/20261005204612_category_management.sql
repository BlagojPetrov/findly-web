-- P10.S6: category management (§18). The admin insert/update/delete policies
-- exist since P10.S1; this adds what the admin page needs on top of them.

-- ---------------------------------------------------------------------------
-- Slugs are fixed once a category exists: feed URLs use them (?category=keys)
-- and the matching functions find the "other" category by its slug.
-- ---------------------------------------------------------------------------
revoke update (slug) on public.categories from authenticated;

-- ---------------------------------------------------------------------------
-- The "other" category cannot be deleted: the matching rules treat it as
-- "any category" (private.match_score, private.compute_matches).
-- Error FL409 (the app shows category_protected).
-- ---------------------------------------------------------------------------
create function private.categories_protect_other()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.slug = 'other' then
    raise exception 'the "other" category is required' using errcode = 'FL409';
  end if;
  return old;
end;
$$;

create trigger categories_protect_other
  before delete on public.categories
  for each row execute function private.categories_protect_other();

revoke execute on function private.categories_protect_other() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_reorder_categories(category_ids): sets the display order to the
-- order of the array (sort_order 10, 20, …) in one transaction. The array
-- must hold every category exactly once, so a page that missed a category
-- added or deleted meanwhile is refused (22023) instead of guessing.
-- security invoker: the admin update policy applies. Error 42501 for anyone
-- but an admin.
-- ---------------------------------------------------------------------------
create function public.admin_reorder_categories(category_ids smallint[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  -- Locks the categories, so two reorders run one after the other.
  perform 1 from public.categories for update;
  if category_ids is null
     or cardinality(category_ids) <> (select count(distinct x) from unnest(category_ids) as x)
     or array(select x from unnest(category_ids) as x order by x)
        <> array(select c.id from public.categories c order by c.id) then
    raise exception 'the list must hold every category once' using errcode = '22023';
  end if;
  update public.categories c
  set sort_order = (o.ord * 10)::smallint
  from unnest(category_ids) with ordinality as o (id, ord)
  where c.id = o.id and c.sort_order is distinct from (o.ord * 10)::smallint;
end;
$$;

revoke execute on function public.admin_reorder_categories(smallint[]) from public, anon;
grant execute on function public.admin_reorder_categories(smallint[]) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_category_item_counts(): the number of reports in every category
-- (hidden ones included), so the page can tell which categories are in use.
-- security invoker: admins see every item through RLS. Error 42501 for
-- anyone but an admin.
-- ---------------------------------------------------------------------------
create function public.admin_category_item_counts()
returns table (category_id smallint, item_count bigint)
language plpgsql
stable
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
  select c.id, count(i.id)
  from public.categories c
  left join public.items i on i.category_id = c.id
  group by c.id;
end;
$$;

revoke execute on function public.admin_category_item_counts() from public, anon;
grant execute on function public.admin_category_item_counts() to authenticated;
