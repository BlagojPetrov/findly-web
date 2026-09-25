-- Tests for the "avatars" bucket and its storage policies.
-- Objects are inserted into storage.objects directly, as the Storage API does
-- on upload with the caller's role, so the same policies apply.

-- Storage blocks direct deletes unless this is set, as the Storage API does.
select set_config('storage.allow_delete_query', 'true', true);

-- Users: A and B (normal), C (banned).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000a1', 'avatar-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000b1', 'avatar-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000c1', 'avatar-c@example.com');
update public.profiles set is_banned = true
where id = '00000000-0000-4000-8000-0000000000c1';

-- Bucket settings ---------------------------------------------------------------
do $$
declare b storage.buckets;
begin
  select * into b from storage.buckets where id = 'avatars';
  assert b.public, 'avatars bucket is public';
  assert b.file_size_limit = 1048576, 'avatars limited to 1 MB';
  assert b.allowed_mime_types = array['image/webp', 'image/jpeg'],
    'avatars accept only WebP and JPEG';
end $$;

-- B already has a picture.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000b1');
insert into storage.objects (bucket_id, name, owner_id)
values ('avatars', '00000000-0000-4000-8000-0000000000b1/b.webp',
  '00000000-0000-4000-8000-0000000000b1');

-- Signed-in user A ----------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a1');

do $$
declare n int;
begin
  -- Upload into the own folder works.
  insert into storage.objects (bucket_id, name, owner_id)
  values ('avatars', '00000000-0000-4000-8000-0000000000a1/a.webp',
    '00000000-0000-4000-8000-0000000000a1');

  -- Uploading into another user's folder, the bucket root or a subfolder fails.
  begin
    insert into storage.objects (bucket_id, name)
    values ('avatars', '00000000-0000-4000-8000-0000000000b1/evil.webp');
    raise exception 'upload into another user''s folder should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', 'root.webp');
    raise exception 'upload into the bucket root should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name)
    values ('avatars', '00000000-0000-4000-8000-0000000000a1/sub/a.webp');
    raise exception 'upload into a subfolder should be denied';
  exception when insufficient_privilege then null;
  end;

  -- A sees only their own files through the API.
  select count(*) into n from storage.objects where bucket_id = 'avatars';
  assert n = 1, 'user sees only the files in their own folder';

  -- B's picture cannot be overwritten or deleted (both affect 0 rows,
  -- because A cannot see it and there is no update policy at all).
  update storage.objects set metadata = '{"x": 1}'
  where name = '00000000-0000-4000-8000-0000000000b1/b.webp';
  get diagnostics n = row_count;
  assert n = 0, 'cannot overwrite another user''s avatar';

  delete from storage.objects
  where name = '00000000-0000-4000-8000-0000000000b1/b.webp';
  get diagnostics n = row_count;
  assert n = 0, 'cannot delete another user''s avatar';

  -- Own files cannot be updated in place either, only deleted.
  update storage.objects set metadata = '{"x": 1}'
  where name = '00000000-0000-4000-8000-0000000000a1/a.webp';
  get diagnostics n = row_count;
  assert n = 0, 'avatars are never updated in place';

  -- The profile can point to the own file, not to another user's.
  update public.profiles
  set avatar_path = '00000000-0000-4000-8000-0000000000a1/a.webp'
  where id = '00000000-0000-4000-8000-0000000000a1';
  begin
    update public.profiles
    set avatar_path = '00000000-0000-4000-8000-0000000000b1/b.webp'
    where id = '00000000-0000-4000-8000-0000000000a1';
    raise exception 'avatar_path in another user''s folder should be rejected';
  exception when check_violation then null;
  end;

  delete from storage.objects
  where name = '00000000-0000-4000-8000-0000000000a1/a.webp';
  get diagnostics n = row_count;
  assert n = 1, 'user can delete their own avatar';
end $$;

-- Banned user C -------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000c1');

do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
    values ('avatars', '00000000-0000-4000-8000-0000000000c1/c.webp');
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
    insert into storage.objects (bucket_id, name)
    values ('avatars', '00000000-0000-4000-8000-0000000000b1/anon.webp');
    raise exception 'anonymous upload should be denied';
  exception when insufficient_privilege then null;
  end;

  -- The public URL works without a select policy; the API cannot list files.
  select count(*) into n from storage.objects where bucket_id = 'avatars';
  assert n = 0, 'anonymous visitors cannot list avatars';

  delete from storage.objects where bucket_id = 'avatars';
  get diagnostics n = row_count;
  assert n = 0, 'anonymous visitors cannot delete avatars';
end $$;

select pg_temp.logout();

do $$
declare n int;
begin
  select count(*) into n from storage.objects
  where name = '00000000-0000-4000-8000-0000000000b1/b.webp';
  assert n = 1, 'B''s avatar is untouched';
end $$;
