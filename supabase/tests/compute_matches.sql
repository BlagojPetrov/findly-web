-- Tests for compute_matches() and its triggers (§14): new reports are
-- matched automatically, edits recompute, dismissed and confirmed matches are
-- kept, unrelated reports produce nothing, at most 10 suggested matches are
-- kept per computed item.
--
-- Test items lie around 11–14° N 11° E, far from any real report. Items
-- inserted as the test runner have created_at = now(), so each user stays
-- under the daily limit (20).

-- Users: A (lost items), B and C (found items).
select pg_temp.create_user('00000000-0000-4000-8000-0000000000aa', 'cm-a@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000ba', 'cm-b@example.com');
select pg_temp.create_user('00000000-0000-4000-8000-0000000000ca', 'cm-c@example.com');

create temporary table t_ids as
select
  (select id from public.categories where slug = 'keys') as keys_id,
  (select id from public.categories where slug = 'wallet') as wallet_id,
  (now() at time zone 'Europe/Skopje')::date as today;
grant select on t_ids to authenticated;

-- 1. Reports created by users through create_item() -------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000aa');
select public.create_item(
  'lost', 'Изгубени клучеви од кола', 'Црн привезок со два клуча и далечински за Голф.',
  (select keys_id from t_ids), (select today - 10 from t_ids), 11.0, 11.0,
  item_id => '47000000-0000-4000-8000-000000000001');

do $$
begin
  assert (select count(*) from public.matches) = 0, 'a lost report alone has no matches';
end;
$$;

select pg_temp.login_as('00000000-0000-4000-8000-0000000000ba');
select public.create_item(
  'found', 'Najdeni klucevi', 'Crn privezok so dva kluca i dalecinski za Golf.',
  (select keys_id from t_ids), (select today - 9 from t_ids), 11.009, 11.0,
  item_id => '47000000-0000-4000-8000-000000000002');

do $$
declare
  m public.matches;
begin
  assert (select count(*) from public.matches) = 1, 'creating the found report creates one match';
  select * into m from public.matches;
  assert m.lost_item_id = '47000000-0000-4000-8000-000000000001'
    and m.found_item_id = '47000000-0000-4000-8000-000000000002', 'the pair is lost ↔ found';
  assert m.status = 'suggested', 'a new match is suggested';
  assert m.score between 0.85 and 0.95, 'the clear match scores high: ' || m.score;
  assert m.breakdown ->> 'version' = 'v1' and (m.breakdown ->> 'days_between')::int = 1,
    'the breakdown comes from match_score()';
end;
$$;

select pg_temp.login_as('00000000-0000-4000-8000-0000000000aa');

do $$
begin
  assert (select count(*) from public.matches) = 1, 'the owner of the lost report sees the match';
end;
$$;

-- Unrelated reports: another category (C), same owner (A), far away (C).
select public.create_item(
  'found', 'Najdeni klucevi', 'Crn privezok so dva kluca i dalecinski za Golf.',
  (select keys_id from t_ids), (select today - 9 from t_ids), 11.009, 11.0,
  item_id => '47000000-0000-4000-8000-000000000003');
select pg_temp.login_as('00000000-0000-4000-8000-0000000000ca');
select public.create_item(
  'found', 'Najden paricnik', 'Crn kozen paricnik so dokumenti.',
  (select wallet_id from t_ids), (select today - 9 from t_ids), 11.009, 11.0,
  item_id => '47000000-0000-4000-8000-000000000004');
select public.create_item(
  'found', 'Najdeni klucevi', 'Crn privezok so dva kluca i dalecinski za Golf.',
  (select keys_id from t_ids), (select today - 9 from t_ids), 11.6, 11.0,
  item_id => '47000000-0000-4000-8000-000000000005');
select pg_temp.logout();

do $$
begin
  assert (select count(*) from public.matches
    where '47000000-0000-4000-8000-000000000001' in (lost_item_id, found_item_id)) = 1,
    'another category, the same owner and ~66 km away give no match';
  assert not exists (
    select 1 from public.matches
    where found_item_id in ('47000000-0000-4000-8000-000000000003',
      '47000000-0000-4000-8000-000000000004', '47000000-0000-4000-8000-000000000005')
  ), 'no rows for the unrelated reports';
end;
$$;

