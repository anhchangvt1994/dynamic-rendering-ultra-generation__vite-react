begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('77777777-7777-4777-8777-777777777777','care-a@example.invalid','authenticated','authenticated'),
('88888888-8888-4888-8888-888888888888','care-b@example.invalid','authenticated','authenticated');
-- proud (8: likes beauty, dislikes power) with 1 star; calm (2: likes wisdom, dislikes agility) with 3
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values
('c0000000-0000-4000-8000-000000000001','77777777-7777-4777-8777-777777777777',25,8,'{"v":1}','{"v":1,"offsets":[],"stars":1}'),
('c0000000-0000-4000-8000-000000000002','77777777-7777-4777-8777-777777777777',1,2,'{"v":1}','{"v":1,"offsets":[],"stars":3}');
insert into public.kitchen_dishes values
('77777777-7777-4777-8777-777777777777','poffin-pecha',2),
('77777777-7777-4777-8777-777777777777','poffin-cheri',1),
('77777777-7777-4777-8777-777777777777','tra-da-chesto',1);
create temp table receipts(k text primary key,v jsonb);
grant all on receipts to authenticated;
select is((select count(*)::int from pg_proc where proname in ('pokemon_care_rules','pokemon_care_now','pokemon_care_json','pokemon_care_taste','pokemon_care_act') and has_function_privilege('authenticated', oid, 'execute')),0,'care helpers are not callable by players');
select is(public.pokemon_care_taste(8::smallint,'beauty'),'liked','proud likes beauty');
select is(public.pokemon_care_taste(8::smallint,'power'),'disliked','proud dislikes power');
select is(public.pokemon_care_taste(2::smallint,'happiness'),'neutral','calm is neutral to happiness');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',true);
select throws_ok($$select public.care_pet(null,'c0000000-0000-4000-8000-000000000001')$$,'P0001','invalid_operation');
select throws_ok($$select public.care_pet(gen_random_uuid(),gen_random_uuid())$$,'P0001','not_found','unknown individual');
select throws_ok($$select public.care_feed(gen_random_uuid(),'c0000000-0000-4000-8000-000000000002','poffin-oran')$$,'P0001','no_dish','a dish the player has none of');
select is((select count(*)::int from public.pokemon_care),0,'a refused feed creates no care row');

-- feed, neutral taste
insert into receipts values ('feed',public.care_feed('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','poffin-pecha'));
select is((select count from public.kitchen_dishes where dish_id='poffin-pecha'),1,'one dish spent');
select is((select (v->>'dishCount')::int from receipts where k='feed'),1,'receipt counts the dishes left');
select is((select v->>'dishId' from receipts where k='feed'),'poffin-pecha','receipt names the dish');
select is((select v->>'action' from receipts where k='feed'),'feed','receipt names the action');
select is((select (v->'care'->'needs'->>'hunger')::numeric from receipts where k='feed'),90::numeric,'hunger +30');
select is((select (v->'care'->>'affection')::int from receipts where k='feed'),3,'neutral feed: affection +3');
select is((select v->'care'->'moodEvent' from receipts where k='feed'),'null'::jsonb,'neutral feed: no mood event');
select is((select v->'care'->'stats' from receipts where k='feed'),'{"power":0,"beauty":0,"happiness":3,"agility":0,"wisdom":0,"friendship":3}'::jsonb,'dish stats added');
reset role;
select is((select v->'care' from receipts where k='feed'),(select public.pokemon_care_json(c) from public.pokemon_care c where individual_id='c0000000-0000-4000-8000-000000000002'),'receipt care is the stored care');
set local role authenticated;

-- replay and conflict
select is(public.care_feed('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','poffin-pecha'),(select v from receipts where k='feed'),'replay returns the original receipt');
select is((select count from public.kitchen_dishes where dish_id='poffin-pecha'),1,'replay spends no second dish');
select throws_ok($$select public.care_bathe('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002')$$,'P0001','operation_conflict','same id, other action');
select throws_ok($$select public.care_feed('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','poffin-pecha')$$,'P0001','operation_conflict','same id, other individual');
select throws_ok($$select public.care_feed('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','poffin-cheri')$$,'P0001','operation_conflict','same id, other dish');
select throws_ok($$select public.care_feed(gen_random_uuid(),'c0000000-0000-4000-8000-000000000002','poffin-pecha')$$,'P0001','full','hunger 90 is full');
select is((select count from public.kitchen_dishes where dish_id='poffin-pecha'),1,'a full Pokémon eats nothing');

