begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('d1000000-0000-4000-8000-000000000001','teams-a@example.invalid','authenticated','authenticated'),
('d1000000-0000-4000-8000-000000000002','teams-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',1,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}'),
('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001',4,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}'),
('d2000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000002',7,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');
insert into public.trainer_profiles(user_id,xp) values ('d1000000-0000-4000-8000-000000000001', public.trainer_xp_for(5));
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select is((public.trainer_save_teams('[{"slot":1,"name":"  Lửa   nóng ","members":["d2000000-0000-4000-8000-000000000001"]},{"slot":2,"name":"","members":["d2000000-0000-4000-8000-000000000002","d2000000-0000-4000-8000-000000000001"]}]'::jsonb, 2))->'team',
  '["d2000000-0000-4000-8000-000000000002","d2000000-0000-4000-8000-000000000001"]'::jsonb, 'saving makes the active team the game team');
select is((select name from public.trainer_teams where slot=1),'Lửa nóng','name is cleaned');
select is((select name from public.trainer_teams where slot=2),'Đội 2','empty name falls back');
select is((public.trainer_switch_team(1))->'active','1'::jsonb,'switch changes the active team');
select is((select team from public.trainer_profiles),array['d2000000-0000-4000-8000-000000000001']::uuid[],'switch copies the members');
select public.trainer_save_teams('[{"slot":1,"name":"h","members":[null,"d2000000-0000-4000-8000-000000000002"]}]'::jsonb,1);
select is((select members from public.trainer_teams where slot=1),array[null,'d2000000-0000-4000-8000-000000000002']::uuid[],'holes keep their positions');
select is((select team from public.trainer_profiles),array['d2000000-0000-4000-8000-000000000002']::uuid[],'the game team has no holes');
select throws_ok($$select public.trainer_save_teams('[{"slot":1,"name":"h","members":[null,null,"d2000000-0000-4000-8000-000000000001"]}]'::jsonb,1)$$,'P0001','team_full','a Pokémon beyond the slots');
select throws_ok($$select public.trainer_switch_team(9)$$,'P0001','bad_teams','unknown team');
select throws_ok($$select public.trainer_save_teams('[{"slot":1,"name":"x","members":["d2000000-0000-4000-8000-000000000003"]}]'::jsonb,1)$$,'P0001','not_found','another player''s Pokémon');
select throws_ok($$select public.trainer_save_teams('[{"slot":1,"name":"x","members":[]},{"slot":1,"name":"y","members":[]}]'::jsonb,1)$$,'P0001','bad_teams','duplicate slot');
select throws_ok($$select public.trainer_save_teams('[{"slot":1,"name":"x","members":[]}]'::jsonb,2)$$,'P0001','bad_teams','active team must exist');
select throws_ok($$select public.trainer_save_teams('[{"slot":1,"name":"x","members":["d2000000-0000-4000-8000-000000000001","d2000000-0000-4000-8000-000000000001"]}]'::jsonb,1)$$,'P0001','duplicate','same Pokémon twice');
select throws_ok($$select public.trainer_save_teams('[{"slot":11,"name":"x","members":[]}]'::jsonb,11)$$,'P0001','bad_teams','slot above ten');
select * from finish();
rollback;
