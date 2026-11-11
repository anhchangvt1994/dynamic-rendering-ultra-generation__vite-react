begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('a1000000-0000-4000-8000-000000000001','trainer-a@example.invalid','authenticated','authenticated'),
('a1000000-0000-4000-8000-000000000002','trainer-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',25,8,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');

select is((select count(*)::int from pg_proc where proname in ('minigame_rules','trainer_xp_for','trainer_level','trainer_grant_xp','trainer_xp_on_quiz','trainer_xp_on_dish','trainer_xp_on_care','trainer_xp_on_evolve') and has_function_privilege('authenticated', oid, 'execute')),0,'trainer helpers are not callable by players');
select is(array(select public.trainer_level(x) from unnest(array[0,39,40,112,113,6247,1000000]) x),array[1,1,2,2,3,30,30],'level curve');
select is(public.trainer_xp_for(10),1080,'xp for level 10');

-- grant creates the profile
select is((select count(*)::int from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),0,'no profile yet');
select public.trainer_grant_xp('a1000000-0000-4000-8000-000000000001',7);
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),7,'grant creates the profile');
select is((select team from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),'{}'::uuid[],'empty team');
select public.trainer_grant_xp('a1000000-0000-4000-8000-000000000001',3);
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),10,'grants add up');

-- care xp is capped at 10 a day
select public.trainer_grant_xp('a1000000-0000-4000-8000-000000000002',1,'care') from generate_series(1,12);
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000002'),10,'12 care grants in one day pay 10');
update public.trainer_profiles set care_xp_day=care_xp_day-1 where user_id='a1000000-0000-4000-8000-000000000002';
select public.trainer_grant_xp('a1000000-0000-4000-8000-000000000002',1,'care');
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000002'),11,'the next day pays again');
select public.trainer_grant_xp('a1000000-0000-4000-8000-000000000002',5,'quiz');
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000002'),16,'other sources are not capped');

-- triggers on existing events (user A, xp 10)
insert into public.quiz_rounds(id,user_id,answer_id,options,veil,hard,range_from,range_to,gifts,bonus_slot,duration_ms,answered_at) values
('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',25,'{25,1,2,3}','warp',false,1,151,'{}',0,10000,now()),
('a3000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001',25,'{25,1,2,3}','warp',false,1,151,'{}',0,10000,now());
update public.quiz_rounds set outcome='wrong' where id='a3000000-0000-4000-8000-000000000001';
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),10,'a wrong answer pays nothing');
update public.quiz_rounds set outcome='right' where id='a3000000-0000-4000-8000-000000000002';
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),15,'a right answer pays 5');
update public.quiz_rounds set outcome='right' where id='a3000000-0000-4000-8000-000000000002';
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),15,'a second update pays nothing');

insert into public.kitchen_dishes values ('a1000000-0000-4000-8000-000000000001','poffin-pecha',1);
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),18,'a first dish pays 3');
update public.kitchen_dishes set count=3 where user_id='a1000000-0000-4000-8000-000000000001';
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),21,'cooking more pays 3');
update public.kitchen_dishes set count=2 where user_id='a1000000-0000-4000-8000-000000000001';
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),21,'eating a dish pays nothing');

insert into public.pokemon_care_ops(user_id,operation_id,individual_id,action,receipt) values
('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','pet','{}');
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),22,'a care action pays 1');

insert into public.pokemon_evolution_log(user_id,operation_id,individual_id,branch,receipt) values
('a1000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',0,'{}');
select is((select xp from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),37,'an evolution pays 15');

-- row level security
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::int from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000001'),0,'B cannot read A''s profile');
select is((select count(*)::int from public.trainer_profiles where user_id='a1000000-0000-4000-8000-000000000002'),1,'B reads their own');
select throws_ok($$update public.trainer_profiles set xp=999$$,'42501',null,'players cannot write their profile');
select * from finish();
rollback;
