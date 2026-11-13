begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('d1000000-0000-4000-8000-000000000001','mg-a@example.invalid','authenticated','authenticated'),
('d1000000-0000-4000-8000-000000000002','mg-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',25,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}'),
('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001',1,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}'),
('d2000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000002',4,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');
-- the second one is at the edge of hunger 40
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at) values
('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001',40,60,60,now());

select is((select count(*)::int from pg_proc where proname in ('minigame_window','minigame_expire','minigame_settle','minigame_view','minigame_layout_memory') and has_function_privilege('authenticated', oid, 'execute')),0,'minigame helpers are not callable by players');

-- a guest is refused
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok($$select public.minigame_status()$$,'P0001','not_signed_in');
select throws_ok($$select public.minigame_start('memory','d2000000-0000-4000-8000-000000000001',1::smallint)$$,'P0001','not_signed_in');

select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
reset role;
select is((select count(*)::int from public.trainer_profiles where user_id='d1000000-0000-4000-8000-000000000001'),0,'no profile before the first status');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
create temp table st(k text primary key,v jsonb);
grant all on st to authenticated;
insert into st values ('first',public.minigame_status());
select ok((select (v->>'now')::timestamptz from st where k='first') between now()-interval '1 minute' and now()+interval '1 minute','status carries the server clock');
select is((select v->'trainer'->>'xp' from st where k='first'),'0','new trainer has 0 xp');
select is((select v->'trainer'->>'avatar' from st where k='first'),'rookie','default avatar');
select is((select v->'trainer'->>'level' from st where k='first'),'1','level 1');
select is((select v->'trainer'->>'slots' from st where k='first'),'1','one slot');
select is((select v->'trainer'->>'owned' from st where k='first'),'2','owned count');
select is((select v->'games'->'memory'->>'left' from st where k='first'),'5','five turns');
select is((select v->'games'->'memory'->'resetAt' from st where k='first'),'null'::jsonb,'no reset before the first turn');
select is((select v->'open' from st where k='first'),'null'::jsonb,'no open round');
select public.minigame_status();
reset role;
select is((select count(*)::int from public.trainer_profiles where user_id='d1000000-0000-4000-8000-000000000001'),1,'a second status creates nothing more');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- refusals
select throws_ok($$select public.minigame_start('chess','d2000000-0000-4000-8000-000000000001',1::smallint)$$,'P0001','bad_game');
select throws_ok($$select public.minigame_start('memory','d2000000-0000-4000-8000-000000000001',4::smallint)$$,'P0001','bad_difficulty');
select throws_ok($$select public.minigame_start('memory','d2000000-0000-4000-8000-000000000003',1::smallint)$$,'P0001','not_found','another player''s Pokémon');
select throws_ok($$select public.minigame_start('memory',gen_random_uuid(),1::smallint)$$,'P0001','not_found','unknown id');
reset role;
select is((select count(*)::int from public.minigame_players where user_id='d1000000-0000-4000-8000-000000000001' and used>0),0,'refusals spend no turn');
update public.pokemon_care set hunger=39.99 where individual_id='d2000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.minigame_start('memory','d2000000-0000-4000-8000-000000000002',1::smallint)$$,'P0001','hungry','39.99 is hungry');
reset role;
update public.pokemon_care set hunger=40 where individual_id='d2000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- a Pokémon with no care row starts at 60 and can play
insert into st values ('r1',public.minigame_start('memory','d2000000-0000-4000-8000-000000000001',2::smallint));
select is((select v->'view'->>'cols' from st where k='r1'),'4','4 columns at difficulty 2');
select is((select v->'view'->>'cards' from st where k='r1'),'16','16 cards at difficulty 2');
select is((select v->'view'->'matched' from st where k='r1'),'[]'::jsonb,'nothing matched');
select is((select v->'view'->'open' from st where k='r1'),'null'::jsonb,'nothing open');
select is((select (v->>'deadline')::timestamptz from st where k='r1'),now()+interval '300 seconds','deadline = 5 minutes');
select throws_ok($$select layout from public.minigame_rounds$$,'42501',null,'the layout is not readable');
select throws_ok($$select seed from public.minigame_rounds$$,'42501',null,'nor the seed');
select is((select count(*)::int from public.minigame_rounds),1,'but the round is');
select throws_ok($$select public.minigame_start('memory','d2000000-0000-4000-8000-000000000002',1::smallint)$$,'P0001','round_open','one open round per game');
select is((public.minigame_status())->'open'->>'round',(select v->>'round' from st where k='r1'),'status returns the open round');
select is((public.minigame_status())->'games'->'memory'->>'left','4','one turn spent');
reset role;
-- two more turns need the round closed
update public.minigame_rounds set status='lost' where status='open';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.minigame_start('memory','d2000000-0000-4000-8000-000000000002',1::smallint);
reset role;
update public.minigame_rounds set status='lost' where status='open';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.minigame_start('memory','d2000000-0000-4000-8000-000000000001',3::smallint);
reset role;
update public.minigame_rounds set status='lost' where status='open';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.minigame_start('memory','d2000000-0000-4000-8000-000000000001',1::smallint);
reset role;
update public.minigame_rounds set status='lost' where status='open';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.minigame_start('memory','d2000000-0000-4000-8000-000000000001',1::smallint);
reset role;
update public.minigame_rounds set status='lost' where status='open';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.minigame_start('memory','d2000000-0000-4000-8000-000000000001',1::smallint)$$,'P0001','no_turns','the 6th turn');
select is((public.minigame_status())->'games'->'memory'->>'left','0','no turns left');
select is(((public.minigame_status())->'games'->'memory'->>'resetAt')::timestamptz,(select window_start+interval '2 hours' from public.minigame_players where game='memory'),'reset time is window start + 2h');
reset role;
update public.minigame_players set window_start=now()-interval '2 hours' where user_id='d1000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.minigame_status())->'games'->'memory'->>'left','5','exactly two hours later: five turns');
select * from finish();
rollback;
