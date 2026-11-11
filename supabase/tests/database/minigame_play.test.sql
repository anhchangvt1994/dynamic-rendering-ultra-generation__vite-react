begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('e1000000-0000-4000-8000-000000000001','play-a@example.invalid','authenticated','authenticated'),
('e1000000-0000-4000-8000-000000000002','play-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential)
select ('e2000000-0000-4000-8000-00000000000' || n)::uuid, 'e1000000-0000-4000-8000-000000000001', n, 1,
  '{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}'::jsonb, '{"v":1,"offsets":[],"stars":1}'::jsonb
from generate_series(1,6) n;
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values
('e2000000-0000-4000-8000-0000000000b1','e1000000-0000-4000-8000-000000000002',9,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');
-- 1: bond 4, hunger 90 · 2: bond 4, hunger 30 · 3: bond 1 · 4: no care row · 5: bond 4 (expired) · 6: bond 4 (done, unfinished)
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection) values
('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001',90,60,60,now(),60),
('e2000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000001',30,60,60,now(),60),
('e2000000-0000-4000-8000-000000000003','e1000000-0000-4000-8000-000000000001',90,60,60,now(),0),
('e2000000-0000-4000-8000-000000000005','e1000000-0000-4000-8000-000000000001',90,60,60,now(),60),
('e2000000-0000-4000-8000-000000000006','e1000000-0000-4000-8000-000000000001',90,60,60,now(),60);
select public.trainer_grant_xp('e1000000-0000-4000-8000-000000000001',0);
create temp table rc(k text primary key,v jsonb);
grant all on rc to authenticated;

select is((select count(*)::int from pg_proc where proname in ('minigame_settle') and has_function_privilege('authenticated', oid, 'execute')),0,'settle is not callable by players');

-- R1: a win at difficulty 2 (16 cards, 8 pairs), 150 seconds left, flipped in adjacent pairs
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values
('e3000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','memory','e2000000-0000-4000-8000-000000000001',2,1,
 '{"cards":[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8]}','{"open":null,"matched":[],"flips":0,"doneAt":null}',now()-interval '150 seconds',now()+interval '150 seconds');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.minigame_flip('e3000000-0000-4000-8000-000000000001',0::smallint))->>'face','1','a flip shows the face');
select throws_ok($$select public.minigame_flip('e3000000-0000-4000-8000-000000000001',0::smallint)$$,'P0001','already_open','the open card again');
select throws_ok($$select public.minigame_flip('e3000000-0000-4000-8000-000000000001',16::smallint)$$,'P0001','bad_index','out of range');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000001')$$,'P0001','not_finished','cards still face down');
select is((public.minigame_flip('e3000000-0000-4000-8000-000000000001',1::smallint))->>'match','true','a pair');
select throws_ok($$select public.minigame_flip('e3000000-0000-4000-8000-000000000001',1::smallint)$$,'P0001','bad_index','a matched card');
select is((public.minigame_status())->'open'->'view'->'matched','[0,1]'::jsonb,'status resumes the matched cards');
select is((select count(*)::int from jsonb_object_keys((public.minigame_status())->'open'->'view'->'faces')),2,'and shows only those faces');
select public.minigame_flip('e3000000-0000-4000-8000-000000000001',i::smallint) from generate_series(2,14) i;
select is((public.minigame_flip('e3000000-0000-4000-8000-000000000001',15::smallint))->>'done','true','the last pair finishes the board');
insert into rc values ('r1',public.minigame_finish('e3000000-0000-4000-8000-000000000001'));
select is((select v->>'status' from rc where k='r1'),'won','won');
select is((select (v->>'exp')::int from rc where k='r1'),13,'exp = round(10 x 1.15 x 1.1)');
select is((select (v->>'flips')::int from rc where k='r1'),16,'flips');
select is((select v->'cost' from rc where k='r1'),'{"hunger":16,"clean":8,"fun":10}'::jsonb,'win cost at difficulty 2');
select is((select v->'needs' from rc where k='r1'),'{"hunger":74,"clean":52,"fun":50}'::jsonb,'needs after the cost');
select is((select (v->>'xp')::int from rc where k='r1'),20,'trainer xp 10 x 2');
select is((select v->>'levelUp' from rc where k='r1'),'false','no level up');
select is((select jsonb_array_length(v->'gifts') from rc where k='r1'),2,'a size-2 chest');
select ok((select v->'badges' @> '["first_win","flawless"]' from rc where k='r1'),'first win and flawless badges');
reset role;
select is((select bonus_exp from public.pokemon_growth where individual_id='e2000000-0000-4000-8000-000000000001'),13,'exp is in the growth row');
select is((select coalesce(sum(count),0)::int from public.bag where user_id='e1000000-0000-4000-8000-000000000001'),2,'gifts are in the bag');
select is((select xp from public.trainer_profiles where user_id='e1000000-0000-4000-8000-000000000001'),20,'profile xp');
select is((select wins from public.minigame_players where user_id='e1000000-0000-4000-8000-000000000001' and game='memory'),1,'a win is counted');
-- replay: the same receipt, nothing paid twice
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.minigame_finish('e3000000-0000-4000-8000-000000000001'),(select v from rc where k='r1'),'finish twice, same receipt');
reset role;
select is((select bonus_exp from public.pokemon_growth where individual_id='e2000000-0000-4000-8000-000000000001'),13,'no second exp');
select is((select coalesce(sum(count),0)::int from public.bag where user_id='e1000000-0000-4000-8000-000000000001'),2,'no second gifts');
select is((select xp from public.trainer_profiles where user_id='e1000000-0000-4000-8000-000000000001'),20,'no second xp');
select is((select hunger from public.pokemon_care where individual_id='e2000000-0000-4000-8000-000000000001'),74::numeric,'no second cost');

