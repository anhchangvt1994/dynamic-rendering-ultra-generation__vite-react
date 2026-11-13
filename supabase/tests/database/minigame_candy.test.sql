begin;
select no_plan();
-- Candy Rush: the SQL port of games/candy/engine.mjs (vectors.json), start, finish, settle, status.
insert into auth.users(id,email,aud,role) values
('e1000000-0000-4000-8000-000000000001','candy-a@example.invalid','authenticated','authenticated'),
('e1000000-0000-4000-8000-000000000002','candy-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential)
select ('e2000000-0000-4000-8000-00000000000' || n)::uuid, 'e1000000-0000-4000-8000-000000000001', n, 1,
  '{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}'::jsonb, '{"v":1,"offsets":[],"stars":1}'::jsonb
from generate_series(1,7) n;
-- 1: bond 4 · 2: hunger 30 · 3: bond 4 · 4: bond 4 · 5: bond 4 · 6: bond 4 · 7: bond 4
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection)
select ('e2000000-0000-4000-8000-00000000000' || n)::uuid, 'e1000000-0000-4000-8000-000000000001', case when n = 2 then 30 else 90 end, 60, 60, now(), 60
from generate_series(1,7) n;
select public.trainer_grant_xp('e1000000-0000-4000-8000-000000000001',0);
select public.quest_ensure('e1000000-0000-4000-8000-000000000001');
delete from public.minigame_quests where user_id='e1000000-0000-4000-8000-000000000001';
insert into public.minigame_quests(user_id,day,slot,kind,goal) values
('e1000000-0000-4000-8000-000000000001',(now() at time zone 'utc')::date,1,'play',9),
('e1000000-0000-4000-8000-000000000001',(now() at time zone 'utc')::date,2,'win',9),
('e1000000-0000-4000-8000-000000000001',(now() at time zone 'utc')::date,3,'flawless',9);
create temp table rc(k text primary key,v jsonb);
grant all on rc to authenticated;

select is((select count(*)::int from pg_proc where proname like 'minigame_candy_%' and has_function_privilege('authenticated', oid, 'execute')),0,'candy internals are not callable by players');
select is((select count(*)::int from pg_proc where proname in ('minigame_layout_candy','minigame_settle') and has_function_privilege('authenticated', oid, 'execute')),0,'layout and settle are not callable by players');
select is(public.minigame_rules()->'CANDY'->'TARGET','[3000,3000,2400]'::jsonb,'rules carry the candy targets');

-- vectors: the same replay and the same first board as the JS engine

select is(public.minigame_candy_replay(jsonb_build_object('tape','[2,1,2,3,2,2,0,3,2,3,2,1,3,0,2,0,0,3,3,3,0,1,2,1,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,1,3,3,1,2,3,2,0,2,0,2,1,2,1,1,1,1,3,1,0,1,0,2,0,1,1,1,0,3,1,2,3,2,2,0,2,1,2,2,1,1,3,0,2,3,2,0,2,2,1,3,2,1,3,3,1,0,2,2,3,2,2,0,3,0,0,1,3,1,3,0,3,1,1,0,1,2,3,3,3,2,3,1,0,1,2,2,2,2,1,2,3,2,0,2,0,2,1,1,2,1,1,0,1,0,2,3,2,2,3,3,1,1,1,0,3,1,0,2,1,0,0,0,0,3,2,2,1,0,1,3,1,0,3,1,3,0,0,2,3,1,2,1,3,1,2,2,2,2,2,1,0,3,0,0,1,1,1,2,2]'::jsonb,'board','[2,1,2,3,2,2,0,3,2,3,2,1,3,0,0,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,3,3,1,2,3,2,0,2,0,2,1]'::jsonb,'pos',52),1,'[[2,3],[6,7],[0,1],[10,11],[4,10]]'::jsonb),
  '{"ok":true,"score":210,"moves":5,"best":2,"movesLeft":15,"won":false,"over":false}'::jsonb,'vector plain: replay');
