-- P10.S5: user list for the admin area (§18). Admins cannot read other users'
-- role, ban state or email through the API (column privileges on profiles,
-- auth.users is not exposed), so the list comes from one security definer
-- function that only admins may call.

-- ---------------------------------------------------------------------------
-- admin_list_users(search, banned_only, page_size, page_offset): one page of
-- users, newest accounts first. `search` matches the display name or the
-- email (case-insensitive substring, no wildcards); `banned_only` keeps only
-- banned users. Every row carries the total number of matching users
-- (total_count; a page past the end returns no rows). item_count counts all
-- the user's reports, open_report_count the open flags about them.
-- Error 42501 for anyone but an admin.
-- ---------------------------------------------------------------------------
create function public.admin_list_users(
  search text default null,
  banned_only boolean default false,
  page_size integer default 20,
  page_offset integer default 0
)
returns table (
  id uuid,
  display_name text,
  avatar_path text,
  email text,
  role public.user_role,
  is_banned boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  item_count bigint,
  open_report_count bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  term text := nullif(lower(btrim(search)), '');
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if page_size not between 1 and 100 or page_offset < 0 then
    raise exception 'invalid page' using errcode = '22023';
  end if;
  return query
  select
    p.id,
    p.display_name,
    p.avatar_path,
    u.email::text,
    p.role,
    p.is_banned,
    p.created_at,
    u.last_sign_in_at,
    (select count(*) from public.items i where i.user_id = p.id),
    (select count(*)
       from public.reports r
       join public.items i on i.id = r.item_id
      where i.user_id = p.id and r.status = 'open'),
    count(*) over ()
  from public.profiles p
  left join auth.users u on u.id = p.id
  where (term is null
         or strpos(lower(p.display_name), term) > 0
         or strpos(lower(coalesce(u.email, '')), term) > 0)
    and (not banned_only or p.is_banned)
  order by p.created_at desc, p.id desc
  limit page_size
  offset page_offset;
end;
$$;

revoke execute on function public.admin_list_users(text, boolean, integer, integer) from public, anon;
grant execute on function public.admin_list_users(text, boolean, integer, integer) to authenticated;