-- 2. Edits recompute ---------------------------------------------------------
-- now() is fixed within the test transaction, so the match's updated_at is
-- moved into the past first (with the updated_at trigger off) to see whether
-- a later statement touches the row. t_before keeps the row as it was.
select pg_temp.logout();
alter table public.matches disable trigger matches_set_updated_at;
update public.matches set updated_at = timestamptz '2001-01-01 00:00+00';
alter table public.matches enable trigger matches_set_updated_at;
create temporary table t_before as select * from public.matches
where lost_item_id = '47000000-0000-4000-8000-000000000001';
grant select on t_before to authenticated;

-- Not a matching column (location_name) and an unchanged title: no change.
select pg_temp.login_as('00000000-0000-4000-8000-0000000000ba');
update public.items set location_name = 'Парк', title = title
where id = '47000000-0000-4000-8000-000000000002';

do $$
begin
  assert (select updated_at from public.matches where lost_item_id = '47000000-0000-4000-8000-000000000001')
    = (select updated_at from t_before), 'other columns do not touch the match';
end;
$$;

-- A new description changes the score and the shared words, not the row.
update public.items set description = 'Sreden privezok so zolt natpis.'
where id = '47000000-0000-4000-8000-000000000002';

do $$
declare
  m public.matches;
  b public.matches;
begin
  select * into b from t_before;
  select * into m from public.matches where lost_item_id = '47000000-0000-4000-8000-000000000001';
  assert m.id = b.id and m.created_at = b.created_at, 'the match keeps its id and created_at';
  assert m.score < b.score, 'fewer shared words lower the score';
  assert m.breakdown -> 'shared_words' <> b.breakdown -> 'shared_words', 'shared words recomputed';
  assert m.updated_at > b.updated_at, 'updated_at is refreshed';
end;
$$;

-- Another category: no longer a candidate, the suggested row is deleted.
update public.items set category_id = (select wallet_id from t_ids)
where id = '47000000-0000-4000-8000-000000000002';