select is(public.minigame_candy_fill(public.minigame_candy_arr('[2,1,2,3,2,2,0,3,2,3,2,1,3,0,2,0,0,3,3,3,0,1,2,1,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,1,3,3,1,2,3,2,0,2,0,2,1,2,1,1,1,1,3,1,0,1,0,2,0,1,1,1,0,3,1,2,3,2,2,0,2,1,2,2,1,1,3,0,2,3,2,0,2,2,1,3,2,1,3,3,1,0,2,2,3,2,2,0,3,0,0,1,3,1,3,0,3,1,1,0,1,2,3,3,3,2,3,1,0,1,2,2,2,2,1,2,3,2,0,2,0,2,1,1,2,1,1,0,1,0,2,3,2,2,3,3,1,1,1,0,3,1,0,2,1,0,0,0,0,3,2,2,1,0,1,3,1,0,3,1,3,0,0,2,3,1,2,1,3,1,2,2,2,2,2,1,0,3,0,0,1,1,1,2,2]'::jsonb),4,0),'{"board":[2,1,2,3,2,2,0,3,2,3,2,1,3,0,0,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,3,3,1,2,3,2,0,2,0,2,1],"pos":52}'::jsonb,'vector plain: first board');
select is(public.minigame_candy_replay(jsonb_build_object('tape','[1,3,1,0,1,2,1,1,1,2,2,0,2,3,3,3,1,1,0,2,1,1,3,1,1,3,3,1,1,1,3,2,3,3,3,0,2,2,1,1,0,3,1,0,0,3,0,0,3,1,3,0,3,1,0,1,0,1,2,1,2,2,2,3,3,1,2,0,2,1,1,0,3,2,3,3,1,2,2,0,3,0,0,1,1,0,1,1,2,3,2,0,3,0,2,0,1,1,0,0,1,3,2,3,1,3,0,3,1,1,1,3,3,1,2,0,2,1,2,0,1,1,3,0,0,2,3,3,2,3,0,3,0,2,3,0,2,1,3,2,0,3,1,3,2,3,2,0,3,3,3,1,0,0,0,1,3,1,2,0,1,2,2,1,1,1,1,1,3,2,1,0,2,3,1,2,0,1,1,3,3,3,0,2,1,1,3,3,3,0,3,0,2,3,3,2,1,1,3,2]'::jsonb,'board','[1,3,1,0,1,2,1,1,2,2,0,2,3,3,1,1,0,1,1,3,1,1,3,3,1,1,3,2,3,3,3,0,2,2,1,1,0,3,1,0,0,3]'::jsonb,'pos',46),1,'[[19,25],[26,27],[7,13],[16,17],[27,33],[31,37]]'::jsonb),
  '{"ok":true,"score":490,"moves":6,"best":3,"movesLeft":14,"won":false,"over":false}'::jsonb,'vector chain: replay');
select is(public.minigame_candy_fill(public.minigame_candy_arr('[1,3,1,0,1,2,1,1,1,2,2,0,2,3,3,3,1,1,0,2,1,1,3,1,1,3,3,1,1,1,3,2,3,3,3,0,2,2,1,1,0,3,1,0,0,3,0,0,3,1,3,0,3,1,0,1,0,1,2,1,2,2,2,3,3,1,2,0,2,1,1,0,3,2,3,3,1,2,2,0,3,0,0,1,1,0,1,1,2,3,2,0,3,0,2,0,1,1,0,0,1,3,2,3,1,3,0,3,1,1,1,3,3,1,2,0,2,1,2,0,1,1,3,0,0,2,3,3,2,3,0,3,0,2,3,0,2,1,3,2,0,3,1,3,2,3,2,0,3,3,3,1,0,0,0,1,3,1,2,0,1,2,2,1,1,1,1,1,3,2,1,0,2,3,1,2,0,1,1,3,3,3,0,2,1,1,3,3,3,0,3,0,2,3,3,2,1,1,3,2]'::jsonb),4,0),'{"board":[1,3,1,0,1,2,1,1,2,2,0,2,3,3,1,1,0,1,1,3,1,1,3,3,1,1,3,2,3,3,3,0,2,2,1,1,0,3,1,0,0,3],"pos":46}'::jsonb,'vector chain: first board');
select is(public.minigame_candy_replay(jsonb_build_object('tape','[3,3,1,5,4,5,4,0,1,2,0,5,3,1,2,2,4,5,3,4,5,2,4,5,3,2,0,5,1,2,2,2,1,2,4,1,4,3,1,0,0,2,2,0,2,1,1,3,2,0,4,2,4,5,4,4,1,0,4,0,3,5,5,4,2,2,5,3,1,2,2,1,5,3,0,4,5,3,3,0,2,2,3,0,2,4,0,5,3,0,3,3,3,1,1,0,5,0,3,4]'::jsonb,'board','[3,3,1,5,4,5,4,0,1,2,0,5,3,1,2,2,4,3,4,5,2,4,5,3,2,0,5,1,2,2,2,1,2,4,1,4,3,1,0,0,2,2]'::jsonb,'pos',43),3,'[[8,9]]'::jsonb),
  '{"ok":true,"score":30,"moves":1,"best":1,"movesLeft":15,"won":false,"over":false}'::jsonb,'vector regen: replay');
