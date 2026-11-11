begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('d1000000-0000-4000-8000-000000000001','fix-a@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential)
select gen_random_uuid(),'d1000000-0000-4000-8000-000000000001',n,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}'
from generate_series(1,5) n;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.trainer_set_team('{}'::uuid[]);
select public.trainer_set_avatar('scout');
reset role;
select is((select count(*)::int from public.trainer_badges where user_id='d1000000-0000-4000-8000-000000000001'),0,'team and avatar pickers award no badges');

-- yesterday's finished quest stays claimable after today's rows exist
select public.trainer_grant_xp('d1000000-0000-4000-8000-000000000001',0);
insert into public.minigame_quests(user_id,day,slot,kind,goal,progress) values
('d1000000-0000-4000-8000-000000000001',(now() at time zone 'utc')::date - 1,1,'win',1,1);
select public.quest_ensure('d1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.minigame_quest_claim(1::smallint)$$,'yesterday''s done row is claimed though today has rows');
select * from finish();
rollback;
