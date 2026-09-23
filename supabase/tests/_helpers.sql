-- Shared helpers for SQL tests. Prepended to every test file by
-- scripts/db-test.mjs; the whole run happens in a transaction that is always
-- rolled back, so nothing here (or in the tests) is ever committed.

-- Creates an auth user (the on_auth_user_created trigger creates the profile).
create function pg_temp.create_user(user_id uuid, email text, meta jsonb default '{}')
returns uuid
language sql
as $$
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (user_id, email, meta, 'authenticated', 'authenticated')
  returning id;
$$;

-- Acts as the given user for the following statements (like a request with
-- that user's JWT).
create function pg_temp.login_as(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

-- Acts as a signed-out visitor.
create function pg_temp.login_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end;
$$;

-- Back to the test runner's own role (postgres).
create function pg_temp.logout()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'reset role';
end;
$$;