select is(public.minigame_candy_fill(public.minigame_candy_arr('[3,3,1,5,4,5,4,0,1,2,0,5,3,1,2,2,4,5,3,4,5,2,4,5,3,2,0,5,1,2,2,2,1,2,4,1,4,3,1,0,0,2,2,0,2,1,1,3,2,0,4,2,4,5,4,4,1,0,4,0,3,5,5,4,2,2,5,3,1,2,2,1,5,3,0,4,5,3,3,0,2,2,3,0,2,4,0,5,3,0,3,3,3,1,1,0,5,0,3,4]'::jsonb),6,0),'{"board":[3,3,1,5,4,5,4,0,1,2,0,5,3,1,2,2,4,3,4,5,2,4,5,3,2,0,5,1,2,2,2,1,2,4,1,4,3,1,0,0,2,2],"pos":43}'::jsonb,'vector regen: first board');
select is(public.minigame_candy_replay(jsonb_build_object('tape','[2,1,1,3,3,2,2,0,3,2,1,1,0,2,3,3,1,3,2,0,1,2,2,1,0,2,1,1,0,2,3,0,2,3,0,2,3,3,3,1,1,1,1,1,3,0,3,0,3,2,2,3,2,3,3,1,0,0,0,0,3,1,2,1,2,1,2,2,3,0,2,1,0,0,3,2,3,1,3,3,3,2,2,3,2,3,3,0,0,1,1,0,2,0,0,3,1,3,0,2,1,0,1,2,0,0,1,1,2,2,2,0,1,2,2,1,1,1,1,2,3,0,2,3,2,2,0,2,0,3,0,1,0,3,0,1,2,0,2,3,0,2,3,0,1,2,0,2,2,3,2,0,0,1,3,0,2,2,2,2,2,3,2,0,2,0,0,0,1,0,2,0,0,0,0,2,1,2,3,1,2,0,0,2,0,1,0,3,3,1,0,0,1,3,1,0,1,2,3,1]'::jsonb,'board','[2,1,1,3,3,2,2,0,3,2,1,1,0,2,3,3,1,3,2,0,1,2,2,1,0,2,1,1,0,2,3,0,2,3,0,2,3,3,1,1,3,0]'::jsonb,'pos',46),1,'[[24,25],[8,14],[27,28]]'::jsonb),
  '{"ok":true,"score":3560,"moves":3,"best":7,"movesLeft":17,"won":true,"over":true}'::jsonb,'vector win: replay');
select is(public.minigame_candy_fill(public.minigame_candy_arr('[2,1,1,3,3,2,2,0,3,2,1,1,0,2,3,3,1,3,2,0,1,2,2,1,0,2,1,1,0,2,3,0,2,3,0,2,3,3,3,1,1,1,1,1,3,0,3,0,3,2,2,3,2,3,3,1,0,0,0,0,3,1,2,1,2,1,2,2,3,0,2,1,0,0,3,2,3,1,3,3,3,2,2,3,2,3,3,0,0,1,1,0,2,0,0,3,1,3,0,2,1,0,1,2,0,0,1,1,2,2,2,0,1,2,2,1,1,1,1,2,3,0,2,3,2,2,0,2,0,3,0,1,0,3,0,1,2,0,2,3,0,2,3,0,1,2,0,2,2,3,2,0,0,1,3,0,2,2,2,2,2,3,2,0,2,0,0,0,1,0,2,0,0,0,0,2,1,2,3,1,2,0,0,2,0,1,0,3,3,1,0,0,1,3,1,0,1,2,3,1]'::jsonb),4,0),'{"board":[2,1,1,3,3,2,2,0,3,2,1,1,0,2,3,3,1,3,2,0,1,2,2,1,0,2,1,1,0,2,3,0,2,3,0,2,3,3,1,1,3,0],"pos":46}'::jsonb,'vector win: first board');
select is(public.minigame_candy_replay(jsonb_build_object('tape','[4,1,2,1,0,2,2,0,3,4,1,2,4,1,1,3,1,2,1,3,0,3,4,1,0,0,2,1,4,3,4,1,0,0,3,4,4,3,1,3]'::jsonb,'board','[4,1,2,1,0,2,2,0,3,4,1,2,4,1,1,3,1,1,3,0,3,4,0,0,2,1,4,3,4,1,0,0,3,4,4,3,1,3,4,1,2,1]'::jsonb,'pos',44),2,'[[3,4],[2,3],[21,22],[3,9],[1,2],[3,9]]'::jsonb),
  '{"ok":true,"score":180,"moves":6,"best":1,"movesLeft":12,"won":false,"over":false}'::jsonb,'vector wrap: replay');
select is(public.minigame_candy_fill(public.minigame_candy_arr('[4,1,2,1,0,2,2,0,3,4,1,2,4,1,1,3,1,2,1,3,0,3,4,1,0,0,2,1,4,3,4,1,0,0,3,4,4,3,1,3]'::jsonb),5,0),'{"board":[4,1,2,1,0,2,2,0,3,4,1,2,4,1,1,3,1,1,3,0,3,4,0,0,2,1,4,3,4,1,0,0,3,4,4,3,1,3,4,1,2,1],"pos":44}'::jsonb,'vector wrap: first board');

-- layout_candy: a legal first board, a 1000-value tape, the same for a seed
select is(jsonb_array_length(public.minigame_layout_candy(77,1)->'tape'),1000,'tape of 1000');
select is(public.minigame_layout_candy(77,2),public.minigame_layout_candy(77,2),'a seed gives one layout');
select isnt(public.minigame_layout_candy(77,2)->'tape',public.minigame_layout_candy(78,2)->'tape','another seed, another tape');
select is((select count(*)::int from generate_series(1,3) d, generate_series(1,5) s,
  lateral (select public.minigame_layout_candy(s * 101, d) l) x,
  lateral (select public.minigame_candy_arr(l->'board') b) y
  where cardinality(b) = 42 and (select bool_and(c between 0 and 2 + d) from unnest(b) c)
    and cardinality(public.minigame_candy_lines(b)) = 0 and public.minigame_candy_has_move(b)),15,'15 layouts: 42 cells, in range, no run, a move');