-- liked: proud and a beauty dish, the last one
insert into receipts values ('liked',public.care_feed(gen_random_uuid(),'c0000000-0000-4000-8000-000000000001','tra-da-chesto'));
select is((select v->'care'->>'moodEvent' from receipts where k='liked'),'liked','liked dish');
select is((select (v->'care'->>'affection')::int from receipts where k='liked'),5,'liked: affection +5');
select is((select (v->'care'->'needs'->>'fun')::numeric from receipts where k='liked'),70::numeric,'liked: fun +10');
select is((select count(*)::int from public.kitchen_dishes where dish_id='tra-da-chesto'),0,'the last dish removes the row');

-- disliked, and the stat cap 60 + 20 x 1 star
reset role;
update public.pokemon_care set power=79, hunger=50 where individual_id='c0000000-0000-4000-8000-000000000001';
set local role authenticated;
insert into receipts values ('disliked',public.care_feed(gen_random_uuid(),'c0000000-0000-4000-8000-000000000001','poffin-cheri'));
select is((select v->'care'->>'moodEvent' from receipts where k='disliked'),'disliked','disliked dish');
select is((select (v->'care'->>'affection')::int from receipts where k='disliked'),5,'disliked: affection +0');
select is((select (v->'care'->'stats'->>'power')::int from receipts where k='disliked'),80,'power stops at the cap');

-- decay: 5 hours, then 100 hours
reset role;
update public.pokemon_care set hunger=60, clean=60, fun=60, needs_at=now()-interval '5 hours', bathed_at=null where individual_id='c0000000-0000-4000-8000-000000000002';
set local role authenticated;
insert into receipts values ('bathe',public.care_bathe(gen_random_uuid(),'c0000000-0000-4000-8000-000000000002'));
select is((select (v->'care'->'needs'->>'hunger')::numeric from receipts where k='bathe'),40.00::numeric,'5 hours: hunger 60 - 20');
select is((select (v->'care'->'needs'->>'clean')::numeric from receipts where k='bathe'),90.00::numeric,'5 hours: clean 50, bathed +40');
select is((select (v->'care'->'needs'->>'fun')::numeric from receipts where k='bathe'),45.00::numeric,'5 hours: fun 60 - 15');
select throws_ok($$select public.care_bathe(gen_random_uuid(),'c0000000-0000-4000-8000-000000000002')$$,'P0001','bathe_cooldown','a second bath within 30 minutes');
reset role;
update public.pokemon_care set needs_at=now()-interval '100 hours', bathed_at=now()-interval '1 hour' where individual_id='c0000000-0000-4000-8000-000000000002';
set local role authenticated;
select is((public.care_bathe(gen_random_uuid(),'c0000000-0000-4000-8000-000000000002')->'care'->'needs'->>'hunger')::numeric,25.00::numeric,'100 hours: hunger stops at the floor');

-- petting: three, then one too many
select public.care_pet(gen_random_uuid(),'c0000000-0000-4000-8000-000000000001');
select public.care_pet(gen_random_uuid(),'c0000000-0000-4000-8000-000000000001');
insert into receipts values ('pet3',public.care_pet(gen_random_uuid(),'c0000000-0000-4000-8000-000000000001'));
insert into receipts values ('pet4',public.care_pet(gen_random_uuid(),'c0000000-0000-4000-8000-000000000001'));
select is((select (v->'care'->>'affection')::int from receipts where k='pet3'),8,'three pets: affection +3');
select is((select v->'care'->>'moodEvent' from receipts where k='pet4'),'overpet','the fourth pet angers');
select is((select (v->'care'->>'affection')::int from receipts where k='pet4'),8,'the fourth pet gives no affection');
select is((select (v->'care'->>'petWindowCount')::int from receipts where k='pet4'),4,'the window counts it');

-- direct writes are denied
select is((select count(*)::int from public.pokemon_care),2,'owner reads their care');
select throws_ok($$update public.pokemon_care set affection=999$$,'42501',null,'no direct care writes');
select throws_ok($$delete from public.pokemon_care_ops$$,'42501',null,'no direct receipt access');

-- another owner sees and touches nothing
select set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',true);
select is((select count(*)::int from public.pokemon_care),0,'other owner cannot read care');
select throws_ok($$select public.care_pet(gen_random_uuid(),'c0000000-0000-4000-8000-000000000001')$$,'P0001','not_found','a stranger cannot pet');
select throws_ok($$select public.care_feed(gen_random_uuid(),'c0000000-0000-4000-8000-000000000001','poffin-pecha')$$,'P0001','not_found','a stranger cannot feed');
select throws_ok($$select public.care_feed('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','poffin-pecha')$$,'P0001','not_found','a stranger cannot replay the owner''s operation');
reset role;
select is((select count from public.kitchen_dishes where user_id='77777777-7777-4777-8777-777777777777' and dish_id='poffin-pecha'),1,'stranger spent nothing');

set local role anon;
select throws_ok($$select public.care_pet(gen_random_uuid(),'c0000000-0000-4000-8000-000000000001')$$,'42501',null,'anon cannot care');
reset role;
select * from finish();
rollback;
