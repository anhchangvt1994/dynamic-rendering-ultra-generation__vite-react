-- Pokémon moveset: derived defaults, level / TM / affection rules, four slots
begin;
select plan(19);

insert into auth.users(id,email,aud,role) values
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','moves-a@example.invalid','authenticated','authenticated'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','moves-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential)
select i, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 25, 2,
  '{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}', '{"v":1,"offsets":[],"stars":1}'
from unnest(array['c1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002']::uuid[]) i;
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection) values
('c1000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',60,60,60,now(),149);
create temp table receipts(k text primary key,v jsonb);
grant all on receipts to authenticated;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1","role":"authenticated"}',true);

select is(public.pokemon_build('c1000000-0000-4000-8000-000000000001'::uuid)->'moves','["quick-attack","sweet-kiss","tail-whip","thunder-shock"]'::jsonb,'a newborn Pikachu starts with its latest level-up moves');
select is(jsonb_array_length(public.pokemon_build('c1000000-0000-4000-8000-000000000001'::uuid)->'moves'),4,'always four entries');

select throws_ok($$select public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000001',0::smallint,'double-team')$$,'P0001','locked','level 8 move at level 1');
select throws_ok($$select public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000001',0::smallint,'thunderbolt')$$,'P0001','locked','a TM move without the TM');
select throws_ok($$select public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000001',0::smallint,'hyper-beam')$$,'P0001','not_learnable','not in the learnset');
select throws_ok($$select public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000001',4::smallint,'growl')$$,'P0001','invalid_slot','slot 4');
select throws_ok($$select public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000001',0::smallint,'counter')$$,'P0001','locked','a tutor move needs affection 150');
reset role;
select is((select count(*)::int from public.pokemon_build_ops),0,'refusals leave no trace');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1","role":"authenticated"}',true);

-- a legal swap materialises the defaults first
insert into receipts values ('swap', public.pokemon_set_move('f1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',0::smallint,'growl'));
select is((select v->'moves' from receipts where k='swap'),'["growl","sweet-kiss","tail-whip","thunder-shock"]'::jsonb,'slot 0 swapped, the rest kept');
select throws_ok($$select public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000001',1::smallint,'growl')$$,'P0001','duplicate','the same move in two slots');
select is(public.pokemon_set_move('f1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',0::smallint,'growl'),(select v from receipts where k='swap'),'replay returns the first result');
select throws_ok($$select public.pokemon_set_move('f1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',0::smallint,'charm')$$,'P0001','operation_conflict','same id, other move');

-- clearing keeps the build custom (defaults do not come back)
select is(public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000001',3::smallint,null)->'moves','["growl","sweet-kiss","tail-whip",null]'::jsonb,'a cleared slot stays empty');

-- a TM: owned, not consumed, reusable
reset role;
insert into public.bag(user_id,item_id,count) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','tm-electric',1);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1","role":"authenticated"}',true);
select is(public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000001',3::smallint,'thunderbolt')->'moves'->>3,'thunderbolt','TM Electric teaches Thunderbolt');
select is((select count from public.bag where item_id='tm-electric'),1,'the TM is not consumed');
select is(public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000002',0::smallint,'thunderbolt')->'moves'->>0,'thunderbolt','the same TM serves a second Pokémon');

-- affection 150 opens tutor moves
select throws_ok($$select public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000002',1::smallint,'counter')$$,'P0001','locked','affection 149');
reset role;
update public.pokemon_care set affection = 150 where individual_id = 'c1000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1","role":"authenticated"}',true);
select is(public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000002',1::smallint,'counter')->'moves'->>1,'counter','affection 150 opens tutor moves');

-- someone else's Pokémon
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2","role":"authenticated"}',true);
select throws_ok($$select public.pokemon_set_move(gen_random_uuid(),'c1000000-0000-4000-8000-000000000001',0::smallint,'growl')$$,'P0001','not_found','not your Pokémon');
reset role;

select * from finish();
rollback;