select is(public.minigame_candy_swap(public.minigame_candy_arr('[2,1,2,3,2,2,0,3,2,3,2,1,3,0,0,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,3,3,1,2,3,2,0,2,0,2,1]'::jsonb),public.minigame_candy_arr('[2,1,2,3,2,2,0,3,2,3,2,1,3,0,2,0,0,3,3,3,0,1,2,1,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,1,3,3,1,2,3,2,0,2,0,2,1,2,1,1,1,1,3,1,0,1,0,2,0,1,1,1,0,3,1,2,3,2,2,0,2,1,2,2,1,1,3,0,2,3,2,0,2,2,1,3,2,1,3,3,1,0,2,2,3,2,2,0,3,0,0,1,3,1,3,0,3,1,1,0,1,2,3,3,3,2,3,1,0,1,2,2,2,2,1,2,3,2,0,2,0,2,1,1,2,1,1,0,1,0,2,3,2,2,3,3,1,1,1,0,3,1,0,2,1,0,0,0,0,3,2,2,1,0,1,3,1,0,3,1,3,0,0,2,3,1,2,1,3,1,2,2,2,2,2,1,0,3,0,0,1,1,1,2,2]'::jsonb),4,52,0,1),null,'a swap that makes no line is null');
select is(public.minigame_candy_swap(public.minigame_candy_arr('[2,1,2,3,2,2,0,3,2,3,2,1,3,0,0,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,3,3,1,2,3,2,0,2,0,2,1]'::jsonb),public.minigame_candy_arr('[2,1,2,3,2,2,0,3,2,3,2,1,3,0,2,0,0,3,3,3,0,1,2,1,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,1,3,3,1,2,3,2,0,2,0,2,1,2,1,1,1,1,3,1,0,1,0,2,0,1,1,1,0,3,1,2,3,2,2,0,2,1,2,2,1,1,3,0,2,3,2,0,2,2,1,3,2,1,3,3,1,0,2,2,3,2,2,0,3,0,0,1,3,1,3,0,3,1,1,0,1,2,3,3,3,2,3,1,0,1,2,2,2,2,1,2,3,2,0,2,0,2,1,1,2,1,1,0,1,0,2,3,2,2,3,3,1,1,1,0,3,1,0,2,1,0,0,0,0,3,2,2,1,0,1,3,1,0,3,1,3,0,0,2,3,1,2,1,3,1,2,2,2,2,2,1,0,3,0,0,1,1,1,2,2]'::jsonb),4,52,0,2),null,'a non-adjacent swap is null');
select is(public.minigame_candy_swap(public.minigame_candy_arr('[2,1,2,3,2,2,0,3,2,3,2,1,3,0,0,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,3,3,1,2,3,2,0,2,0,2,1]'::jsonb),public.minigame_candy_arr('[2,1,2,3,2,2,0,3,2,3,2,1,3,0,2,0,0,3,3,3,0,1,2,1,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,1,3,3,1,2,3,2,0,2,0,2,1,2,1,1,1,1,3,1,0,1,0,2,0,1,1,1,0,3,1,2,3,2,2,0,2,1,2,2,1,1,3,0,2,3,2,0,2,2,1,3,2,1,3,3,1,0,2,2,3,2,2,0,3,0,0,1,3,1,3,0,3,1,1,0,1,2,3,3,3,2,3,1,0,1,2,2,2,2,1,2,3,2,0,2,0,2,1,1,2,1,1,0,1,0,2,3,2,2,3,3,1,1,1,0,3,1,0,2,1,0,0,0,0,3,2,2,1,0,1,3,1,0,3,1,3,0,0,2,3,1,2,1,3,1,2,2,2,2,2,1,0,3,0,0,1,1,1,2,2]'::jsonb),4,52,5,6),null,'a swap across a row end is null');

insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline)
select 'e3000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','candy','e2000000-0000-4000-8000-000000000004',1,1,
 jsonb_build_object('tape','[2,1,2,3,2,2,0,3,2,3,2,1,3,0,2,0,0,3,3,3,0,1,2,1,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,1,3,3,1,2,3,2,0,2,0,2,1,2,1,1,1,1,3,1,0,1,0,2,0,1,1,1,0,3,1,2,3,2,2,0,2,1,2,2,1,1,3,0,2,3,2,0,2,2,1,3,2,1,3,3,1,0,2,2,3,2,2,0,3,0,0,1,3,1,3,0,3,1,1,0,1,2,3,3,3,2,3,1,0,1,2,2,2,2,1,2,3,2,0,2,0,2,1,1,2,1,1,0,1,0,2,3,2,2,3,3,1,1,1,0,3,1,0,2,1,0,0,0,0,3,2,2,1,0,1,3,1,0,3,1,3,0,0,2,3,1,2,1,3,1,2,2,2,2,2,1,0,3,0,0,1,1,1,2,2]'::jsonb,'board',f->'board','pos',f->'pos'),
 '{"moves":0,"score":0,"best":0,"movesLeft":20,"doneAt":null}',now()-interval '100 seconds',now()+interval '200 seconds'