do $$
begin
  assert not exists (select 1 from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000001'), 'the match is removed';
end;
$$;

update public.items
set category_id = (select keys_id from t_ids),
    description = 'Crn privezok so dva kluca i dalecinski za Golf.'
where id = '47000000-0000-4000-8000-000000000002';

do $$
begin
  assert (select count(*) from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000001') = 1,
    'back in the category: matched again';
end;
$$;

-- 3. Dismissed and confirmed matches are kept -------------------------------
select pg_temp.login_as('00000000-0000-4000-8000-0000000000aa');
update public.matches set status = 'dismissed'
where lost_item_id = '47000000-0000-4000-8000-000000000001';
select pg_temp.logout();
alter table public.matches disable trigger matches_set_updated_at;
update public.matches set updated_at = timestamptz '2001-01-01 00:00+00';
alter table public.matches enable trigger matches_set_updated_at;
delete from t_before;
insert into t_before select * from public.matches
where lost_item_id = '47000000-0000-4000-8000-000000000001';

select pg_temp.login_as('00000000-0000-4000-8000-0000000000aa');
update public.items set title = 'Изгубени клучеви'
where id = '47000000-0000-4000-8000-000000000001';
select pg_temp.login_as('00000000-0000-4000-8000-0000000000ba');
update public.items set description = 'Crn privezok so dva kluca.'
where id = '47000000-0000-4000-8000-000000000002';

do $$
declare
  m public.matches;
begin
  assert (select count(*) from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000001') = 1,
    'a dismissed match is not recreated';
  select * into m from public.matches where lost_item_id = '47000000-0000-4000-8000-000000000001';
  assert m.status = 'dismissed', 'it stays dismissed after edits on both sides';
  assert m.score = (select score from t_before) and m.updated_at = (select updated_at from t_before),
    'a dismissed match is not rescored';
end;
$$;

update public.matches set status = 'confirmed'
where lost_item_id = '47000000-0000-4000-8000-000000000001';
update public.items set description = 'Crn privezok so dva kluca i dalecinski.'
where id = '47000000-0000-4000-8000-000000000002';

do $$
begin
  assert (select status from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000001') = 'confirmed',
    'a confirmed match is kept';
end;
$$;

select pg_temp.logout();

-- 4. Found first, then lost; resolving and reopening -------------------------
insert into public.items
  (id, user_id, type, title, description, category_id, occurred_on, location)
values ('47000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-0000000000ba',
  'found', 'Najden telefon', 'Crn Samsung telefon so puknat ekran.',
  (select id from public.categories where slug = 'electronics'), date '2001-06-02',
  extensions.st_setsrid(extensions.st_makepoint(11, 13.005), 4326)::extensions.geography);
insert into public.items
  (id, user_id, type, title, description, category_id, occurred_on, location)
values ('47000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-0000000000aa',
  'lost', 'Izgubiv telefon', 'Crn Samsung telefon, puknat ekran.',
  (select id from public.categories where slug = 'electronics'), date '2001-06-01',
  extensions.st_setsrid(extensions.st_makepoint(11, 13), 4326)::extensions.geography);

do $$
begin
  assert (select count(*) from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000011'
      and found_item_id = '47000000-0000-4000-8000-000000000012'
      and status = 'suggested') = 1, 'a lost report is matched with an earlier found one';
end;
$$;

update public.items set status = 'resolved' where id = '47000000-0000-4000-8000-000000000011';

do $$
begin
  assert exists (select 1 from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000011'),
    'resolving leaves the suggested match in place';
end;
$$;

update public.items set title = 'Najden mobilen telefon'
where id = '47000000-0000-4000-8000-000000000012';

do $$
begin
  assert not exists (select 1 from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000011'),
    'recomputing the other item drops the pair with the resolved report';
end;
$$;

update public.items set status = 'active' where id = '47000000-0000-4000-8000-000000000011';

do $$
begin
  assert exists (select 1 from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000011' and status = 'suggested'),
    'reopening the report matches it again';
end;
$$;

-- 5. At most 10 suggested matches per computed item -------------------------
-- L3 (A) and twelve identical found reports (B), 0–11 × ~1.1 km north of it.
insert into public.items
  (id, user_id, type, title, description, category_id, occurred_on, location)
values ('47000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-0000000000aa',
  'lost', 'Izgubena cadena', 'Plava cadena so bel natpis.',
  (select id from public.categories where slug = 'accessories'), date '2001-06-01',
  extensions.st_setsrid(extensions.st_makepoint(11, 14), 4326)::extensions.geography);

insert into public.items
  (id, user_id, type, title, description, category_id, occurred_on, location)
select ('47000000-0000-4000-8000-0000000000' || (30 + n))::uuid,
  '00000000-0000-4000-8000-0000000000ba', 'found', 'Najdena cadena',
  'Plava cadena so bel natpis.', (select id from public.categories where slug = 'accessories'),
  date '2001-06-02',
  extensions.st_setsrid(extensions.st_makepoint(11, 14 + n * 0.01), 4326)::extensions.geography
from generate_series(0, 11) as n;

do $$
begin
  assert (select count(*) from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000020') = 12,
    'each found report added its match to L3';
end;
$$;

-- Recomputing L3 keeps its 10 best (the two farthest go).
update public.items set description = 'Plava cadena so bel natpis, mala.'
where id = '47000000-0000-4000-8000-000000000020';

do $$
begin
  assert (select count(*) from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000020') = 10, 'top 10 kept';
  assert not exists (select 1 from public.matches
    where found_item_id in ('47000000-0000-4000-8000-000000000040',
      '47000000-0000-4000-8000-000000000041')), 'the two lowest scores are removed';
end;
$$;

-- A dismissed match does not take one of the 10 places.
update public.matches set status = 'dismissed'
where found_item_id = '47000000-0000-4000-8000-000000000030';
update public.items set description = 'Plava cadena so bel natpis.'
where id = '47000000-0000-4000-8000-000000000020';

do $$
begin
  assert (select count(*) from public.matches
    where lost_item_id = '47000000-0000-4000-8000-000000000020' and status = 'suggested') = 10,
    'still 10 suggested next to the dismissed one';
  assert exists (select 1 from public.matches
    where found_item_id = '47000000-0000-4000-8000-000000000040' and status = 'suggested'),
    'the 11th best moves up';
end;
$$;

-- 6. Users cannot run the matching functions ---------------------------------
do $$
begin
  assert not has_function_privilege('authenticated', 'private.compute_matches(uuid)', 'execute'),
    'authenticated cannot execute compute_matches';
  assert not has_function_privilege('anon', 'private.compute_matches(uuid)', 'execute'),
    'anon cannot execute compute_matches';
  assert not has_function_privilege('authenticated', 'private.items_compute_matches()', 'execute'),
    'authenticated cannot execute the trigger function';
end;
$$;
