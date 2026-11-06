begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
  ('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1','chest-a@example.invalid','authenticated','authenticated'),
  ('c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2','chest-b@example.invalid','authenticated','authenticated');
insert into public.quiz_players(user_id,window_start,used,streak,records) values
  ('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1',now(),1,4,9);
insert into public.quiz_rounds(id,user_id,answer_id,options,veil,hard,range_from,range_to,gifts,bonus_slot,duration_ms) values
  ('c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3','c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1',25,array[25,1,2,3],'warp',false,1,151,array['oran-berry','oran-berry','oran-berry','oran-berry'],-1,14000);
create temp table chest_results(k text primary key,v jsonb);
grant all on chest_results to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1","role":"authenticated"}',true);
insert into chest_results values ('answer',public.quiz_answer('c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3',25::smallint));
insert into chest_results values ('status',public.quiz_status());
reset role;
select is((select jsonb_array_length(v->'chests') from chest_results where k='status'),2,'status keeps both unopened chests after the answer');
select is((select jsonb_agg(c->'kind') from chest_results, jsonb_array_elements(v->'chests') c where k='status'),'["combo","special"]'::jsonb,'combo then special');
select is((select jsonb_agg(c->'gifts') from chest_results, jsonb_array_elements(v->'chests') c where k='status'),(select jsonb_agg(c->'gifts') from chest_results, jsonb_array_elements(v->'chests') c where k='answer'),'the same gifts the answer paid');
select is((select (v->'chests'->0->>'round')::uuid from chest_results where k='status'),'c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3'::uuid,'chest names its round');
select is((select (v->'chests'->0->>'chest_reward_version')::int from chest_results where k='status'),1,'chest keeps its shard version');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2","role":"authenticated"}',true);
select is(public.quiz_status()->'chests','[]'::jsonb,'another account sees no chest');
select lives_ok($$select public.quiz_open_chests('c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3')$$,'another account opening is a no-op');
select is((select count(*)::int from public.quiz_unopened_chests),0,'rows are private to the owner');
select set_config('request.jwt.claims','{"sub":"c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1","role":"authenticated"}',true);
select is(jsonb_array_length(public.quiz_status()->'chests'),2,'owner chests untouched by another account');
select throws_ok($$delete from public.quiz_unopened_chests$$,'42501',null,'no direct writes');
select lives_ok($$select public.quiz_open_chests('c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3')$$,'owner opens');
select is(public.quiz_status()->'chests','[]'::jsonb,'opened chests are gone');
select lives_ok($$select public.quiz_open_chests('c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3')$$,'opening again is a no-op');
reset role;
set local role anon;
select throws_ok($$select public.quiz_open_chests('c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3')$$,'42501',null,'anon denied');
reset role;
select * from finish();
rollback;
