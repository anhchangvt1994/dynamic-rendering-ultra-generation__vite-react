-- Pokémon evolution: pokemon_evolution_options
begin;
select plan(40);

insert into auth.users(id,email,aud,role) values
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','evo-a@example.invalid','authenticated','authenticated'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','evo-b@example.invalid','authenticated','authenticated');

-- a known set of evolution rows for the species used here
delete from public.pokemon_evolutions where from_species in (1,4,7,10,13,16,19,21,25,61,133);
insert into public.pokemon_evolutions(from_species,to_species,alt,trigger,min_level,item,min_happiness,time_of_day,gender,known_move,known_move_type,relative_stats,party_species,trade_species,location,unavailable) values
(4,5,0,'level-up',16,null,null,null,null,null,null,null,null,null,null,null),
(133,196,0,'level-up',null,null,160,'day',null,null,null,null,null,null,null,null),
(133,197,0,'level-up',null,null,160,'night',null,null,null,null,null,null,null,null),
(25,26,0,'use-item',null,'thunder-stone',null,null,null,null,null,null,null,null,null,null),
(61,62,0,'use-item',null,'water-stone',null,null,null,null,null,null,null,null,null,null),
(1,2,0,'level-up',1,null,null,null,1,null,null,null,null,null,null,null),
(1,2,1,'level-up',1,null,null,null,2,null,null,null,null,null,null,null),
(7,8,0,'level-up',null,null,null,null,null,(public.pokemon_default_moves(7::smallint,20))[1],null,null,null,null,null,null),
(7,8,1,'level-up',null,null,null,null,null,'no-such-move',null,null,null,null,null,null),
(7,8,2,'level-up',null,null,null,null,null,null,(select type from public.pokemon_moves_ref where move=(public.pokemon_default_moves(7::smallint,20))[1]),null,null,null,null,null),
(10,11,0,'level-up',1,null,null,null,null,null,null,1,null,null,null,null),
(10,11,1,'level-up',1,null,null,null,null,null,null,-1,null,null,null,null),
(10,11,2,'level-up',1,null,null,null,null,null,null,0,null,null,null,null),
(13,14,0,'level-up',1,null,null,null,null,null,null,null,null,null,'viridian-forest',null),
(13,14,1,'level-up',1,null,null,null,null,null,null,null,14,null,null,null),
(16,17,0,'level-up',1,null,null,null,null,null,null,null,null,null,null,'battle'),
(16,17,1,'level-up',1,null,null,null,null,null,null,null,null,null,null,null),
(19,20,0,'use-item',null,'linking-cord',null,null,null,null,null,null,null,25,null,null),
(21,22,0,'use-item',null,'linking-cord',null,null,null,null,null,null,null,150,null,null);
update public.pokemon_evolutions set party_type = 'fire' where from_species = 16 and alt = 1;

insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential)
select ('e1000000-0000-4000-8000-0000000000' || lpad(n::text,2,'0'))::uuid,
  case when n = 12 then 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid else 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid end,
  sp, 2,
  '{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}'::jsonb, '{"v":1,"offsets":[],"stars":1}'::jsonb
from (values (1,4),(2,4),(3,133),(4,25),(5,61),(6,1),(7,7),(8,10),(9,13),(10,16),(11,19),(12,4),(13,21)) v(n, sp);

-- care: affection = experience, so it also sets the level
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection)
select i.id, i.user_id, 60, 60, 60, now(),
  case i.pokemon_id
    when 133 then 220
    when 7 then public.pokemon_level_exp((select growth from public.pokemon_species_base where species = 7), 20)
    when 4 then public.pokemon_level_exp((select growth from public.pokemon_species_base where species = 4),
                  case when i.id = 'e1000000-0000-4000-8000-000000000001' then 12 else 16 end)
    else 0 end
from public.pokemon_individuals i where i.id::text like 'e1000000-%';

insert into public.bag(user_id,item_id,count) values
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','thunder-stone',1);

create temp table opts(k text primary key, v jsonb);
grant all on opts to authenticated;
create function pg_temp.alt(k text, to_ integer, a integer default 0) returns jsonb language sql as $$
  select x from opts, jsonb_path_query(v, '$.branches[*] ? (@.to == $t).alts[*] ? (@.alt == $a)', jsonb_build_object('t', to_, 'a', a)) x where opts.k = alt.k
$$;
create function pg_temp.br(k text, to_ integer) returns jsonb language sql as $$
  select x from opts, jsonb_path_query(v, '$.branches[*] ? (@.to == $t)', jsonb_build_object('t', to_)) x where opts.k = br.k
$$;

-- the clock
select is(public.pokemon_evolution_clock('2026-11-09 06:00+07'), 'day', '06:00 is day');
select is(public.pokemon_evolution_clock('2026-11-09 16:59+07'), 'day', '16:59 is still day');
select is(public.pokemon_evolution_clock('2026-11-09 17:00+07'), 'dusk', '17:00 is dusk');
select is(public.pokemon_evolution_clock('2026-11-09 18:00+07'), 'night', '18:00 is night');
select is(public.pokemon_evolution_clock('2026-11-09 05:59+07'), 'night', '05:59 is still night');

select is((select count(*)::int from pg_proc where proname = 'pokemon_evolution_clock' and has_function_privilege('authenticated', oid, 'execute')), 0, 'the clock is internal');
select is(has_function_privilege('anon', 'public.pokemon_evolution_options(uuid, jsonb)', 'execute'), false, 'anon cannot read options');

