-- Tests for items, item_images, their triggers, privileges and policies,
-- and create_item().

-- Users: A (owner), B (another user), C (admin), D (banned).
select pg_temp.create_user('00000000-0000-4000-8000-00000000000a', 'a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-00000000000b', 'b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-00000000000c', 'c@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-00000000000d', 'd@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-00000000000c';
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-00000000000d';

-- Owner A: create_item, triggers, own updates ---------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-00000000000a');

do $$
declare
  keys smallint := (select id from public.categories where slug = 'keys');
  item uuid := '10000000-0000-4000-8000-000000000001';
  today date := (now() at time zone 'Europe/Skopje')::date;
  new_id uuid;
  i public.items;
  n int;
begin
  -- Create with two images; positions follow the array order.
  new_id := public.create_item(
    type => 'lost', title => '  Car keys  ', description => 'Black key ring with two keys.',
    category_id => keys, occurred_on => today, location_name => '  ',
    image_paths => array[
      '00000000-0000-4000-8000-00000000000a/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001.webp',
      '00000000-0000-4000-8000-00000000000a/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002.jpg'
    ],
    item_id => item);
  assert new_id = item, 'create_item uses the given id';

  select * into i from public.items where id = item;
  assert i.user_id = '00000000-0000-4000-8000-00000000000a', 'item belongs to the caller';
  assert i.status = 'active' and i.resolved_at is null, 'new item is active';
  assert i.title = 'Car keys', 'title is trimmed';
  assert i.location_name is null, 'blank location_name becomes null';
  assert (select count(*) from public.item_images where item_id = item) = 2, 'two images saved';
  assert (select storage_path from public.item_images where item_id = item and position = 0)
    like '%0001.webp', 'first path is the cover (position 0)';

  -- Without images and without an id.
  new_id := public.create_item('found', 'Blue umbrella', 'Found near the bus stop.', keys, today - 3);
  assert new_id is not null, 'create_item generates an id';

  -- More than 5 images.
  begin
    perform public.create_item('lost', 'Too many', 'Six images is one too many.', keys, today,
      image_paths => array['a', 'b', 'c', 'd', 'e', 'f']);
    raise exception 'six images should be rejected';
  exception when check_violation then null;
  end;

  -- Future date (in Macedonian time).
  begin
    perform public.create_item('lost', 'Tomorrow', 'Lost something tomorrow.', keys, today + 1);
    raise exception 'future occurred_on should be rejected';
  exception when check_violation then null;
  end;
  begin
    update public.items set occurred_on = today + 1 where id = item;
    raise exception 'updating occurred_on to the future should be rejected';
  exception when check_violation then null;
  end;

  -- Image in another user's folder, or with another item's id in the path.
  begin
    insert into public.item_images (item_id, storage_path, position) values (item,
      '00000000-0000-4000-8000-00000000000b/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000009.webp', 2);
    raise exception 'image in another user''s folder should be rejected';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.item_images (item_id, storage_path, position) values (item,
      '00000000-0000-4000-8000-00000000000a/10000000-0000-4000-8000-000000000099/20000000-0000-4000-8000-000000000009.webp', 2);
    raise exception 'image path with another item id should be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.item_images (item_id, storage_path, position) values (item,
      '00000000-0000-4000-8000-00000000000a/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000009.webp', 5);
    raise exception 'position 5 (sixth image) should be rejected';
  exception when check_violation then null;
  end;

  -- Items for someone else, or with a status, cannot be inserted.
  begin
    insert into public.items (user_id, type, title, description, category_id, occurred_on)
    values ('00000000-0000-4000-8000-00000000000b', 'lost', 'Fake', 'Created for someone else.', keys, today);
    raise exception 'insert for another user should be rejected';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.items (type, status, title, description, category_id, occurred_on)
    values ('lost', 'hidden', 'Status', 'Status is not insertable.', keys, today);
    raise exception 'inserting status should be denied';
  exception when insufficient_privilege then null;
  end;

  -- Own content can be updated; protected columns cannot.
  update public.items set title = 'House keys' where id = item;
  get diagnostics n = row_count;
  assert n = 1, 'owner can update the title';
  begin
    update public.items set user_id = '00000000-0000-4000-8000-00000000000b' where id = item;
    raise exception 'updating user_id should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.items set resolved_at = now() where id = item;
    raise exception 'updating resolved_at should be denied';
  exception when insufficient_privilege then null;
  end;

  -- The owner cannot hide an item.
  begin
    update public.items set status = 'hidden' where id = item;
    raise exception 'owner hiding an item should be rejected';
  exception when insufficient_privilege then null;
  end;

  -- resolved_at follows status.
  update public.items set status = 'resolved' where id = item;
  assert (select resolved_at from public.items where id = item) is not null, 'resolved sets resolved_at';
  update public.items set status = 'active' where id = item;
  assert (select resolved_at from public.items where id = item) is null, 'active clears resolved_at';

  -- Reordering: swapping two positions in one statement (deferrable unique).
  update public.item_images set position = 1 - position where item_id = item;
  get diagnostics n = row_count;
  assert n = 2, 'owner can swap image positions';
  assert (select storage_path from public.item_images where item_id = item and position = 0)
    like '%0002.jpg', 'second image is now the cover';
