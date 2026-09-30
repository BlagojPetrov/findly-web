-- Demo dataset for matching (P6.S6, §14): realistic Macedonian lost/found
-- reports with known true pairs and hard distractors (same category, nearby,
-- same days). Used to tune the weights (supabase/seed/demo-evaluation.sql)
-- and for demonstrations.
--
-- Run:  npx supabase db query --linked -f supabase/seed/demo.sql
-- It first removes the previous demo data, so it can be run again. Remove
-- it with:
--   delete from auth.users where email like 'demo-%@findly.test';
-- (profiles, items and matches go with the users; the demo items have no
-- photos). The demo users have no password and cannot sign in.
--
-- Ids: users de000000-…-0000000000NN; items de100000-…-000000000KNN with
-- K = 1 lost report of pair NN, 2 its true found report, 3 a found
-- distractor, 4 a lost report without a true pair, 5 a found report without
-- one. Dates are relative to today (Europe/Skopje), so the set stays valid.
-- Places are in Skopje, Bitola, Ohrid/Struga, Kumanovo and Tetovo, more
-- than 50 km from the real reports (Kavadarci), so they never meet them.

delete from auth.users where email like 'demo-%@findly.test';

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token)
select '00000000-0000-0000-0000-000000000000',
  ('de000000-0000-4000-8000-0000000000' || v.n)::uuid, 'authenticated',
  'authenticated', 'demo-' || v.login || '@findly.test', now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('display_name', v.name, 'locale', 'mk'),
  now() - interval '60 days', now() - interval '60 days', '', '', '', '', '', ''
from (values
  ('01', 'ana', 'Ана Стојанова'),
  ('02', 'marko', 'Марко Петровски'),
  ('03', 'elena', 'Елена Николовска'),
  ('04', 'petar', 'Петар Јовановски'),
  ('05', 'ivana', 'Ивана Трајкова'),
  ('06', 'sara', 'Сара Илиевска'),
  ('07', 'goran', 'Горан Димитриевски'),
  ('08', 'vesna', 'Весна Талевска'),
  ('09', 'bojan', 'Бојан Нестороски'),
  ('10', 'nikola', 'Никола Ристовски'),
  ('11', 'maja', 'Маја Талеска'),
  ('12', 'dragan', 'Драган Митевски'),
  ('13', 'arben', 'Арбен Салиу'),
  ('14', 'arta', 'Арта Мехмети')
) as v (n, login, name);

insert into public.items
  (id, user_id, type, title, description, category_id, occurred_on,
   location, location_name, created_at)
select ('de100000-0000-4000-8000-000000000' || v.k)::uuid,
  ('de000000-0000-4000-8000-0000000000' || v.owner)::uuid,
  v.type::public.item_type, v.title, v.description,
  (select c.id from public.categories c where c.slug = v.category),
  (now() at time zone 'Europe/Skopje')::date - v.days_ago,
  extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
  v.place,
  -- Reported a few hours after it happened (never in the future).
  least(now(), ((now() at time zone 'Europe/Skopje')::date - v.days_ago
    + time '18:00') at time zone 'Europe/Skopje')