-- R2: a win at hunger 30 stops at the floor 25
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values
('e3000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000001','memory','e2000000-0000-4000-8000-000000000002',2,1,
 '{"cards":[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8]}','{"open":null,"matched":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],"flips":16,"doneAt":null}',now()-interval '10 seconds',now()+interval '290 seconds');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.minigame_finish('e3000000-0000-4000-8000-000000000002'))->'needs'->>'hunger','25','care never falls below 25');

-- R3: a loss at difficulty 3, bond 1: the deadline and its 5 seconds passed
reset role;
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values
('e3000000-0000-4000-8000-000000000003','e1000000-0000-4000-8000-000000000001','memory','e2000000-0000-4000-8000-000000000003',3,1,
 '{"cards":[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10]}','{"open":null,"matched":[],"flips":4,"doneAt":null}',now()-interval '320 seconds',now()-interval '20 seconds');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.minigame_flip('e3000000-0000-4000-8000-000000000003',0::smallint)$$,'P0001','round_closed','a flip after the deadline');
insert into rc values ('r3',public.minigame_finish('e3000000-0000-4000-8000-000000000003'));
select is((select v->>'status' from rc where k='r3'),'lost','lost');
select is((select (v->>'exp')::int from rc where k='r3'),4,'lose exp = 25% of 16');
select is((select v->'gifts' from rc where k='r3'),'[]'::jsonb,'no gifts for a loss');
select is((select v->'cost' from rc where k='r3'),'{"hunger":36,"clean":18,"fun":24}'::jsonb,'lose cost at difficulty 3');
select is((select (v->>'xp')::int from rc where k='r3'),3,'lose xp 3');

-- the deadline only: a flip inside the 5 seconds of tolerance still counts
reset role;
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values
('e3000000-0000-4000-8000-000000000004','e1000000-0000-4000-8000-000000000001','memory','e2000000-0000-4000-8000-000000000003',1,1,
 '{"cards":[1,1,2,2,3,3,4,4,5,5,6,6]}','{"open":null,"matched":[],"flips":0,"doneAt":null}',now()-interval '303 seconds',now()-interval '3 seconds');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.minigame_flip('e3000000-0000-4000-8000-000000000004',0::smallint))->>'open','0','3 seconds late is inside the tolerance');

-- another player cannot touch the round
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.minigame_flip('e3000000-0000-4000-8000-000000000004',1::smallint)$$,'P0001','not_found','flip on another player''s round');
select throws_ok($$select public.minigame_finish('e3000000-0000-4000-8000-000000000004')$$,'P0001','not_found','finish on another player''s round');

-- status closes a round that ran out, once; a finished board that was never submitted wins
reset role;
update public.minigame_rounds set status='lost' where id='e3000000-0000-4000-8000-000000000004';
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values
('e3000000-0000-4000-8000-000000000005','e1000000-0000-4000-8000-000000000001','memory','e2000000-0000-4000-8000-000000000005',1,1,
 '{"cards":[1,1,2,2,3,3,4,4,5,5,6,6]}','{"open":null,"matched":[0,1],"flips":2,"doneAt":null}',now()-interval '400 seconds',now()-interval '100 seconds');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.minigame_status())->'open','null'::jsonb,'status closes the expired round');
reset role;
select is((select status from public.minigame_rounds where id='e3000000-0000-4000-8000-000000000005'),'expired','expired');
select is((select hunger from public.pokemon_care where individual_id='e2000000-0000-4000-8000-000000000005'),78::numeric,'the lose cost (12 x 1) was applied');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.minigame_status();
reset role;
select is((select hunger from public.pokemon_care where individual_id='e2000000-0000-4000-8000-000000000005'),78::numeric,'a second status charges nothing');
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values
('e3000000-0000-4000-8000-000000000006','e1000000-0000-4000-8000-000000000001','memory','e2000000-0000-4000-8000-000000000006',1,1,
 '{"cards":[1,1,2,2,3,3,4,4,5,5,6,6]}',('{"open":null,"matched":[0,1,2,3,4,5,6,7,8,9,10,11],"flips":12,"doneAt":"' || (now()-interval '200 seconds')::text || '"}')::jsonb,now()-interval '400 seconds',now()-interval '100 seconds');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.minigame_status();
reset role;
select is((select status from public.minigame_rounds where id='e3000000-0000-4000-8000-000000000006'),'won','a finished board that was never submitted counts as won');

-- the Pokémon deleted mid-round: lost, no care cost, no error
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values
('e3000000-0000-4000-8000-000000000007','e1000000-0000-4000-8000-000000000001','memory','e2000000-0000-4000-8000-000000000004',1,1,
 '{"cards":[1,1,2,2,3,3,4,4,5,5,6,6]}','{"open":null,"matched":[],"flips":0,"doneAt":null}',now()-interval '400 seconds',now()-interval '100 seconds');
delete from public.pokemon_individuals where id='e2000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into rc values ('r7',public.minigame_finish('e3000000-0000-4000-8000-000000000007'));
select is((select v->>'status' from rc where k='r7'),'lost','lost without a Pokémon');
select is((select v->'cost' from rc where k='r7'),'{"hunger":0,"clean":0,"fun":0}'::jsonb,'and no cost');
select * from finish();
rollback;