from (select public.minigame_candy_fill(public.minigame_candy_arr('[2,1,2,3,2,2,0,3,2,3,2,1,3,0,2,0,0,3,3,3,0,1,2,1,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,1,3,3,1,2,3,2,0,2,0,2,1,2,1,1,1,1,3,1,0,1,0,2,0,1,1,1,0,3,1,2,3,2,2,0,2,1,2,2,1,1,3,0,2,3,2,0,2,2,1,3,2,1,3,3,1,0,2,2,3,2,2,0,3,0,0,1,3,1,3,0,3,1,1,0,1,2,3,3,3,2,3,1,0,1,2,2,2,2,1,2,3,2,0,2,0,2,1,1,2,1,1,0,1,0,2,3,2,2,3,3,1,1,1,0,3,1,0,2,1,0,0,0,0,3,2,2,1,0,1,3,1,0,3,1,3,0,0,2,3,1,2,1,3,1,2,2,2,2,2,1,0,3,0,0,1,1,1,2,2]'::jsonb),4,0) f) x;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','[[0,2]]'::jsonb)$$,'P0001','bad_move','not adjacent');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','[[0,1]]'::jsonb)$$,'P0001','bad_move','no line');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','[[1]]'::jsonb)$$,'P0001','bad_move','one cell');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','[[1,"a"]]'::jsonb)$$,'P0001','bad_move','not a number');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','"x"'::jsonb)$$,'P0001','bad_move','not a list');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','[null]'::jsonb)$$,'P0001','bad_move','null move');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','[[0,1.5]]'::jsonb)$$,'P0001','bad_move','fraction');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','[[0,99]]'::jsonb)$$,'P0001','bad_move','out of range');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','[[20,21],[10,16],[0,1],[1,7],[0,6],[2,3],[4,5],[3,9],[2,3],[10,11],[2,3],[8,14],[8,9],[7,8],[1,2],[1,7],[0,1],[1,2],[2,3],[10,11],[0,1]]'::jsonb)$$,'P0001','bad_move','MOVES + 1 moves');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','[[24,25],[8,14],[27,28],[0,1]]'::jsonb)$$,'P0001','bad_move','a move after the target');
select is((select status from public.minigame_rounds where id='e3000000-0000-4000-8000-000000000001'),'open','a bad list leaves the round open');
-- not_finished: a short valid list with time left
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001','[[2,3],[6,7],[0,1],[10,11],[4,10]]'::jsonb)$$,'P0001','not_finished','valid moves, no win, moves left, time left');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001')$$,'P0001','not_finished','no moves at all (null) is a valid empty list');
reset role;
update public.minigame_rounds set deadline=now()-interval '20 seconds' where id='e3000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into rc values ('late',public.minigame_finish('e3000000-0000-4000-8000-000000000001','[[2,3],[6,7],[0,1],[10,11],[4,10]]'::jsonb));
select is((select v->>'status' from rc where k='late'),'lost','past the deadline and its tolerance: lost');
select is((select (v->>'score')::int from rc where k='late'),210,'the receipt carries the replayed score');
reset role;
select is((select progress->>'score' from public.minigame_rounds where id='e3000000-0000-4000-8000-000000000001'),'210','progress holds the score');

insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline)
select 'e3000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000001','candy','e2000000-0000-4000-8000-000000000005',1,1,
 jsonb_build_object('tape','[3,3,1,2,2,0,1,0,2,3,2,3,1,3,2,2,0,3,2,2,1,2,3,3,3,2,1,2,3,0,0,2,1,3,2,1,1,0,0,2,3,2,2,0,3,3,0,1,1,2,3,0,2,2,3,0,1,3,3,3,1,2,3,3,3,1,0,1,0,2,3,0,2,2,0,3,1,0,1,3,1,0,3,1,0,2,1,2,1,1,0,0,3,2,2,2,3,1,3,0,2,2,3,1,1,2,1,1,0,3,2,0,0,3,0,1,0,0,2,0,2,0,3,1,0,3,0,1,0,0,2,1,2,2,1,0,3,3,3,1,2,2,0,3,0,0,0,2,2,1,3,0,0,2,0,2,2,2,2,0,1,1,1,2,2,0,0,0,3,2,2,1,0,2,1,2,3,2,2,0,1,3,2,3,0,0,3,0,2,0,3,3,3,3,0,0,1,0,0,0]'::jsonb,'board',f->'board','pos',f->'pos'),
 '{"moves":0,"score":0,"best":0,"movesLeft":20,"doneAt":null}',now()-interval '100 seconds',now()+interval '200 seconds'