from (values
  -- 01 Wallet, Skopje centre. Distractors: other wallets nearby.
  ('101', '01', 'lost', 'wallet', 5, 41.9961, 21.4316, 'Плоштад Македонија, Скопје',
   'Изгубен црн кожен паричник',
   'Црн машки кожен паричник со лична карта, возачка дозвола и две банкарски картички. Изгубен кај плоштадот Македонија.'),
  ('201', '02', 'found', 'wallet', 4, 41.9975, 21.4320, 'Плоштад Македонија, Скопје',
   'Najden crn paricnik',
   'Crn kozen paricnik so licna karta i vozacka dozvola, najden na klupa kaj Plostad Makedonija.'),
  ('301', '03', 'found', 'wallet', 5, 41.9855, 21.4665, 'Аеродром, Скопје',
   'Пронајден кафеав паричник',
   'Кафеав женски паричник со картичка за градски превоз и малку ситни пари, најден во автобус кај Аеродром.'),
  ('302', '04', 'found', 'wallet', 3, 42.0005, 21.4378, 'Стара чаршија, Скопје',
   'Najden crven paricnik',
   'Mal crven zenski paricnik bez dokumenti, najden vo Stara carsija kaj Bezisten.'),

  -- 02 iPhone, City park. Distractor: another phone in the centre.
  ('102', '05', 'lost', 'electronics', 2, 42.0045, 21.4140, 'Градски парк, Скопје',
   'Изгубен iPhone 13 со сина маска',
   'Изгубив iPhone 13, сина силиконска маска, на заклучениот екран има слика од море. Најверојатно во Градскиот парк кај езерцето.'),
  ('202', '02', 'found', 'electronics', 2, 42.0035, 21.4150, 'Градски парк, Скопје',
   'Пронајден мобилен телефон iPhone',
   'Најдов iPhone во сина маска на трева во Градски парк, до езерцето. Батеријата е празна.'),
  ('303', '03', 'found', 'electronics', 1, 41.9935, 21.4260, 'Центар, Скопје',
   'Najden Samsung telefon',
   'Samsung Galaxy A52 so crna maska i puknat ekran, najden vo taksi kaj Ramstor.'),

  -- 03 Car keys, Aerodrom. Distractors: flat keys in Kisela Voda, a
  -- mailbox key in Čair.
  ('103', '04', 'lost', 'keys', 7, 41.9855, 21.4665, 'Аеродром, Скопје',
   'Изгубени клучеви од кола Фолксваген',
   'Клучеви од Фолксваген Голф со далечински и метален привезок во облик на топка, изгубени на паркинг кај Аеродром.'),
  ('203', '06', 'found', 'keys', 6, 41.9880, 21.4640, 'Аеродром, Скопје',
   'Najdeni klucevi od avtomobil VW',
   'Klucevi so dalecinski za Volkswagen Golf i metalen privezok, najdeni na parking kaj Aerodrom.'),
  ('304', '02', 'found', 'keys', 7, 41.9795, 21.4420, 'Кисела Вода, Скопје',
   'Пронајдени клучеви од стан',
   'Три клучеви од стан на црвен привезок, најдени пред зграда во Кисела Вода.'),
  ('501', '03', 'found', 'keys', 2, 42.0140, 21.4430, 'Чаир, Скопје',
   'Пронајден клуч од поштенско сандаче',
   'Мал клуч од поштенско сандаче, најден на тротоар во Чаир.'),

  -- 04 Dog, Karpoš. Distractors: a cat nearby, a large dog in the centre.
  ('104', '01', 'lost', 'pets', 3, 42.0060, 21.3950, 'Карпош 4, Скопје',
   'Изгубено куче малтезер',
   'Мало бело куче, малтезер, женско, одговара на името Бела. Има розова огрлица. Избега во Карпош 4.'),
  ('204', '07', 'found', 'pets', 2, 42.0040, 21.3900, 'Сити Мол, Скопје',
   'Najdeno malo belo kuce',
   'Najdeno malo belo kuce so roza ogrlica, maltezer, se dvizese okolu City Mall vo Karpos.'),
  ('305', '06', 'found', 'pets', 3, 42.0070, 21.3980, 'Карпош, Скопје',
   'Пронајдена сива мачка',
   'Сива мачка со бели шепи, многу мирна, најдена во влез од зграда во Карпош.'),
  ('306', '03', 'found', 'pets', 1, 41.9980, 21.4250, 'Кеј на Вардар, Скопје',
   'Najdeno golemo kuce',
   'Golemo kafeavo kuce, germanski ovcar, bez ogrlica, najdeno vo Centar kaj Kej na Vardar.'),

  -- 05 Passport, Old Bazaar. Distractors: a student card, an ID card.
  ('105', '07', 'lost', 'documents', 10, 42.0005, 21.4378, 'Стара чаршија, Скопје',
   'Изгубен пасош',
   'Изгубен пасош во сина пластична папка заедно со возачка дозвола. Изгубен во Старата чаршија.'),
  ('205', '05', 'found', 'documents', 8, 42.0012, 21.4385, 'Стара чаршија, Скопје',
   'Пронајдени документи во сина папка',
   'Сина папка со пасош и возачка дозвола, најдена на маса во кафуле во Старата чаршија.'),
  ('307', '04', 'found', 'documents', 9, 42.0048, 21.4090, 'Технички факултети, Скопје',
   'Najden studentski indeks',
   'Studentski indeks od Pravniot fakultet, najden kaj Tehnickite fakulteti.'),
  ('502', '06', 'found', 'documents', 3, 41.9795, 21.4420, 'Кисела Вода, Скопје',
   'Najdena licna karta',
   'Licna karta na ime Dejan, najdena na avtobuska postojka vo Kisela Voda.'),

  -- 06 Backpack; the finder chose "other".
  ('106', '06', 'lost', 'accessories', 4, 41.9905, 21.4460, 'Автобуска станица, Скопје',
   'Изгубен црн ранец Nike',
   'Црн ранец Nike со лаптоп Lenovo и полнач внатре. Заборавен на клупа на главната автобуска станица.'),
  ('206', '01', 'found', 'other', 4, 41.9910, 21.4455, 'Автобуска станица, Скопје',
   'Najden ranec so laptop',
   'Crn ranec Nike so laptop vo nego, ostaven na klupa na avtobuskata stanica.'),

  -- 07 Winter jacket, university. Distractor: a scarf.
  ('107', '03', 'lost', 'clothing', 12, 42.0048, 21.4090, 'Технички факултети, Скопје',
   'Изгубена зимска јакна',
   'Темно сина зимска јакна North Face, машка, големина L, заборавена во амфитеатар на Техничките факултети.'),
  ('207', '07', 'found', 'clothing', 11, 42.0050, 21.4095, 'Технички факултети, Скопје',
   'Najdena teget jakna North Face',
   'Teget zimska jakna North Face golemina L, ostavena vo amfiteatar, predadena kaj portirot.'),
  ('308', '05', 'found', 'clothing', 12, 42.0040, 21.3900, 'Карпош, Скопје',
   'Пронајден црвен шал',
   'Црвен волнен шал, најден во градски автобус на линија 5 кај Карпош.'),

  -- 08 Earbuds, City Mall. Distractor: other headphones in the park.
  ('108', '02', 'lost', 'electronics', 1, 42.0040, 21.3900, 'Сити Мол, Скопје',
   'Изгубени AirPods слушалки',
   'Бели Apple AirPods Pro во кутија со проѕирна маска, изгубени во City Mall кај кино салите.'),
  ('208', '04', 'found', 'electronics', 0, 42.0042, 21.3905, 'Сити Мол, Скопје',
   'Најдени безжични слушалки AirPods',
   'Слушалки AirPods Pro во бела кутија, најдени на седиште во кино во City Mall.'),
  ('309', '06', 'found', 'electronics', 1, 42.0045, 21.4140, 'Градски парк, Скопје',
   'Najdeni slusalki Sony',
   'Crni Sony slusalki so kabel, najdeni vo Gradski park na klupa.'),

  -- 09 Watch and 10 glasses, Bitola: each other's distractors (same
  -- category, a few hundred metres, a few days), plus a handbag.
  ('109', '08', 'lost', 'accessories', 6, 41.0311, 21.3347, 'Широк сокак, Битола',
   'Изгубен рачен часовник Casio',
   'Сребрен машки часовник Casio со метален ремен, изгубен на Широк сокак.'),
  ('209', '09', 'found', 'accessories', 5, 41.0322, 21.3350, 'Широк сокак, Битола',
   'Najden srebren casovnik',
   'Srebren casovnik Casio so metalen remen, najden kaj Sirok sokak pred kafeana.'),
  ('110', '09', 'lost', 'accessories', 3, 41.0265, 21.3340, 'Градски парк, Битола',
   'Изгубени диоптриски очила',
   'Очила со црна пластична рамка во сина футрола, изгубени во паркот.'),
  ('210', '08', 'found', 'accessories', 3, 41.0270, 21.3335, 'Градски парк, Битола',
   'Najdeni naocari vo futrola',
   'Dioptriski naocari so crna ramka vo sina futrola, najdeni na klupa vo Gradskiot park vo Bitola.'),
  ('310', '08', 'found', 'accessories', 4, 41.0350, 21.3370, 'Безистен, Битола',
   'Пронајдена женска чанта',
   'Црна женска чанта со клучеви и шминка, најдена кај Безистен.'),

  -- 11 Camera, Ohrid harbour. Distractor: a phone on a Struga beach.
  ('111', '10', 'lost', 'electronics', 20, 41.1115, 20.7985, 'Пристаниште, Охрид',
   'Изгубен фотоапарат Canon',
   'Црн фотоапарат Canon EOS со објектив 18-55 во сива торбичка, оставен на клупа на пристаништето.'),
  ('211', '11', 'found', 'electronics', 18, 41.1130, 20.7995, 'Пристаниште, Охрид',
   'Najden fotoaparat',
   'Fotoaparat Canon vo siva torbicka, najden na pristanisteto vo Ohrid, predaden vo turistickiot info centar.'),
  ('311', '11', 'found', 'electronics', 19, 41.1780, 20.6780, 'Градска плажа, Струга',
   'Пронајден мобилен телефон',
   'Црн Xiaomi телефон, најден на плажа во Струга.'),

  -- 12 Ring, Ohrid beach: found four weeks later.
  ('112', '11', 'lost', 'accessories', 30, 41.1100, 20.8050, 'Градска плажа, Охрид',
   'Изгубен златен прстен',
   'Златен венчален прстен со гравура „М и Н 2015“, изгубен на градската плажа во Охрид.'),
  ('212', '07', 'found', 'accessories', 2, 41.1105, 20.8060, 'Градска плажа, Охрид',
   'Najden zlaten prsten',
   'Zlaten prsten so gravura, najden vo pesokot na gradskata plaza vo Ohrid pri cistenje.'),

  -- 13 Laptop left on the Skopje–Kumanovo bus: found ~30 km away.
  ('113', '04', 'lost', 'electronics', 5, 41.9905, 21.4460, 'Автобуска станица, Скопје',
   'Изгубен лаптоп Dell',
   'Сив лаптоп Dell Latitude во црна чанта, заборавен во меѓуградски автобус Скопје–Куманово.'),
  ('213', '12', 'found', 'electronics', 5, 42.1322, 21.7144, 'Автобуска станица, Куманово',
   'Najden laptop vo avtobus',
   'Siv laptop Dell vo crna torba, ostaven vo avtobusot od Skopje, predaden na avtobuskata vo Kumanovo.'),

  -- 14 Cat, Tetovo: found ~3 km away two days later.
  ('114', '13', 'lost', 'pets', 6, 42.0106, 20.9714, 'Центар, Тетово',
   'Изгубена мачка Мици',
   'Рижава мачка со бела граба, машка, има црна огрлица со ѕвонче. Избега од дома во Тетово.'),
  ('214', '14', 'found', 'pets', 4, 42.0350, 20.9900, 'Порој, Тетово',
   'Najdena rizava macka',
   'Rizava macka so crna ogrlica i dzvonce, najdena vo selo Poroj kaj Tetovo.'),

  -- Lost reports without a true pair.
  ('401', '05', 'lost', 'other', 2, 41.9935, 21.4260, 'Центар, Скопје',
   'Изгубен чадор',
   'Црн чадор на расклопување со дрвена рачка, заборавен во кафуле во Центар.'),
  ('402', '07', 'lost', 'pets', 1, 41.9855, 21.4665, 'Аеродром, Скопје',
   'Изгубен папагал',
   'Зелен брановиден папагал, одлета од балкон во Аеродром.'),
  ('403', '12', 'lost', 'wallet', 3, 42.1322, 21.7144, 'Зелен пазар, Куманово',
   'Изгубен кафеав паричник',
   'Кафеав паричник со пари и картички, изгубен на зелениот пазар во Куманово.')
) as v (k, owner, type, category, days_ago, lat, lng, place, title, description);
