-- Tests for update_item(): editing an item and its photos.

-- Users: A (owner), B (another user), D (banned).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000a3', 'upd-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000b3', 'upd-b@example.com');

select pg_temp.login_as('00000000-0000-4000-8000-0000000000a3');

-- A's item with three photos (p1 cover, p2, p3).
select public.create_item(
  type => 'lost', title => 'Old title', description => 'Old description text.',
  category_id => 1::smallint, occurred_on => current_date - 3,
  image_paths => array[
    '00000000-0000-4000-8000-0000000000a3/40000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001.webp',
    '00000000-0000-4000-8000-0000000000a3/40000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000002.webp',
    '00000000-0000-4000-8000-0000000000a3/40000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000003.webp'
  ],
  item_id => '40000000-0000-4000-8000-000000000001');

do $$
declare
  item uuid := '40000000-0000-4000-8000-000000000001';
  base text := '00000000-0000-4000-8000-0000000000a3/40000000-0000-4000-8000-000000000001/';
  removed text[];
  i public.items;
begin
  -- Remove p2, move p3 to the cover, keep p1, add p4.
  removed := public.update_item(
    item_id => item, type => 'found', title => '  New title  ',
    description => 'New description text.', category_id => 2::smallint,
    occurred_on => current_date - 1, location_name => '  Park  ',
    image_paths => array[
      base || '50000000-0000-4000-8000-000000000003.webp',
      base || '50000000-0000-4000-8000-000000000001.webp',
      base || '50000000-0000-4000-8000-000000000004.webp'
    ]);
  assert removed = array[base || '50000000-0000-4000-8000-000000000002.webp'],
    'returns the removed paths';

  select * into i from public.items where id = item;
  assert i.type = 'found' and i.title = 'New title' and i.category_id = 2
    and i.location_name = 'Park' and i.occurred_on = current_date - 1,
    'item fields updated and trimmed';

  assert (select array_agg(right(storage_path, 7) order by position)
          from public.item_images where item_id = item)
    = array['03.webp', '01.webp', '04.webp'], 'photos in the new order';

  -- Blank location clears it; an empty list removes all photos.
  removed := public.update_item(item, 'found', 'New title', 'New description text.',
    2::smallint, current_date - 1, '   ', '{}');
  assert cardinality(removed) = 3, 'all three photos removed';
  assert (select location_name from public.items where id = item) is null, 'blank location → null';
  assert not exists (select 1 from public.item_images where item_id = item), 'no photo rows left';

  -- Future date, too many photos, a photo of another item.
  begin
    perform public.update_item(item, 'found', 'New title', 'New description text.',
      2::smallint, current_date + 2);
    raise exception 'future date should be rejected';
  exception when check_violation then null;
  end;
  begin
    perform public.update_item(item, 'found', 'New title', 'New description text.',
      2::smallint, current_date, null, array['a', 'b', 'c', 'd', 'e', 'f']);
    raise exception 'six photos should be rejected';
  exception when check_violation then null;
  end;
  begin
    perform public.update_item(item, 'found', 'New title', 'New description text.',
      2::smallint, current_date, null, array[
        '00000000-0000-4000-8000-0000000000a3/40000000-0000-4000-8000-000000000099/50000000-0000-4000-8000-000000000009.webp']);
    raise exception 'a photo path of another item should be rejected';
  exception when check_violation then null;
  end;

  -- Missing item.
  begin
    perform public.update_item('40000000-0000-4000-8000-0000000000ff', 'found', 'New title',
      'New description text.', 2::smallint, current_date);
    raise exception 'missing item should raise no_data_found';
  exception when no_data_found then null;
  end;
end $$;

select pg_temp.logout();

-- Another user cannot edit A's item.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000b3');
do $$
begin
  begin
    perform public.update_item('40000000-0000-4000-8000-000000000001', 'lost', 'Hacked',
      'Hacked description.', 1::smallint, current_date);
    raise exception 'another user should not edit the item';
  exception when no_data_found then null;
  end;
end $$;
select pg_temp.logout();

-- Anonymous visitors cannot call it at all.
select pg_temp.login_as_anon();
do $$
begin
  begin
    perform public.update_item('40000000-0000-4000-8000-000000000001', 'lost', 'Anon',
      'Anon description.', 1::smallint, current_date);
    raise exception 'anon should not call update_item';
  exception when insufficient_privilege then null;
  end;
end $$;
select pg_temp.logout();

-- The owner cannot edit an item once an admin has hidden it, and a banned
-- owner cannot edit at all.
update public.items set status = 'hidden' where id = '40000000-0000-4000-8000-000000000001';
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a3');
do $$
begin
  begin
    perform public.update_item('40000000-0000-4000-8000-000000000001', 'lost', 'Edited',
      'Edited description.', 1::smallint, current_date);
    raise exception 'hidden item should not be editable';
  exception when no_data_found then null;
  end;
end $$;
select pg_temp.logout();

update public.items set status = 'active' where id = '40000000-0000-4000-8000-000000000001';
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-0000000000a3';
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a3');
do $$
begin
  begin
    perform public.update_item('40000000-0000-4000-8000-000000000001', 'lost', 'Edited',
      'Edited description.', 1::smallint, current_date);
    raise exception 'banned owner should not edit';
  exception when insufficient_privilege then null;
  end;
end $$;
select pg_temp.logout();

do $$
begin
  assert (select title from public.items where id = '40000000-0000-4000-8000-000000000001')
    = 'New title', 'item unchanged by rejected edits';
end $$;
