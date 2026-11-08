-- Pokémon build items: bottle caps, rare candy, the 3-use limit, awakening
begin;
select plan(28);

insert into auth.users(id,email,aud,role) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','items-a@example.invalid','authenticated','authenticated'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','items-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential)
select i, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 25, 2,
  '{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}', '{"v":1,"offsets":[],"stars":1}'
from unnest(array[
  'e0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000004',
  'e0000000-0000-4000-8000-000000000005']::uuid[]) i;
insert into public.bag(user_id,item_id,count) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bottle-cap',2),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','gold-bottle-cap',1),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','rare-candy',6);
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection) values
('e0000000-0000-4000-8000-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',60,60,60,now(),449),
('e0000000-0000-4000-8000-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',60,60,60,now(),4000);
insert into public.kitchen_dishes values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','poffin-pecha',2);
create temp table receipts(k text primary key,v jsonb);
grant all on receipts to authenticated;

select is((select count(*)::int from pg_proc where proname in ('pokemon_build_begin') and has_function_privilege('authenticated', oid, 'execute')),0,'the prologue is not callable');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1","role":"authenticated"}',true);

-- bottle cap
insert into receipts values ('cap', public.pokemon_use_item('f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','bottle-cap',1::smallint));
select is((select v->'iv' from receipts where k='cap'),'[15,31,15,15,15,15]'::jsonb,'bottle cap: Atk IV 31');
select is((select (v->>'itemUses')::int from receipts where k='cap'),1,'one use counted');
select is((select count from public.bag where item_id='bottle-cap'),1,'one cap spent');
select is(public.pokemon_use_item('f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','bottle-cap',1::smallint),(select v from receipts where k='cap'),'replay returns the first result');
select is((select count from public.bag where item_id='bottle-cap'),1,'replay spends no second cap');
select throws_ok($$select public.pokemon_use_item('f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','gold-bottle-cap')$$,'P0001','operation_conflict','same id, other item');
select throws_ok($$select public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000001','bottle-cap',1::smallint)$$,'P0001','iv_maxed','that IV is already 31');
select throws_ok($$select public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000001','bottle-cap')$$,'P0001','invalid_stat','a cap needs a stat');
select throws_ok($$select public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000001','bottle-cap',6::smallint)$$,'P0001','invalid_stat','stat 0..5 only');
select is((select count from public.bag where item_id='bottle-cap'),1,'refusals spend nothing');
select throws_ok($$select public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000001','soothe-bell')$$,'P0001','no_item','an item not in the bag');
select throws_ok($$select public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000001','rare-candy-x')$$,'P0001','no_item','an unknown item is just not owned');

-- gold cap: stars and the care cap follow
insert into receipts values ('gold', public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000001','gold-bottle-cap'));
select is((select v->'iv' from receipts where k='gold'),'[31,31,31,31,31,31]'::jsonb,'gold cap: every IV 31');
select is((select (v->>'stars')::int from receipts where k='gold'),3,'perfect IVs lift 1 star to 3');
select is((select count(*)::int from public.bag where item_id='gold-bottle-cap'),0,'the last gold cap removes the row');

-- rare candy
insert into receipts values ('candy', public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000002','rare-candy'));
select is((select (v->>'level')::int from receipts where k='candy'),2,'rare candy: level 1 to 2');
select is((select (v->>'itemUses')::int from receipts where k='candy'),1,'candy counts as a use');
select public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000002','rare-candy');
select public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000002','rare-candy');
select throws_ok($$select public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000002','rare-candy')$$,'P0001','item_limit','the 4th use is refused');
select is((select count from public.bag where item_id='rare-candy'),3,'the refused 4th spends no candy');
select throws_ok($$select public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000005','rare-candy')$$,'P0001','level_capped','no candy at the level cap');

-- someone else's individual
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2","role":"authenticated"}',true);
select throws_ok($$select public.pokemon_use_item(gen_random_uuid(),'e0000000-0000-4000-8000-000000000001','rare-candy')$$,'P0001','not_found','not your Pokémon');
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1","role":"authenticated"}',true);

-- awakening
select throws_ok($$select public.pokemon_awaken(gen_random_uuid(),'e0000000-0000-4000-8000-000000000004')$$,'P0001','not_ready','affection 449 is not enough');
reset role;
update public.pokemon_care set affection = 450 where individual_id = 'e0000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1","role":"authenticated"}',true);
insert into receipts values ('awake', public.pokemon_awaken('f0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000004'));
select is((select (v->>'stars')::int || '/' || (v->>'cap') from receipts where k='awake'),'2/70','awakening: 1 star to 2, cap 70');
select is((select (v->>'itemUses')::int from receipts where k='awake'),0,'awakening is not an item use');
select is(public.pokemon_awaken('f0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000004'),(select v from receipts where k='awake'),'awakening replay');
select throws_ok($$select public.pokemon_awaken(gen_random_uuid(),'e0000000-0000-4000-8000-000000000004')$$,'P0001','already_awakened','once only');

-- the care cap follows the new stars: 1 star caps at 80, 3 stars at 120
reset role;
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,happiness) values
('e0000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',50,60,60,now(),79)
on conflict (individual_id) do update set happiness = 79, hunger = 50;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1","role":"authenticated"}',true);
select is((public.care_feed(gen_random_uuid(),'e0000000-0000-4000-8000-000000000001','poffin-pecha')->'care'->'stats'->>'happiness')::int,82,'a 3-star individual grows past the 1-star cap of 80');
reset role;

select * from finish();
rollback;
