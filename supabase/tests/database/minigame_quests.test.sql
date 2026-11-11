begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('c1000000-0000-4000-8000-000000000001','quest-a@example.invalid','authenticated','authenticated'),
('c1000000-0000-4000-8000-000000000002','quest-b@example.invalid','authenticated','authenticated'),
('c1000000-0000-4000-8000-000000000003','quest-c@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',25,8,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection) values
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',90,60,60,now(),10);

select is((select count(*)::int from pg_proc where proname in ('minigame_quest_catalog','quest_ensure','quest_bump') and has_function_privilege('authenticated', oid, 'execute')),0,'quest helpers are not callable by players');
select is((select count(*)::int from pg_proc where proname='minigame_quest_claim' and has_function_privilege('authenticated', oid, 'execute')),1,'claim is callable');
select is(jsonb_array_length(public.minigame_quest_catalog()),7,'seven quest kinds');

-- ensure: 3 distinct kinds, idempotent, stable per user and day
select public.quest_ensure('c1000000-0000-4000-8000-000000000001');
select public.quest_ensure('c1000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001'),3,'three rows, twice ensured');
select is((select count(distinct kind)::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001'),3,'distinct kinds');
select is((select array_agg(slot order by slot) from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001'),array[1,2,3]::smallint[],'slots 1..3');
create temp table k1 as select array_agg(kind order by slot) ks from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001';
delete from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001';
select public.quest_ensure('c1000000-0000-4000-8000-000000000001');
select is((select array_agg(kind order by slot) from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001'),(select ks from k1),'same user and day, same kinds');
select is((select count(*)::int from public.minigame_quests q join lateral jsonb_array_elements(public.minigame_quest_catalog()) c on c->>'kind'=q.kind and (c->>'goal')::int=q.goal where q.user_id='c1000000-0000-4000-8000-000000000001'),3,'goals come from the catalog');

-- bump: matching kind adds, capped at goal; others unchanged; never raises
update public.minigame_quests set kind='care', goal=3, progress=0, claimed_at=null where user_id='c1000000-0000-4000-8000-000000000001' and slot=1;
update public.minigame_quests set kind='cook', goal=1, progress=0 where user_id='c1000000-0000-4000-8000-000000000001' and slot=2;
update public.minigame_quests set kind='win', goal=1, progress=0 where user_id='c1000000-0000-4000-8000-000000000001' and slot=3;
select public.quest_bump('c1000000-0000-4000-8000-000000000001','care',2);
select is((select progress::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001' and slot=1),2,'bump adds n');
select public.quest_bump('c1000000-0000-4000-8000-000000000001','care',5);
select is((select progress::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001' and slot=1),3,'bump stops at the goal');
select public.quest_bump('c1000000-0000-4000-8000-000000000001','evolve',1);
select is((select sum(progress)::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001' and slot>1),0,'a kind with no row changes nothing');
select lives_ok($$select public.quest_bump('c1000000-0000-4000-8000-0000000000ff','care',1)$$,'an unknown user does not raise');
select lives_ok($$select public.quest_bump(null,'care',1)$$,'a null user does not raise');
select is((select count(*)::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-0000000000ff'),0,'and leaves no rows');

-- hooks: the four xp triggers (user A, no profile yet)
update public.minigame_quests set kind='quiz_win', goal=2, progress=0 where user_id='c1000000-0000-4000-8000-000000000001' and slot=1;
insert into public.quiz_rounds(id,user_id,answer_id,options,veil,hard,range_from,range_to,gifts,bonus_slot,duration_ms,answered_at) values
('c3000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',25,'{25,1,2,3}','warp',false,1,151,'{}',0,10000,now());
update public.quiz_rounds set outcome='right' where id='c3000000-0000-4000-8000-000000000001';
select is((select progress::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001' and slot=1),1,'a right quiz answer bumps quiz_win');
update public.minigame_quests set kind='cook', goal=3, progress=0 where user_id='c1000000-0000-4000-8000-000000000001' and slot=1;
insert into public.kitchen_dishes values ('c1000000-0000-4000-8000-000000000001','poffin-pecha',1);
select is((select progress::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001' and slot=1),1,'a first dish bumps cook by 1');
update public.kitchen_dishes set count=3 where user_id='c1000000-0000-4000-8000-000000000001';
select is((select progress::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001' and slot=1),3,'cooking two more bumps by the difference');
update public.kitchen_dishes set count=2 where user_id='c1000000-0000-4000-8000-000000000001';
update public.minigame_quests set progress=0 where user_id='c1000000-0000-4000-8000-000000000001' and slot=1;
select is((select progress::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001' and slot=1),0,'eating a dish bumps nothing');
update public.minigame_quests set kind='care', goal=3, progress=0 where user_id='c1000000-0000-4000-8000-000000000001' and slot=1;
insert into public.pokemon_care_ops(user_id,operation_id,individual_id,action,receipt) values
('c1000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','pet','{}');
select is((select progress::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001' and slot=1),1,'a care action bumps care');
update public.minigame_quests set kind='evolve', goal=1, progress=0 where user_id='c1000000-0000-4000-8000-000000000001' and slot=1;
insert into public.pokemon_evolution_log(user_id,operation_id,individual_id,branch,receipt) values
('c1000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001',0,'{}');
select is((select progress::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001' and slot=1),1,'an evolution bumps evolve');

-- hooks: settled rounds bump play, win, flawless
update public.minigame_quests set kind='play', goal=2, progress=0 where user_id='c1000000-0000-4000-8000-000000000001' and slot=1;
update public.minigame_quests set kind='win', goal=1, progress=0 where user_id='c1000000-0000-4000-8000-000000000001' and slot=2;
update public.minigame_quests set kind='flawless', goal=1, progress=0 where user_id='c1000000-0000-4000-8000-000000000001' and slot=3;
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values
('c6000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','memory','c2000000-0000-4000-8000-000000000001',1,1,
 '{"cards":[1,1,2,2,3,3,4,4,5,5,6,6]}','{"open":null,"matched":[],"flips":0,"doneAt":null,"run":0,"best":0}',now()-interval '100 seconds',now()-interval '10 seconds');
select public.minigame_settle('c6000000-0000-4000-8000-000000000001','lost');
select is((select array_agg(progress::int order by slot) from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001'),array[1,0,0],'a lost round bumps play only');
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values
('c6000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','memory','c2000000-0000-4000-8000-000000000001',1,1,
 '{"cards":[1,1,2,2,3,3,4,4,5,5,6,6]}','{"open":null,"matched":[0,1,2,3,4,5,6,7,8,9,10,11],"flips":20,"doneAt":null,"run":3,"best":3}',now()-interval '100 seconds',now()+interval '200 seconds');
select public.minigame_settle('c6000000-0000-4000-8000-000000000002','won');
select is((select array_agg(progress::int order by slot) from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001'),array[2,1,0],'a sloppy win bumps play and win');
update public.minigame_quests set progress=0 where user_id='c1000000-0000-4000-8000-000000000001';
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values
('c6000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000001','memory','c2000000-0000-4000-8000-000000000001',1,1,
 '{"cards":[1,1,2,2,3,3,4,4,5,5,6,6]}','{"open":null,"matched":[0,1,2,3,4,5,6,7,8,9,10,11],"flips":12,"doneAt":null,"run":6,"best":6}',now()-interval '100 seconds',now()+interval '200 seconds');
select public.minigame_settle('c6000000-0000-4000-8000-000000000003','won');
select is((select array_agg(progress::int order by slot) from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001'),array[1,1,1],'a flawless win bumps play, win and flawless');

-- claim (user B, rows forced)
select public.quest_ensure('c1000000-0000-4000-8000-000000000002');
update public.minigame_quests set kind='win', goal=1, progress=1 where user_id='c1000000-0000-4000-8000-000000000002' and slot=1;
update public.minigame_quests set kind='cook', goal=1, progress=0 where user_id='c1000000-0000-4000-8000-000000000002' and slot=2;
update public.minigame_quests set kind='play', goal=2, progress=2 where user_id='c1000000-0000-4000-8000-000000000002' and slot=3;
select public.trainer_grant_xp('c1000000-0000-4000-8000-000000000002',0);
create temp table rc(k text primary key,v jsonb);
grant all on rc to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.minigame_quest_claim(0::smallint)$$,'P0001','bad_slot','slot 0');
select throws_ok($$select public.minigame_quest_claim(4::smallint)$$,'P0001','bad_slot','slot 4');
select throws_ok($$select public.minigame_quest_claim(2::smallint)$$,'P0001','not_done','not done yet');
select is((select count(*)::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000002' and claimed_at is not null),0,'a failed claim claims nothing');
reset role;
create temp table before1 as select (select xp from public.trainer_profiles where user_id='c1000000-0000-4000-8000-000000000002') xp, (select coalesce(sum(count),0)::int from public.bag where user_id='c1000000-0000-4000-8000-000000000002') n;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into rc select 'c1', public.minigame_quest_claim(1::smallint);
reset role;
select is((select v->>'xp' from rc where k='c1'),'8','a win quest pays 8 xp');
select is((select xp from public.trainer_profiles where user_id='c1000000-0000-4000-8000-000000000002'),(select xp+8 from before1),'trainer xp grew by exactly the catalog xp');
select is((select coalesce(sum(count),0)::int from public.bag where user_id='c1000000-0000-4000-8000-000000000002'),(select n+1 from before1),'one gift in the bag');
select is(jsonb_array_length((select v->'gift' from rc where k='c1')),1,'the receipt lists the gift');
select is((select v->>'streak' from rc where k='c1'),'1','first claim: streak 1');
select isnt((select claimed_at from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000002' and slot=1),null,'the row is claimed');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into rc select 'c2', public.minigame_quest_claim(1::smallint);
reset role;
select is((select v from rc where k='c2'),(select v from rc where k='c1'),'a second claim returns the same receipt');
select is((select coalesce(sum(count),0)::int from public.bag where user_id='c1000000-0000-4000-8000-000000000002'),(select n+1 from before1),'and adds nothing');
select is((select xp from public.trainer_profiles where user_id='c1000000-0000-4000-8000-000000000002'),(select xp+8 from before1),'nor xp');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into rc select 'c3', public.minigame_quest_claim(3::smallint);
reset role;
select is((select v->>'streak' from rc where k='c3'),'1','a second claim the same day keeps the streak');

-- streak transitions (user B; claim state reset by hand between cases)
create function pg_temp.reset_slot(p_slot int, p_streak int, p_day_offset int) returns void language sql as $$
  update public.minigame_quests set claimed_at=null, gift=null, progress=goal where user_id='c1000000-0000-4000-8000-000000000002' and slot=p_slot;
  update public.trainer_profiles set quest_streak=p_streak, quest_streak_day=(now() at time zone 'utc')::date + p_day_offset where user_id='c1000000-0000-4000-8000-000000000002';
$$;
create function pg_temp.claim_as_b(p_slot int) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
  set local role authenticated;
  r := public.minigame_quest_claim(p_slot::smallint);
  reset role;
  return r;
end $$;
select pg_temp.reset_slot(1, 3, -1);
select is((pg_temp.claim_as_b(1))->>'streak','4','claim the day after: streak +1');
select pg_temp.reset_slot(1, 3, -3);
select is((pg_temp.claim_as_b(1))->>'streak','1','a missed day: streak back to 1');
select pg_temp.reset_slot(1, 6, -1);
select is((select quest_streak::int from public.trainer_profiles where user_id='c1000000-0000-4000-8000-000000000002'),6,'streak at 6');
create temp table rc7 as select pg_temp.claim_as_b(1) v;
select isnt((select v->'streakGift' from rc7),'null'::jsonb,'day 7 pays a streak gift');
select is((select quest_streak::int from public.trainer_profiles where user_id='c1000000-0000-4000-8000-000000000002'),0,'and the streak resets to 0');
select is((select v->>'streak' from rc7),'7','the receipt shows 7');
select is((pg_temp.claim_as_b(1)),(select v from rc7),'replaying day 7 returns the same receipt');
select is((select quest_streak::int from public.trainer_profiles where user_id='c1000000-0000-4000-8000-000000000002'),0,'and does not move the streak');
update public.trainer_profiles set quest_streak_day=(now() at time zone 'utc')::date - 1 where user_id='c1000000-0000-4000-8000-000000000002';
update public.minigame_quests set claimed_at=null, gift=null, progress=goal where user_id='c1000000-0000-4000-8000-000000000002' and slot=3;
select is((pg_temp.claim_as_b(3))->>'streak','1','the day after day 7 goes to 1, not 8');

-- midnight: a row of yesterday is claimable today and the streak counts by today
delete from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000003';
insert into public.minigame_quests(user_id,day,slot,kind,goal,progress) values
('c1000000-0000-4000-8000-000000000003',(now() at time zone 'utc')::date - 1,1,'win',1,1);
select public.trainer_grant_xp('c1000000-0000-4000-8000-000000000003',0);
create function pg_temp.claim_as_c(p_slot int) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
  set local role authenticated;
  r := public.minigame_quest_claim(p_slot::smallint);
  reset role;
  return r;
end $$;
select is((pg_temp.claim_as_c(1))->>'streak','1','yesterday''s row is claimable today, streak 1');
select is((select quest_streak_day from public.trainer_profiles where user_id='c1000000-0000-4000-8000-000000000003'),(now() at time zone 'utc')::date,'the streak day is the claim day');

-- status lists today's quests and the streak
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(jsonb_array_length((public.minigame_status())->'quests'->'items'),3,'status lists three quests');
select is((public.minigame_status())->'quests'->>'day',(now() at time zone 'utc')::date::text,'for today');
select ok((public.minigame_status())->'quests' ? 'streak','with the streak');
select ok(not ((public.minigame_status())->'trainer' ? 'badges'),'and still no badges');

-- row level security
select is((select count(*)::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000001'),0,'B cannot read A''s quests');
select is((select count(*)::int from public.minigame_quests where user_id='c1000000-0000-4000-8000-000000000002'),3,'B reads their own');
select throws_ok($$update public.minigame_quests set progress=99$$,'42501',null,'players cannot write quests');
select * from finish();
rollback;
