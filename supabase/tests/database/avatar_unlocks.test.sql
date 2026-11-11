begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('e1000000-0000-4000-8000-000000000001','av-a@example.invalid','authenticated','authenticated');
select public.trainer_grant_xp('e1000000-0000-4000-8000-000000000001',0);
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.trainer_set_avatar('duelist')$$,'P0001','locked','duelist needs a win');
select throws_ok($$select public.trainer_set_avatar('sage')$$,'P0001','locked','sage needs 10 wins');
select throws_ok($$select public.trainer_set_avatar('collector')$$,'P0001','locked','collector needs 20 Pokémon');
select throws_ok($$select public.trainer_set_avatar('captain')$$,'P0001','locked','captain needs a team of 6');
reset role;
insert into public.minigame_players(user_id,game,wins) values ('e1000000-0000-4000-8000-000000000001','memory',10);
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential)
select gen_random_uuid(),'e1000000-0000-4000-8000-000000000001',n,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}'
from generate_series(1,20) n;
set local role authenticated;
select is((public.trainer_set_avatar('duelist'))->>'avatar','duelist','a win opens duelist');
select is((public.trainer_set_avatar('sage'))->>'avatar','sage','10 wins open sage');
select is((public.trainer_set_avatar('collector'))->>'avatar','collector','20 Pokémon open collector');
reset role;
update public.trainer_profiles set team = (select array_agg(id) from (select id from public.pokemon_individuals where user_id='e1000000-0000-4000-8000-000000000001' limit 6) t) where user_id='e1000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((public.trainer_set_avatar('captain'))->>'avatar','captain','a team of 6 opens captain');
reset role;
select is((select count(*)::int from public.trainer_badges where user_id='e1000000-0000-4000-8000-000000000001'),0,'no badge is awarded on the way');
select * from finish();
rollback;
