-- Tests for the "item-images" bucket and its storage policies.
-- Objects are inserted into storage.objects directly, as the Storage API does
-- on upload with the caller's role, so the same policies apply.

-- Storage blocks direct deletes unless this is set, as the Storage API does.
select set_config('storage.allow_delete_query', 'true', true);

-- Users: A and B (normal), C (banned), D (admin).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000a2', 'images-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000b2', 'images-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000c2', 'images-c@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000d2', 'images-d@example.com');
update public.profiles set is_banned = true
where id = '00000000-0000-4000-8000-0000000000c2';
update public.profiles set role = 'admin'
where id = '00000000-0000-4000-8000-0000000000d2';

-- Bucket settings ---------------------------------------------------------------
do $$
declare b storage.buckets;
begin
  select * into b from storage.buckets where id = 'item-images';
  assert b.public, 'item-images bucket is public';
  assert b.file_size_limit = 5242880, 'item images limited to 5 MB';
  assert b.allowed_mime_types = array['image/webp', 'image/jpeg'],
    'item images accept only WebP and JPEG';
end $$;

-- B already has an image.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000b2');
insert into storage.objects (bucket_id, name, owner_id)
values ('item-images',
  '00000000-0000-4000-8000-0000000000b2/10000000-0000-4000-8000-0000000000b2/20000000-0000-4000-8000-0000000000b2.webp',
  '00000000-0000-4000-8000-0000000000b2');

-- Signed-in user A ----------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a2');

do $$
declare n int;
begin
  -- Upload into the own folder works (WebP and JPEG names).
  insert into storage.objects (bucket_id, name, owner_id) values
    ('item-images',
     '00000000-0000-4000-8000-0000000000a2/10000000-0000-4000-8000-0000000000a2/20000000-0000-4000-8000-0000000000a1.webp',
     '00000000-0000-4000-8000-0000000000a2'),
    ('item-images',
     '00000000-0000-4000-8000-0000000000a2/10000000-0000-4000-8000-0000000000a2/20000000-0000-4000-8000-0000000000a2.jpg',
     '00000000-0000-4000-8000-0000000000a2');

  -- Another user's folder, wrong depth, non-UUID names or other extensions fail.
  begin
    insert into storage.objects (bucket_id, name) values ('item-images',
      '00000000-0000-4000-8000-0000000000b2/10000000-0000-4000-8000-0000000000a2/20000000-0000-4000-8000-0000000000a3.webp');
    raise exception 'upload into another user''s folder should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('item-images',
      '00000000-0000-4000-8000-0000000000a2/20000000-0000-4000-8000-0000000000a3.webp');
    raise exception 'upload without an item folder should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('item-images',
      '00000000-0000-4000-8000-0000000000a2/10000000-0000-4000-8000-0000000000a2/x/20000000-0000-4000-8000-0000000000a3.webp');
    raise exception 'upload into a deeper folder should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('item-images',
      '00000000-0000-4000-8000-0000000000a2/10000000-0000-4000-8000-0000000000a2/photo.webp');
    raise exception 'non-UUID file name should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('item-images',
      '00000000-0000-4000-8000-0000000000a2/10000000-0000-4000-8000-0000000000a2/20000000-0000-4000-8000-0000000000a3.svg');
    raise exception 'other extensions should be denied';
  exception when insufficient_privilege then null;
  end;

  -- A sees only their own files through the API.
  select count(*) into n from storage.objects where bucket_id = 'item-images';
  assert n = 2, 'user sees only the files in their own folder';

  -- B's image cannot be overwritten or deleted.
  update storage.objects set metadata = '{"x": 1}'
  where bucket_id = 'item-images' and name like '00000000-0000-4000-8000-0000000000b2/%';
  get diagnostics n = row_count;
  assert n = 0, 'cannot overwrite another user''s image';
  delete from storage.objects
  where bucket_id = 'item-images' and name like '00000000-0000-4000-8000-0000000000b2/%';
  get diagnostics n = row_count;
  assert n = 0, 'cannot delete another user''s image';

  -- Own files are never updated in place, only deleted.
  update storage.objects set metadata = '{"x": 1}'
  where bucket_id = 'item-images' and name like '00000000-0000-4000-8000-0000000000a2/%';
  get diagnostics n = row_count;
  assert n = 0, 'item images are never updated in place';
  delete from storage.objects
  where bucket_id = 'item-images' and name like '%0000000000a2.jpg';
  get diagnostics n = row_count;
  assert n = 1, 'user can delete their own image';
end $$;

-- Banned user C -------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000c2');

do $$
begin
  begin
    insert into storage.objects (bucket_id, name) values ('item-images',
      '00000000-0000-4000-8000-0000000000c2/10000000-0000-4000-8000-0000000000c2/20000000-0000-4000-8000-0000000000c2.webp');
    raise exception 'banned user upload should be denied';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Anonymous visitor -----------------------------------------------------------------
select pg_temp.login_as_anon();

do $$
declare n int;
begin
  begin
    insert into storage.objects (bucket_id, name) values ('item-images',
      '00000000-0000-4000-8000-0000000000b2/10000000-0000-4000-8000-0000000000b2/20000000-0000-4000-8000-0000000000e1.webp');
    raise exception 'anonymous upload should be denied';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from storage.objects where bucket_id = 'item-images';
  assert n = 0, 'anonymous visitors cannot list item images';
  delete from storage.objects where bucket_id = 'item-images';
  get diagnostics n = row_count;
  assert n = 0, 'anonymous visitors cannot delete item images';
end $$;

-- Admin D ---------------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000d2');

do $$
declare n int;
begin
  select count(*) into n from storage.objects
  where bucket_id = 'item-images' and name like '00000000-0000-4000-8000-0000000000b2/%';
  assert n = 1, 'admin sees other users'' item images';
  begin
    insert into storage.objects (bucket_id, name) values ('item-images',
      '00000000-0000-4000-8000-0000000000b2/10000000-0000-4000-8000-0000000000b2/20000000-0000-4000-8000-0000000000d2.webp');
    raise exception 'admin upload into another user''s folder should be denied';
  exception when insufficient_privilege then null;
  end;
  delete from storage.objects
  where bucket_id = 'item-images' and name like '00000000-0000-4000-8000-0000000000b2/%';
  get diagnostics n = row_count;
  assert n = 1, 'admin can delete other users'' item images';
end $$;

select pg_temp.logout();
