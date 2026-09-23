-- Tests for profiles, handle_new_user(), is_admin(), can_write(),
-- current_profile() and the profile privileges/policies.

-- Users: A (email sign-up, English), B (Google), C (no usable name),
-- D (name longer than 50 characters).
select pg_temp.create_user('00000000-0000-4000-8000-00000000000a', 'ana@example.com',
  '{"display_name": "  Ana Test  ", "locale": "en"}');
select pg_temp.create_user('00000000-0000-4000-8000-00000000000b', 'bojan@example.com',
  '{"full_name": "Bojan Google", "locale": "de"}');
select pg_temp.create_user('00000000-0000-4000-8000-00000000000c', 'x@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-00000000000d', 'long@example.com',
  jsonb_build_object('display_name', repeat('Д', 60)));

-- Profile creation on sign-up --------------------------------------------------
do $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = '00000000-0000-4000-8000-00000000000a';
  assert p.display_name = 'Ana Test', 'display_name from metadata, trimmed';
  assert p.preferred_locale = 'en', 'locale from metadata';
  assert p.role = 'user' and not p.is_banned, 'defaults: role user, not banned';

  select * into p from public.profiles where id = '00000000-0000-4000-8000-00000000000b';
  assert p.display_name = 'Bojan Google', 'falls back to Google full_name';
  assert p.preferred_locale = 'mk', 'unsupported locale falls back to mk';

  select * into p from public.profiles where id = '00000000-0000-4000-8000-00000000000c';
  assert p.display_name = 'user-00000000', 'too-short email name falls back to user-<id>';

  select * into p from public.profiles where id = '00000000-0000-4000-8000-00000000000d';
  assert char_length(p.display_name) = 50, 'long names are truncated to 50 characters';
end $$;

-- Signed-in user A -------------------------------------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-00000000000a');

do $$
declare
  n int;
  p public.profiles;
begin
  -- Public columns of other users are readable.
  select count(*) into n from public.profiles
  where display_name = 'Bojan Google';
  assert n = 1, 'can read other profiles'' public columns';

  -- Private columns are not.
  begin
    perform role from public.profiles;
    raise exception 'reading role should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    perform is_banned, preferred_locale from public.profiles;
    raise exception 'reading is_banned/preferred_locale should be denied';
  exception when insufficient_privilege then null;
  end;

  -- Own full profile through current_profile().
  select * into p from public.current_profile();
  assert p.id = '00000000-0000-4000-8000-00000000000a', 'current_profile returns own row';
  assert p.role = 'user', 'current_profile includes role';
  assert (select count(*) from public.current_profile()) = 1, 'exactly one row';

  assert not private.is_admin(), 'regular user is not admin';
  assert private.can_write(), 'regular user can write';

  -- Own allowed columns can be updated.
  update public.profiles set display_name = 'Ana Updated', preferred_locale = 'mk'
  where id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  assert n = 1, 'can update own display_name and locale';

  -- Other users' rows are not affected.
  update public.profiles set display_name = 'Hacked'
  where id = '00000000-0000-4000-8000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'cannot update another user''s profile';

  -- Protected columns cannot be updated at all.
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'updating role should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set is_banned = false where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'updating is_banned should be denied';
  exception when insufficient_privilege then null;
  end;

  -- Avatar must be in the user's own folder.
  begin
    update public.profiles set avatar_path = '00000000-0000-4000-8000-00000000000b/avatar.webp'
    where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'avatar path in another user''s folder should be rejected';
  exception when check_violation then null;
  end;
  update public.profiles set avatar_path = '00000000-0000-4000-8000-00000000000a/avatar.webp'
  where id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  assert n = 1, 'avatar path in own folder is accepted';

  -- No inserts or deletes through the API.
  begin
    insert into public.profiles (id, display_name)
    values ('00000000-0000-4000-8000-0000000000ff', 'Fake');
    raise exception 'insert should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.profiles where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'delete should be denied';
  exception when insufficient_privilege then null;
  end;
end $$;

select pg_temp.logout();

-- Signed-out visitor -------------------------------------------------------------
select pg_temp.login_as_anon();

do $$
declare n int;
begin
  select count(*) into n from public.profiles where display_name = 'Bojan Google';
  assert n = 1, 'anon can read public profile columns';
  assert (select count(*) from public.current_profile()) = 0, 'anon has no current profile';
  assert not private.can_write(), 'anon cannot write';
  assert not private.is_admin(), 'anon is not admin';
  begin
    update public.profiles set display_name = 'Anon' where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'anon update should be denied';
  exception when insufficient_privilege then null;
  end;
end $$;

select pg_temp.logout();

-- Banned user ------------------------------------------------------------------------
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-00000000000a';
select pg_temp.login_as('00000000-0000-4000-8000-00000000000a');

do $$
begin
  assert not private.can_write(), 'banned user cannot write';
  begin
    update public.profiles set display_name = 'Banned Edit'
    where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'banned user profile update should be rejected';
  exception when insufficient_privilege then null; -- RLS with check violation (42501)
  end;
end $$;

select pg_temp.logout();

-- Admin ------------------------------------------------------------------------------
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-00000000000b';
select pg_temp.login_as('00000000-0000-4000-8000-00000000000b');

do $$
begin
  assert private.is_admin(), 'admin role is detected';
end $$;

select pg_temp.logout();

-- Deleting the auth user removes the profile ----------------------------------------
delete from auth.users where id = '00000000-0000-4000-8000-00000000000c';
do $$
begin
  assert not exists (
    select 1 from public.profiles where id = '00000000-0000-4000-8000-00000000000c'
  ), 'profile is deleted with the auth user';
end $$;
