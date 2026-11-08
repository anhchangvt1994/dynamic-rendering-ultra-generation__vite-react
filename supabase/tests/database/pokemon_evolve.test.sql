-- Pokémon evolution: pokemon_evolve
begin;
select plan(31);

insert into auth.users(id,email,aud,role) values
('cccccccc-cccc-4ccc-8ccc-ccccccccccc1','evolve-a@example.invalid','authenticated','authenticated'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc2','evolve-b@example.invalid','authenticated','authenticated');

insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential,nickname)
select ('e2000000-0000-4000-8000-0000000000' || lpad(n::text,2,'0'))::uuid,
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid, sp, 2,
  '{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}'::jsonb, '{"v":1,"offsets":[],"stars":1}'::jsonb,
  case when n = 1 then 'Blaze' end
from (values (1,4),(2,4),(3,133),(4,133),(5,133),(6,4),(7,4)) v(n, sp);

-- affection is experience: Charmander at Lv 16 (1, 6, 7) or Lv 12 (2)
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection)
select i.id, i.user_id, 60, 60, 60, now(),
  case when i.pokemon_id = 4 then public.pokemon_level_exp('medium-slow', case when i.id = 'e2000000-0000-4000-8000-000000000002' then 12 else 16 end) else 0 end
from public.pokemon_individuals i where i.id::text like 'e2000000-%';

insert into public.pokemon_growth(individual_id,user_id,iv,bonus_exp,moves_custom) values
('e2000000-0000-4000-8000-000000000001','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','{1,2,3,4,5,6}',7,true);
insert into public.pokemon_moveset(individual_id,user_id,slot,move)
select 'e2000000-0000-4000-8000-000000000001'::uuid,'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid, 0::smallint, 'growl'
union all select 'e2000000-0000-4000-8000-000000000001'::uuid,'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid, 1::smallint,
  (select move from public.pokemon_moves_ref where move not in (select move from public.pokemon_learnset where species = 5) order by move limit 1);
insert into public.bag(user_id,item_id,count) values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1','water-stone',2);

create temp table r(k text primary key, v jsonb);
grant all on r to authenticated;

select is(has_function_privilege('anon','public.pokemon_evolve(uuid,uuid,smallint,jsonb,text)','execute'), false, 'anon cannot execute');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}',true);
insert into r select 'before', public.pokemon_build('e2000000-0000-4000-8000-000000000001');

