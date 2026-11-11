begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('c1000000-0000-4000-8000-000000000001','team-a@example.invalid','authenticated','authenticated'),
('c1000000-0000-4000-8000-000000000002','team-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',1,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}'),
('c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001',4,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}'),
('c2000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000002',7,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');

select is(array(select public.trainer_team_slots(x) from unnest(array[1,4,5,25,30]) x),array[1,1,2,6,6],'slots by level');
select is(array(select public.trainer_bond(x) from unnest(array[0,10,449,450]) x),array[1,2,9,10],'bond from affection');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.trainer_set_team('{}'::uuid[]))->'team','[]'::jsonb,'an empty team is fine');
select throws_ok($$select public.trainer_set_team(array['c2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000002']::uuid[])$$,'P0001','team_full','level 1 has one slot');
select throws_ok($$select public.trainer_set_team(array['c2000000-0000-4000-8000-000000000003']::uuid[])$$,'P0001','not_found','another player''s Pokémon');
select throws_ok($$select public.trainer_set_team(array[gen_random_uuid()]::uuid[])$$,'P0001','not_found','unknown id');
select is((public.trainer_set_team(array['c2000000-0000-4000-8000-000000000001']::uuid[]))->'team',to_jsonb(array['c2000000-0000-4000-8000-000000000001']::uuid[]),'a level 1 Pokémon joins');
reset role;
-- two slots, then a duplicate
update public.trainer_profiles set xp=public.trainer_xp_for(5) where user_id='c1000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.trainer_set_team(array['c2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001']::uuid[])$$,'P0001','duplicate');
select is(jsonb_array_length((public.trainer_set_team(array['c2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000002']::uuid[]))->'team'),2,'two fit at level 5');
-- a Pokémon above trainerLevel + 2·bond is refused
reset role;
update public.pokemon_growth set bonus_exp=bonus_exp where false;
insert into public.pokemon_growth(individual_id,user_id,iv,bonus_exp) values
('c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001',public.pokemon_birth_iv('{"v":1,"offsets":[],"stars":1}'),900000)
on conflict (individual_id) do update set bonus_exp=900000;
update public.trainer_profiles set team='{}' where user_id='c1000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.trainer_set_team(array['c2000000-0000-4000-8000-000000000002']::uuid[])$$,'P0001','not_eligible','a high-level Pokémon needs more trainer level');
select * from finish();
rollback;
