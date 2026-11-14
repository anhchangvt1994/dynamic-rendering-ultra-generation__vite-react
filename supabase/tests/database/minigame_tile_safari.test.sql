begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('f1000000-0000-4000-8000-000000000001','tile-a@example.invalid','authenticated','authenticated'),
('f1000000-0000-4000-8000-000000000002','tile-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values
('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001',25,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}'),
('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002',1,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');
select public.trainer_grant_xp('f1000000-0000-4000-8000-000000000001',0);
create temp table rc(k text primary key,v jsonb);
grant all on rc to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into rc values ('start',public.minigame_start('tile-safari','f2000000-0000-4000-8000-000000000001',1::smallint));
select is((select v->'view'->>'kind' from rc where k='start'),'tile-safari','typed start view');
select is((select jsonb_array_length(v->'view'->'tiles') from rc where k='start'),36,'36 tiles at difficulty 1');
select is((select v->'view'->>'rows' from rc where k='start'),'6','6 rows');
select is((select v->'view'->>'shuffles' from rc where k='start'),'3','three shuffles');
select is((select v->'view'->'removed' from rc where k='start'),'[]'::jsonb,'no removed tiles');
select is((select count(*)::int from (select t from jsonb_array_elements_text((select v->'view'->'tiles' from rc where k='start')) t group by t having count(*)=4) q),9,'nine species, four copies each');
select is((public.minigame_status())->'games'->'tile-safari'->>'left','4','separate turn window');
select is((public.minigame_status())->'opens'->'tile-safari'->>'round',(select v->>'round' from rc where k='start'),'open round resumes');
select throws_ok($$select public.minigame_tile_remove(((select v->>'round' from rc where k='start'))::uuid,0,0)$$,'P0001','bad_pair','same tile cannot be paired with itself');
reset role;
-- a fixed board: 1 2 / 3 1 ... the two 1s are blocked in a row but join around the ring
update public.minigame_rounds set layout=jsonb_set(layout,'{tiles}',(select jsonb_agg(case when i=0 or i=5 then 1000 when i=1 then 2000 when i=6 then 2000 else 3000+i end order by i) from generate_series(0,35) i)) where id=(select (v->>'round')::uuid from rc where k='start');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.minigame_tile_remove(((select v->>'round' from rc where k='start'))::uuid,0,1)$$,'P0001','bad_pair','different species cannot pair');
insert into rc values ('removed1',public.minigame_tile_remove(((select v->>'round' from rc where k='start'))::uuid,0,5));
select is(jsonb_array_length((select v->'removed' from rc where k='removed1')),2,'equal tiles joined by a turned path are removed');
select throws_ok($$select public.minigame_tile_remove(((select v->>'round' from rc where k='start'))::uuid,0,5)$$,'P0001','bad_pair','a removed tile cannot be used again');
insert into rc values ('shuf',public.minigame_tile_shuffle(((select v->>'round' from rc where k='start'))::uuid));
select is((select v->>'shuffles' from rc where k='shuf'),'2','a shuffle spends one of three');
select is((select v->'tiles'->>0 from rc where k='shuf'),'1000','a removed cell keeps its tile on shuffle');
select throws_ok($$select public.minigame_finish(((select v->>'round' from rc where k='start'))::uuid)$$,'P0001','not_finished','unfinished board cannot settle');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.minigame_tile_remove(((select v->>'round' from rc where k='start'))::uuid,0,2)$$,'P0001','not_found','another account cannot move round');
reset role;
select * from finish();
rollback;