create or replace function public.pokemon_evolution_clock(p_now timestamptz default now())
returns text language sql stable set search_path = '' as $$ select 'day'::text $$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1","role":"authenticated"}',true);

select throws_ok($$select public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000012')$$, 'P0001', 'not_found', 'another user''s individual raises not_found');
select throws_ok($$select public.pokemon_evolution_options(gen_random_uuid())$$, 'P0001', 'not_found', 'an unknown individual raises not_found');

-- level
insert into opts select 'c12', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000001');
insert into opts select 'c16', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000002');
select is((select (v->>'level')::int from opts where k='c12'), 12, 'reports the level');
select is((select (v->>'species')::int from opts where k='c12'), 4, 'reports the species');
select is((pg_temp.br('c12', 5))->>'eligible', 'false', 'a level-16 Charmander at Lv 12 is not eligible');
select is(pg_temp.alt('c12', 5)->'reasons', '[{"code":"level","ok":false,"need":16,"have":12}]'::jsonb, 'the level reason says need 16, have 12');
select is(pg_temp.br('c16', 5)->>'eligible', 'true', 'Lv 16 is eligible');
select is(pg_temp.br('c16', 5)->>'kind', 'level', 'Lv 16 is kind level');

-- time of day
insert into opts select 'eevee-day', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000003');
select is(pg_temp.br('eevee-day', 196)->>'eligible', 'true', 'Eevee with affection 220: Espeon alt day ok by day');
select is(pg_temp.br('eevee-day', 196)->>'kind', 'friend', 'a friendship branch is kind friend');
select is(pg_temp.alt('eevee-day', 197)->'reasons', '[{"code":"affection","ok":true,"need":160,"have":220},{"code":"time","ok":false,"need":"night","have":"day"}]'::jsonb, 'Umbreon: affection met, wants night');
reset role;
create or replace function public.pokemon_evolution_clock(p_now timestamptz default now())
returns text language sql stable set search_path = '' as $$ select 'night'::text $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1","role":"authenticated"}',true);
insert into opts select 'eevee-night', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000003');
select is(pg_temp.br('eevee-night', 197)->>'eligible', 'true', 'at night Umbreon is eligible');
select is(pg_temp.br('eevee-night', 196)->>'eligible', 'false', 'at night Espeon is not');

-- items
insert into opts select 'pika', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000004');
insert into opts select 'poli', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000005');
select is(pg_temp.alt('pika', 26)->>'owned', '1', 'thunder-stone alt: owned reflects the bag count');
select is(pg_temp.alt('pika', 26)->>'ok', 'true', 'thunder-stone alt: ok');
select is(pg_temp.alt('poli', 62)->>'owned', '0', 'water-stone alt: owned 0 when absent');
select is(pg_temp.alt('poli', 62)->>'ok', 'true', 'water-stone alt: still ok without the item');
select is(pg_temp.br('poli', 62)->>'kind', 'item', 'an item branch is kind item');

-- gender
insert into opts select 'gender', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000006');
select is((select count(*)::int from jsonb_path_query((select v from opts where k='gender'), '$.branches[*].alts[*] ? (@.ok == true)')), 1, 'gender alts: exactly one matches');
select is((select count(*)::int from jsonb_path_query((select v from opts where k='gender'), '$.branches[*].alts[*].reasons[*] ? (@.code == "gender" && @.ok == false)')), 1, 'the other alt fails with reason gender');

-- moves
insert into opts select 'moves', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000007');
select is(pg_temp.alt('moves', 8, 0)->>'ok', 'true', 'known_move alt: the move is in the build moves');
select is(pg_temp.alt('moves', 8, 1)->'reasons'->0->>'code', 'move', 'known_move alt: a missing move is reason move');
select is(pg_temp.alt('moves', 8, 2)->>'ok', 'true', 'known_move_type alt: a move of that type counts');

-- relative stats
insert into opts select 'stat', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000008');
select is((select count(*)::int from jsonb_path_query((select v from opts where k='stat'), '$.branches[*].alts[*] ? (@.ok == true)')), 1, 'stat_rel alts: exactly one of Atk>Def, Atk<Def, equal');

-- location and party
insert into opts select 'where-none', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000009');
insert into opts select 'where-yes', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000009', '{"where":"viridian-forest","party":[14]}');
select is(pg_temp.alt('where-none', 14, 0)->>'ok', 'false', 'location alt is false with {}');
select is(pg_temp.alt('where-yes', 14, 0)->>'ok', 'true', 'location alt is true with where');
select is(pg_temp.alt('where-none', 14, 1)->>'ok', 'false', 'party_species alt is false with {}');
select is(pg_temp.alt('where-yes', 14, 1)->>'ok', 'true', 'party_species alt is true with the party');

-- unavailable
insert into opts select 'unav', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000010', '{"where":"x","party":[]}');
select is(pg_temp.alt('unav', 17, 0)->>'ok', 'false', 'unavailable alts never eligible');
select is(pg_temp.alt('unav', 17, 0)->'reasons' @> '[{"code":"unavailable","ok":false}]', true, 'unavailable carries its reason');
select is(pg_temp.alt('unav', 17, 1)->>'unavailable', 'other', 'party_type alts are unavailable in v1');

-- trade
insert into opts select 'trade-yes', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000011');
insert into opts select 'trade-no', public.pokemon_evolution_options('e1000000-0000-4000-8000-000000000013');
select is(pg_temp.alt('trade-yes', 20)->>'ok', 'true', 'trade_species alt: the user owns that species');
select is(pg_temp.alt('trade-no', 22)->>'ok', 'false', 'trade_species alt: the user does not own that species');

select * from finish();
rollback;
