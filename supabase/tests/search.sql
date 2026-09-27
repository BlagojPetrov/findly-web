-- Tests for text normalization and the search columns on items.

-- normalize_text(): Cyrillic, Latin with and without diacritics, digraphs.
do $$
declare
  n text := private.normalize_text('Црн Паричник');
begin
  assert n = 'crn paricnik', format('Cyrillic is transliterated, got %s', n);
  assert private.normalize_text('crn paricnik') = n, 'plain Latin';
  assert private.normalize_text('Crn Paričnik') = n, 'Latin with diacritics';
  assert private.normalize_text('CRN PARICHNIK') = n, 'upper case, ch digraph';

  assert private.normalize_text('Ѓорѓи') = private.normalize_text('Gjorgji'), 'ѓ = gj';
  assert private.normalize_text('Ѓорѓи') = private.normalize_text('Ǵorǵi'), 'ѓ = ǵ';
  assert private.normalize_text('Ќеса') = private.normalize_text('kjesa'), 'ќ = kj';
  assert private.normalize_text('Ќеса') = private.normalize_text('Ḱesa'), 'ќ = ḱ';
  assert private.normalize_text('Џеб') = private.normalize_text('džeb'), 'џ = dž';
  assert private.normalize_text('Џеб') = private.normalize_text('dzheb'), 'џ = dzh';
  assert private.normalize_text('Ѕвезда') = 'dzvezda', 'ѕ = dz';
  assert private.normalize_text('Жолт шал') = private.normalize_text('zholt shal'), 'ж, ш';
  assert private.normalize_text('Жолт шал') = private.normalize_text('Žolt šal'), 'ž, š';
  assert private.normalize_text('Љубов Њива') = 'ljubov njiva', 'љ, њ';
  assert private.normalize_text('Ѐ Ѝ') = 'e i', 'ѐ, ѝ';

  assert private.normalize_text('  Nike, Air-Max!  (42)  ') = 'nike air max 42',
    'punctuation and whitespace become single spaces';
  assert private.normalize_text('') = '', 'empty text';
  assert private.normalize_text(null) is null, 'null stays null';
end;
$$;

-- Everyone can normalize (search_items() runs as the caller).
select pg_temp.login_as_anon();
do $$
begin
  assert private.normalize_text('Телефон') = 'telefon', 'anon can call normalize_text';
end;
$$;
select pg_temp.logout();

-- Items: search_text is maintained by the trigger.
select pg_temp.create_user('00000000-0000-4000-8000-0000000000a4', 'search-a@example.com');
select pg_temp.login_as('00000000-0000-4000-8000-0000000000a4');

select public.create_item(
  type => 'lost', title => 'Црн кожен паричник',
  description => 'Паричник со лична карта и картички.',
  category_id => 1::smallint, occurred_on => current_date - 1,
  location_name => 'Градски парк, Скопје',
  item_id => '41000000-0000-4000-8000-000000000001');
select public.create_item(
  type => 'found', title => 'Клучеви од стан',
  description => 'Три клуча на црвен привезок.',
  category_id => 1::smallint, occurred_on => current_date - 1,
  item_id => '41000000-0000-4000-8000-000000000002');
select public.create_item(
  type => 'lost', title => 'Samsung telefon',
  description => 'Crn Samsung Galaxy so pukanato staklo.',
  category_id => 1::smallint, occurred_on => current_date - 1,
  item_id => '41000000-0000-4000-8000-000000000003');

do $$
declare
  wallet uuid := '41000000-0000-4000-8000-000000000001';
  keys uuid := '41000000-0000-4000-8000-000000000002';
  phone uuid := '41000000-0000-4000-8000-000000000003';
  i public.items;
  best uuid;
  score real;
begin
  select * into i from public.items where id = wallet;
  assert i.search_text =
    'crn kozen paricnik paricnik so licna karta i karticki gradski park skopje',
    format('search_text on insert, got %s', i.search_text);

  -- Whole words, in any script or case.
  assert i.search_vector @@ websearch_to_tsquery('simple', private.normalize_text('ПАРИЧНИК')),
    'full-text match with a Cyrillic query';
  assert i.search_vector @@ websearch_to_tsquery('simple', private.normalize_text('paričnik skopje')),
    'full-text match with a Latin query (description and place)';
  assert not i.search_vector @@ websearch_to_tsquery('simple', private.normalize_text('telefon')),
    'no match for a word the item does not have';

  -- Typos: the wallet ranks first and passes the 0.4 threshold (§12).
  select id, extensions.word_similarity(private.normalize_text('parichnk'), search_text)
    into best, score
    from public.items
    where id in (wallet, keys, phone)
    order by 2 desc
    limit 1;
  assert best = wallet and score > 0.4,
    format('typo "parichnk" ranks the wallet first (%s, %s)', best, score);

  select id into best
    from public.items
    where id in (wallet, keys, phone)
    order by extensions.word_similarity(private.normalize_text('клучви'), search_text) desc
    limit 1;
  assert best = keys, 'Cyrillic typo "клучви" ranks the keys first';

  select id into best
    from public.items
    where id in (wallet, keys, phone)
    order by extensions.word_similarity(private.normalize_text('телефн самсунг'), search_text) desc
    limit 1;
  assert best = phone, 'Cyrillic typo query finds the Latin item';
end;
$$;

-- Editing the text updates search_text; other changes keep it.
select public.update_item(
  item_id => '41000000-0000-4000-8000-000000000002', type => 'found',
  title => 'Клучеви од автомобил', description => 'Клуч од Škoda со привезок.',
  category_id => 1::smallint, occurred_on => current_date - 1,
  location_name => 'Аеродром');

update public.items set status = 'resolved'
where id = '41000000-0000-4000-8000-000000000002';

do $$
declare
  i public.items;
begin
  select * into i from public.items where id = '41000000-0000-4000-8000-000000000002';
  assert i.search_text = 'klucevi od avtomobil kluc od skoda so privezok aerodrom',
    format('search_text on update, got %s', i.search_text);
  assert i.search_vector @@ websearch_to_tsquery('simple', 'skoda'),
    'search_vector follows search_text';
end;
$$;

-- Users cannot write search_text themselves.
do $$
begin
  begin
    update public.items set search_text = 'spam'
    where id = '41000000-0000-4000-8000-000000000001';
    assert false, 'updating search_text directly must fail';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select pg_temp.logout();

-- Indexes exist.
do $$
begin
  assert exists (select 1 from pg_indexes where indexname = 'items_search_vector_idx'),
    'GIN index on search_vector';
  assert exists (select 1 from pg_indexes where indexname = 'items_search_text_trgm_idx'),
    'trigram index on search_text';
end;
$$;