from (select public.minigame_candy_fill(public.minigame_candy_arr('[3,3,1,2,2,0,1,0,2,3,2,3,1,3,2,2,0,3,2,2,1,2,3,3,3,2,1,2,3,0,0,2,1,3,2,1,1,0,0,2,3,2,2,0,3,3,0,1,1,2,3,0,2,2,3,0,1,3,3,3,1,2,3,3,3,1,0,1,0,2,3,0,2,2,0,3,1,0,1,3,1,0,3,1,0,2,1,2,1,1,0,0,3,2,2,2,3,1,3,0,2,2,3,1,1,2,1,1,0,3,2,0,0,3,0,1,0,0,2,0,2,0,3,1,0,3,0,1,0,0,2,1,2,2,1,0,3,3,3,1,2,2,0,3,0,0,0,2,2,1,3,0,0,2,0,2,2,2,2,0,1,1,1,2,2,0,0,0,3,2,2,1,0,2,1,2,3,2,2,0,1,3,2,3,0,0,3,0,2,0,3,3,3,3,0,0,1,0,0,0]'::jsonb),4,0) f) x;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into rc values ('lw',public.minigame_finish('e3000000-0000-4000-8000-000000000002','[[2,3],[1,7],[15,16],[0,1],[6,7],[9,15],[22,23],[8,14],[12,13],[2,3],[1,2],[6,7],[1,7],[6,12],[0,1],[0,6],[23,29],[14,20],[7,8]]'::jsonb));
select is((select v->>'status' from rc where k='lw'),'won','a win on the last-but-one move');
select is((select (v->>'moves')::int from rc where k='lw'),19,'moves');
select is((select (v->>'score')::int from rc where k='lw'),3410,'score');
select is((select (v->>'comboLen')::int from rc where k='lw'),6,'comboLen is the best chain');
reset role;
select is((select progress from public.minigame_quests where user_id='e1000000-0000-4000-8000-000000000001' and kind='play'),2,'play bumped (the lost round and this one)');
select is((select progress from public.minigame_quests where user_id='e1000000-0000-4000-8000-000000000001' and kind='win'),1,'win bumped');
select is((select progress from public.minigame_quests where user_id='e1000000-0000-4000-8000-000000000001' and kind='flawless'),0,'a win with 1 move left is not flawless (needs 5 of 20)');

insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline)
select 'e3000000-0000-4000-8000-000000000003','e1000000-0000-4000-8000-000000000001','candy','e2000000-0000-4000-8000-000000000001',1,1,
 jsonb_build_object('tape','[2,1,1,3,3,2,2,0,3,2,1,1,0,2,3,3,1,3,2,0,1,2,2,1,0,2,1,1,0,2,3,0,2,3,0,2,3,3,3,1,1,1,1,1,3,0,3,0,3,2,2,3,2,3,3,1,0,0,0,0,3,1,2,1,2,1,2,2,3,0,2,1,0,0,3,2,3,1,3,3,3,2,2,3,2,3,3,0,0,1,1,0,2,0,0,3,1,3,0,2,1,0,1,2,0,0,1,1,2,2,2,0,1,2,2,1,1,1,1,2,3,0,2,3,2,2,0,2,0,3,0,1,0,3,0,1,2,0,2,3,0,2,3,0,1,2,0,2,2,3,2,0,0,1,3,0,2,2,2,2,2,3,2,0,2,0,0,0,1,0,2,0,0,0,0,2,1,2,3,1,2,0,0,2,0,1,0,3,3,1,0,0,1,3,1,0,1,2,3,1]'::jsonb,'board',f->'board','pos',f->'pos'),
 '{"moves":0,"score":0,"best":0,"movesLeft":20,"doneAt":null}',now()-interval '100 seconds',now()+interval '200 seconds'
from (select public.minigame_candy_fill(public.minigame_candy_arr('[2,1,1,3,3,2,2,0,3,2,1,1,0,2,3,3,1,3,2,0,1,2,2,1,0,2,1,1,0,2,3,0,2,3,0,2,3,3,3,1,1,1,1,1,3,0,3,0,3,2,2,3,2,3,3,1,0,0,0,0,3,1,2,1,2,1,2,2,3,0,2,1,0,0,3,2,3,1,3,3,3,2,2,3,2,3,3,0,0,1,1,0,2,0,0,3,1,3,0,2,1,0,1,2,0,0,1,1,2,2,2,0,1,2,2,1,1,1,1,2,3,0,2,3,2,2,0,2,0,3,0,1,0,3,0,1,2,0,2,3,0,2,3,0,1,2,0,2,2,3,2,0,0,1,3,0,2,2,2,2,2,3,2,0,2,0,0,0,1,0,2,0,0,0,0,2,1,2,3,1,2,0,0,2,0,1,0,3,3,1,0,0,1,3,1,0,1,2,3,1]'::jsonb),4,0) f) x;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into rc values ('fw',public.minigame_finish('e3000000-0000-4000-8000-000000000003','[[24,25],[8,14],[27,28]]'::jsonb));
select is((select v->>'status' from rc where k='fw'),'won','won');
select is((select (v->>'score')::int from rc where k='fw'),3560,'score');
select is((select (v->>'moves')::int from rc where k='fw'),3,'moves');
select is((select (v->>'comboLen')::int from rc where k='fw'),7,'comboLen');
select is((select (v->>'combo')::numeric from rc where k='fw'),0.1,'combo capped at 10%');
select is((select (v->>'xp')::int from rc where k='fw'),10,'trainer xp 10 x 1');
select is((select jsonb_array_length(v->'gifts') from rc where k='fw'),1,'a size-1 chest');
select is((select v->>'flips' from rc where k='fw'),null,'no flips for candy');
reset role;
select is((select progress from public.minigame_quests where user_id='e1000000-0000-4000-8000-000000000001' and kind='play'),3,'play bumped again');
select is((select progress from public.minigame_quests where user_id='e1000000-0000-4000-8000-000000000001' and kind='flawless'),1,'17 moves left of 20: flawless');
select is((select wins from public.minigame_players where user_id='e1000000-0000-4000-8000-000000000001' and game='candy'),2,'wins counted per game');
select is((select coalesce(sum(count),0)::int from public.bag where user_id='e1000000-0000-4000-8000-000000000001'),2,'gifts in the bag');
select ok((select bonus_exp from public.pokemon_growth where individual_id='e2000000-0000-4000-8000-000000000001') > 0,'exp in the growth row');
-- replay twice: same receipt, nothing paid twice
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.minigame_finish('e3000000-0000-4000-8000-000000000003','[[24,25],[8,14],[27,28]]'::jsonb),(select v from rc where k='fw'),'finish twice, same receipt');
select is(public.minigame_finish('e3000000-0000-4000-8000-000000000003','[[0,1]]'::jsonb),(select v from rc where k='fw'),'a settled round ignores later moves');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000003','[[24,25],[8,14],[27,28]]'::jsonb)$$,'P0001','not_found','another player cannot finish it');
reset role;
select is((select coalesce(sum(count),0)::int from public.bag where user_id='e1000000-0000-4000-8000-000000000001'),2,'no second gifts');
select is((select xp from public.trainer_profiles where user_id='e1000000-0000-4000-8000-000000000001'),23,'no second xp (3 + 10 + 10)');

insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline)
select 'e3000000-0000-4000-8000-000000000004','e1000000-0000-4000-8000-000000000001','candy','e2000000-0000-4000-8000-000000000003',1,1,
 jsonb_build_object('tape','[0,3,2,2,1,1,0,2,2,3,0,2,0,3,1,2,2,0,0,0,0,1,0,3,3,1,3,3,3,3,2,1,2,0,3,3,1,1,0,3,2,2,1,2,3,0,0,3,2,1,3,1,1,3,1,2,1,0,0,0,2,2,2,3,2,2,0,1,3,0,3,0,2,3,1,0,1,2,1,0,2,0,0,1,3,0,2,3,2,2,1,1,2,3,3,0,2,3,1,1,0,3,2,3,0,3,2,1,1,1,0,0,2,2,2,3,3,0,1,3,1,3,1,3,0,0,0,0,2,3,3,1,0,2,0,2,1,2,3,2,2,1,1,0,3,0,2,0,3,3,3,1,2,1,2,3,2,3,2,1,1,1,0,0,0,0,1,0,3,0,0,3,1,0,1,2,0,0,0,2,1,2,3,2,3,2,2,3,3,1,0,1,3,3,0,1,2,2,2,0]'::jsonb,'board',f->'board','pos',f->'pos'),
 '{"moves":0,"score":0,"best":0,"movesLeft":20,"doneAt":null}',now()-interval '100 seconds',now()+interval '200 seconds'
from (select public.minigame_candy_fill(public.minigame_candy_arr('[0,3,2,2,1,1,0,2,2,3,0,2,0,3,1,2,2,0,0,0,0,1,0,3,3,1,3,3,3,3,2,1,2,0,3,3,1,1,0,3,2,2,1,2,3,0,0,3,2,1,3,1,1,3,1,2,1,0,0,0,2,2,2,3,2,2,0,1,3,0,3,0,2,3,1,0,1,2,1,0,2,0,0,1,3,0,2,3,2,2,1,1,2,3,3,0,2,3,1,1,0,3,2,3,0,3,2,1,1,1,0,0,2,2,2,3,3,0,1,3,1,3,1,3,0,0,0,0,2,3,3,1,0,2,0,2,1,2,3,2,2,1,1,0,3,0,2,0,3,3,3,1,2,1,2,3,2,3,2,1,1,1,0,0,0,0,1,0,3,0,0,3,1,0,1,2,0,0,0,2,1,2,3,2,3,2,2,3,3,1,0,1,3,3,0,1,2,2,2,0]'::jsonb),4,0) f) x;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into rc values ('lo',public.minigame_finish('e3000000-0000-4000-8000-000000000004','[[20,21],[10,16],[0,1],[1,7],[0,6],[2,3],[4,5],[3,9],[2,3],[10,11],[2,3],[8,14],[8,9],[7,8],[1,2],[1,7],[0,1],[1,2],[2,3],[10,11]]'::jsonb));
select is((select v->>'status' from rc where k='lo'),'lost','all moves used without the target: lost at once');
select is((select (v->>'score')::int from rc where k='lo'),600,'score');
select is((select jsonb_array_length(v->'gifts') from rc where k='lo'),0,'no gifts');
select is((select (v->>'xp')::int from rc where k='lo'),3,'lose xp 3');
select is((select v->'cost' from rc where k='lo'),'{"hunger":12,"clean":6,"fun":8}'::jsonb,'lose cost');
select is((select (v->>'combo')::numeric from rc where k='lo'),0::numeric,'no combo on a loss');