-- level evolution
insert into r select 'lvl', public.pokemon_evolve('f2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001',5::smallint);
select is((select pokemon_id::int from public.pokemon_individuals where id='e2000000-0000-4000-8000-000000000001'), 5, 'level evolution changes pokemon_id');
select is((select v->>'first' from r where k='lvl'), 'true', 'the first evolution into a species returns first=true');
select is((select (v->>'from')::int || '>' || (v->>'to')::int from r where k='lvl'), '4>5', 'receipt names from and to');
select is((select count(*)::int from public.pokemon_dex where pokemon_id in (4,5) and user_id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'), 2, 'pokemon_dex has the new species and keeps the old one');
select is((select via from public.pokemon_dex where pokemon_id = 5 and user_id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'), 'evolution', 'the new species is recorded via evolution');
select is((select v->'build'->>'species' from r where k='lvl'), '5', 'the receipt build reports the new species');
select isnt((select v->'stats' from r where k='before'), (select v->'build'->'stats' from r where k='lvl'), 'new base stats show in the build');
select is((select (v->>'levelAfter')::int from r where k='lvl'), (select (v->>'levelBefore')::int from r where k='lvl'), 'the level holds when the curve is the same');

-- what survives
select is((select iv from public.pokemon_growth where individual_id='e2000000-0000-4000-8000-000000000001'), '{1,2,3,4,5,6}'::smallint[], 'IV survives');
select is((select bonus_exp from public.pokemon_growth where individual_id='e2000000-0000-4000-8000-000000000001'), 7, 'bonus_exp is untouched when the level holds');
select is((select nickname from public.pokemon_individuals where id='e2000000-0000-4000-8000-000000000001'), 'Blaze', 'nickname survives');
select is((select appearance->>'palette' from public.pokemon_individuals where id='e2000000-0000-4000-8000-000000000001'), 'origin', 'appearance survives');

-- custom moves
select is((select count(*)::int from public.pokemon_moveset where individual_id='e2000000-0000-4000-8000-000000000001'), 1, 'custom moves not in the new learnset are dropped');
select is((select move from public.pokemon_moveset where individual_id='e2000000-0000-4000-8000-000000000001'), 'growl', 'the others are kept');
select is((select jsonb_array_length(v->'dropped') from r where k='lvl'), 1, 'the dropped move is reported');

-- replay and conflict
select is(public.pokemon_evolve('f2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001',5::smallint), (select v from r where k='lvl'), 'replay returns the first receipt');
select is((select count(*)::int from public.pokemon_evolution_log where operation_id='f2000000-0000-4000-8000-000000000001'), 1, 'replay logs nothing more');
select throws_ok($$select public.pokemon_evolve('f2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001',6::smallint)$$, 'P0001', 'operation_conflict', 'same op, other branch → operation_conflict');

-- refusals
select throws_ok($$select public.pokemon_evolve(gen_random_uuid(),'e2000000-0000-4000-8000-000000000002',5::smallint)$$, 'P0001', 'not_eligible', 'Lv 12 → not_eligible');
select is((select pokemon_id::int from public.pokemon_individuals where id='e2000000-0000-4000-8000-000000000002'), 4, 'a refused evolution changes nothing');
select throws_ok($$select public.pokemon_evolve(gen_random_uuid(),'e2000000-0000-4000-8000-000000000006',999::smallint)$$, 'P0001', 'invalid_branch', 'unknown branch → invalid_branch');
select throws_ok($$select public.pokemon_evolve(gen_random_uuid(),'e2000000-0000-4000-8000-000000000006',5::smallint,'{}','water-stone')$$, 'P0001', 'not_eligible', 'an item given for a level alt → not_eligible');
select set_config('request.jwt.claims','{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc2","role":"authenticated"}',true);
select throws_ok($$select public.pokemon_evolve(gen_random_uuid(),'e2000000-0000-4000-8000-000000000006',5::smallint)$$, 'P0001', 'not_found', 'another user → not_found');
select set_config('request.jwt.claims','{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}',true);

-- items
insert into r select 'stone1', public.pokemon_evolve(gen_random_uuid(),'e2000000-0000-4000-8000-000000000003',134::smallint,'{}','water-stone');
select is((select count from public.bag where item_id='water-stone'), 1, 'item evolution spends exactly one stone');
select is((select v->>'first' from r where k='stone1'), 'true', 'Eevee → Vaporeon the first time: first=true');
insert into r select 'stone2', public.pokemon_evolve(gen_random_uuid(),'e2000000-0000-4000-8000-000000000004',134::smallint,'{}','water-stone');
select is((select v->>'first' from r where k='stone2'), 'false', 'the second Eevee → Vaporeon: first=false');
select is((select count(*)::int from public.bag where item_id='water-stone'), 0, 'the last stone removes the bag row');
select throws_ok($$select public.pokemon_evolve(gen_random_uuid(),'e2000000-0000-4000-8000-000000000005',134::smallint,'{}','water-stone')$$, 'P0001', 'no_item', 'no stone → no_item');

-- the level never drops: a slower curve for the new species
reset role;
update public.pokemon_species_base set growth = 'slow' where species = 5;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}',true);
insert into r select 'slow', public.pokemon_evolve(gen_random_uuid(),'e2000000-0000-4000-8000-000000000007',5::smallint);
select ok((select (v->>'levelAfter')::int >= (v->>'levelBefore')::int from r where k='slow'), 'level never drops on a slower curve');
select ok((select bonus_exp > 0 from public.pokemon_growth where individual_id='e2000000-0000-4000-8000-000000000007'), 'bonus_exp is raised to compensate');

select * from finish();
rollback;
