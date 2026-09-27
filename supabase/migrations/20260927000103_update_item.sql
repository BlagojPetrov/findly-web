-- P3.S7: update_item(): edits an item and its photos in one transaction.
--
-- Called by the updateItem action. security invoker: runs as the caller, so
-- the items/item_images policies apply (only the owner, not banned, not a
-- hidden item). image_paths is the complete new list in cover order:
--   * image rows whose path is not in the list are deleted;
--   * new paths are inserted, existing ones get their new position
--     (item_images_item_id_position_key is deferrable, so positions can be
--     swapped within the statement).
-- Returns the storage paths of the removed rows, so the action can delete
-- those files from the "item-images" bucket.
-- Location parameters are added in P5.S3.

create function public.update_item(
  item_id uuid,
  type public.item_type,
  title text,
  description text,
  category_id smallint,
  occurred_on date,
  location_name text default null,
  image_paths text[] default '{}'
)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  paths text[] := coalesce(update_item.image_paths, '{}');
  removed text[];
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if cardinality(paths) > 5 then
    raise exception 'too_many_images'
      using errcode = 'check_violation', detail = 'An item has at most 5 images.';
  end if;

  update public.items as i
  set type = update_item.type,
      title = btrim(update_item.title),
      description = btrim(update_item.description),
      category_id = update_item.category_id,
      occurred_on = update_item.occurred_on,
      location_name = nullif(btrim(update_item.location_name), '')
  where i.id = update_item.item_id;

  -- Missing, not the caller's, or hidden: the update policy hides the row.
  if not found then
    raise exception 'item_not_found' using errcode = 'no_data_found';
  end if;

  with deleted as (
    delete from public.item_images as im
    where im.item_id = update_item.item_id
      and im.storage_path <> all (paths)
    returning im.storage_path
  )
  select coalesce(array_agg(deleted.storage_path), '{}') into removed from deleted;

  insert into public.item_images (item_id, storage_path, position)
  select update_item.item_id, p.path, (p.n - 1)::smallint
  from unnest(paths) with ordinality as p (path, n)
  on conflict (storage_path) do update set position = excluded.position;

  return removed;
end;
$$;

revoke execute on function public.update_item from public, anon;
grant execute on function public.update_item to authenticated;