end $$;

select pg_temp.logout();

-- Another user B ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-00000000000b');

do $$
declare
  item uuid := '10000000-0000-4000-8000-000000000001';
  n int;
begin
  assert (select count(*) from public.items where id = item) = 1, 'B sees A''s active item';
  assert (select count(*) from public.item_images where item_id = item) = 2, 'B sees its images';

  update public.items set title = 'Hacked' where id = item;
  get diagnostics n = row_count;
  assert n = 0, 'B cannot update A''s item';
  delete from public.items where id = item;
  get diagnostics n = row_count;
  assert n = 0, 'B cannot delete A''s item';

  update public.item_images set position = 4 where item_id = item and position = 0;
  get diagnostics n = row_count;
  assert n = 0, 'B cannot reorder A''s images';
  delete from public.item_images where item_id = item;
  get diagnostics n = row_count;
  assert n = 0, 'B cannot delete A''s images';
  begin
    insert into public.item_images (item_id, storage_path, position) values (item,
      '00000000-0000-4000-8000-00000000000b/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000009.webp', 3);
    raise exception 'B adding an image to A''s item should be rejected';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Daily limit: 20 items in 24 hours, the 21st is rejected.
do $$
declare
  other smallint := (select id from public.categories where slug = 'other');
begin
  for k in 1..20 loop
    perform public.create_item('found', 'Item ' || k, 'Daily limit test item.', other, current_date - 1);
  end loop;
  begin
    perform public.create_item('found', 'Item 21', 'Daily limit test item.', other, current_date - 1);
    raise exception 'the 21st item in 24 hours should be rejected';
  exception when sqlstate 'FL429' then null;
  end;
end $$;

select pg_temp.logout();

-- Signed-out visitor -------------------------------------------------------------------
select pg_temp.login_as_anon();

do $$
declare item uuid := '10000000-0000-4000-8000-000000000001';
begin
  assert (select count(*) from public.items where id = item) = 1, 'anon sees active items';
  assert (select count(*) from public.item_images where item_id = item) = 2, 'anon sees their images';
  begin
    perform public.create_item('lost', 'Anon item', 'Anon should not create.', 1::smallint, current_date - 1);
    raise exception 'anon calling create_item should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.items (type, title, description, category_id, occurred_on)
    values ('lost', 'Anon item', 'Anon should not create.', 1, current_date - 1);
    raise exception 'anon insert should be denied';
  exception when insufficient_privilege then null;
  end;
end $$;

select pg_temp.logout();

-- Banned user D ---------------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-00000000000d');

do $$
begin
  begin
    perform public.create_item('lost', 'Banned item', 'Banned users cannot create.', 1::smallint, current_date - 1);
    raise exception 'banned user create_item should be rejected';
  exception when insufficient_privilege then null;
  end;
end $$;

select pg_temp.logout();

-- Admin C hides A's item ------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-00000000000c');

do $$
declare
  item uuid := '10000000-0000-4000-8000-000000000001';
  n int;
begin
  update public.items set status = 'hidden' where id = item;
  get diagnostics n = row_count;
  assert n = 1, 'admin can hide an item';
  assert (select count(*) from public.items where id = item) = 1, 'admin sees hidden items';
  assert (select count(*) from public.item_images where item_id = item) = 2, 'admin sees their images';
end $$;

select pg_temp.logout();

-- Hidden item: invisible to others, read-only for the owner.
select pg_temp.login_as('00000000-0000-4000-8000-00000000000b');
do $$
begin
  assert (select count(*) from public.items where id = '10000000-0000-4000-8000-000000000001') = 0,
    'B does not see the hidden item';
  assert (select count(*) from public.item_images where item_id = '10000000-0000-4000-8000-000000000001') = 0,
    'B does not see the hidden item''s images';
end $$;
select pg_temp.logout();

select pg_temp.login_as_anon();
do $$
begin
  assert (select count(*) from public.items where id = '10000000-0000-4000-8000-000000000001') = 0,
    'anon does not see the hidden item';
end $$;
select pg_temp.logout();

select pg_temp.login_as('00000000-0000-4000-8000-00000000000a');
do $$
declare
  item uuid := '10000000-0000-4000-8000-000000000001';
  n int;
begin
  assert (select count(*) from public.items where id = item) = 1, 'owner sees the hidden item';
  update public.items set status = 'active' where id = item;
  get diagnostics n = row_count;
  assert n = 0, 'owner cannot un-hide the item';
  update public.item_images set position = 4 where item_id = item and position = 0;
  get diagnostics n = row_count;
  assert n = 0, 'owner cannot change images of a hidden item';

  -- Deleting the item removes its image rows.
  delete from public.items where id = item;
  get diagnostics n = row_count;
  assert n = 1, 'owner can delete the hidden item';
end $$;
select pg_temp.logout();

do $$
begin
  assert (select count(*) from public.item_images
          where item_id = '10000000-0000-4000-8000-000000000001') = 0,
    'image rows are deleted with the item';
end $$;