reset role;
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline)
select 'e3000000-0000-4000-8000-000000000005','e1000000-0000-4000-8000-000000000001','candy','e2000000-0000-4000-8000-000000000006',1,1,
 jsonb_build_object('tape','[2,1,2,3,2,2,0,3,2,3,2,1,3,0,2,0,0,3,3,3,0,1,2,1,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,1,3,3,1,2,3,2,0,2,0,2,1,2,1,1,1,1,3,1,0,1,0,2,0,1,1,1,0,3,1,2,3,2,2,0,2,1,2,2,1,1,3,0,2,3,2,0,2,2,1,3,2,1,3,3,1,0,2,2,3,2,2,0,3,0,0,1,3,1,3,0,3,1,1,0,1,2,3,3,3,2,3,1,0,1,2,2,2,2,1,2,3,2,0,2,0,2,1,1,2,1,1,0,1,0,2,3,2,2,3,3,1,1,1,0,3,1,0,2,1,0,0,0,0,3,2,2,1,0,1,3,1,0,3,1,3,0,0,2,3,1,2,1,3,1,2,2,2,2,2,1,0,3,0,0,1,1,1,2,2]'::jsonb,'board',f->'board','pos',f->'pos'),
 '{"moves":0,"score":0,"best":0,"movesLeft":20,"doneAt":null}',now()-interval '100 seconds',now()-interval '100 seconds'
from (select public.minigame_candy_fill(public.minigame_candy_arr('[2,1,2,3,2,2,0,3,2,3,2,1,3,0,2,0,0,3,3,3,0,1,2,1,1,1,3,3,1,1,3,0,0,1,1,2,3,1,3,0,1,3,3,1,2,3,2,0,2,0,2,1,2,1,1,1,1,3,1,0,1,0,2,0,1,1,1,0,3,1,2,3,2,2,0,2,1,2,2,1,1,3,0,2,3,2,0,2,2,1,3,2,1,3,3,1,0,2,2,3,2,2,0,3,0,0,1,3,1,3,0,3,1,1,0,1,2,3,3,3,2,3,1,0,1,2,2,2,2,1,2,3,2,0,2,0,2,1,1,2,1,1,0,1,0,2,3,2,2,3,3,1,1,1,0,3,1,0,2,1,0,0,0,0,3,2,2,1,0,1,3,1,0,3,1,3,0,0,2,3,1,2,1,3,1,2,2,2,2,2,1,0,3,0,0,1,1,1,2,2]'::jsonb),4,0) f) x;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.minigame_status())->'open','null'::jsonb,'status closes the expired candy round');
reset role;
select is((select status from public.minigame_rounds where id='e3000000-0000-4000-8000-000000000005'),'expired','expired');
select is((select receipt->>'status' from public.minigame_rounds where id='e3000000-0000-4000-8000-000000000005'),'expired','receipt says expired');
select is((select wins from public.minigame_players where user_id='e1000000-0000-4000-8000-000000000001' and game='candy'),2,'an expired round is no win');
-- start: a candy round, its view, one open round, turns per game
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.minigame_status())->'games'->'memory'->>'left','5','memory turns untouched');
select throws_ok($$select public.minigame_start('candy','e2000000-0000-4000-8000-000000000002',1::smallint)$$,'P0001','hungry','a hungry Pokémon');
insert into rc values ('st',public.minigame_start('candy','e2000000-0000-4000-8000-000000000007',2::smallint));
select is((select v->'view'->>'kind' from rc where k='st'),'candy','start: candy view');
select is(jsonb_array_length((select v->'view'->'tape' from rc where k='st')),1000,'the view carries the tape');
select is(jsonb_array_length((select v->'view'->'board' from rc where k='st')),42,'and the board');
select is((select v->'view'->>'target' from rc where k='st'),'3000','target of difficulty 2');
select is((select v->'view'->>'movesMax' from rc where k='st'),'18','moves of difficulty 2');
select is((select v->'view'->>'kinds' from rc where k='st'),'5','kinds of difficulty 2');
select throws_ok($$select public.minigame_start('candy','e2000000-0000-4000-8000-000000000007',1::smallint)$$,'P0001','round_open','a second open candy round');
select is((public.minigame_status())->'games'->'candy'->>'left','4','candy turns are counted per game: one start, four left');
select is((public.minigame_status())->'games'->'memory'->>'left','5','memory turns still untouched');
select throws_ok($$select public.minigame_start('chess','e2000000-0000-4000-8000-000000000007',1::smallint)$$,'P0001','bad_game','unknown game');
select is((public.minigame_status())->'open'->'view'->>'kind','candy','status resumes the open candy round');
select is((select progress->>'movesLeft' from public.minigame_rounds where id=(select (v->>'round')::uuid from rc where k='st')),'18','progress starts with all moves left');
insert into rc values ('mem',public.minigame_start('memory','e2000000-0000-4000-8000-000000000006',1::smallint));
select is((public.minigame_status())->'opens'->'memory'->>'round',(select v->>'round' from rc where k='mem'),'status keeps each game''s open round (memory)');
select is((public.minigame_status())->'opens'->'candy'->'view'->>'kind','candy','status keeps each game''s open round (candy)');
select * from finish();
rollback;
