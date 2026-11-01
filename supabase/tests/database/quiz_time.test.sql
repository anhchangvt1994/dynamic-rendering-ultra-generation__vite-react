-- The Roar of Time: yarn db:test
-- Clocks are moved here as postgres (security definer helpers); every play
-- goes through the functions as a user.
begin;
select plan(31);

insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ash@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'gary@example.com', 'authenticated', 'authenticated');

create temp table r (k text primary key, v jsonb);
grant all on r to authenticated, anon;

create function pg_temp.round_id(name text) returns uuid
language sql as $$ select (v->>'id')::uuid from r where k = name $$;
create function pg_temp.answer_of(name text) returns smallint
language sql security definer as $$
  select answer_id from public.quiz_rounds where id = pg_temp.round_id(name)
$$;
-- the round started `started` seconds ago, stopped `frozen` seconds ago
create function pg_temp.clock(name text, started int, frozen int) returns void
language sql security definer as $$
  -- no lucky gift: its turn back would leave a turn when the test spends them all
  update public.quiz_rounds set
    bonus_slot = -1,
    started_at = now() - make_interval(secs => started),
    frozen_at = case when frozen is null then null else now() - make_interval(secs => frozen) end
  where id = pg_temp.round_id(name)
$$;
create function pg_temp.time_start(who uuid, ago interval) returns void
language sql security definer as $$
  update public.quiz_players set time_start = now() - ago where user_id = who
$$;
-- all 10 charges spent (the test plays only a few of them)
create function pg_temp.spend_all(who uuid) returns void
language sql security definer as $$
  update public.quiz_players set time_used = 10 where user_id = who
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is((public.quiz_status()->>'time_left')::int, 10, 'a new player has 10 charges');
select ok(public.quiz_status()->'time_refill_at' = 'null'::jsonb, 'no refill time before the first use');

-- stopped at 3 s, answered at 15 s: judged at 3 s, the first gift
insert into r values ('s1', public.quiz_start(1::smallint, 151::smallint, false));
insert into r values ('s1~', public.quiz_time_stop(pg_temp.round_id('s1')));
select ok((select v->>'frozen_at' is not null from r where k = 's1~'), 'a stopped round tells when it stopped');
select is((public.quiz_status()->>'time_left')::int, 9, 'a stop spends a charge');
select ok((public.quiz_status()->>'time_refill_at')::timestamptz between now() + interval '59 minutes' and now() + interval '1 hour', 'the charges come back 1 hour after the first use');
select ok((public.quiz_status()->'pending'->>'frozen_at') is not null, 'the pending round carries its stop');
select throws_ok($$ select public.quiz_time_stop(pg_temp.round_id('s1')) $$, 'P0001', 'time_used', 'one stop per round');
select pg_temp.clock('s1', 15, 12);
insert into r values ('s1!', public.quiz_answer(pg_temp.round_id('s1'), pg_temp.answer_of('s1')));
select is((select (v->>'slot')::int from r where k = 's1!'), 0, 'stopped at 3 s, answered at 15 s: the first gift');
select is((select (v->>'time_left')::int from r where k = 's1!'), 9, 'a verdict carries the charges');
select ok((select v ? 'time_refill_at' from r where k = 's1!'), 'a verdict carries the charges'' refill time');
select throws_ok($$ select public.quiz_time_stop(pg_temp.round_id('s1')) $$, 'P0001', 'answered', 'no stop on an answered round');

-- stopped at 3 s, answered 40 s after the start: judged at 10 s
insert into r values ('s2', public.quiz_start(1::smallint, 151::smallint, false));
select lives_ok($$ select public.quiz_time_stop(pg_temp.round_id('s2')) $$, 'a second round, a second stop');
select pg_temp.clock('s2', 40, 37);
insert into r values ('s2!', public.quiz_answer(pg_temp.round_id('s2'), pg_temp.answer_of('s2')));
select is((select v->>'outcome' from r where k = 's2!'), 'right', 'stopped, 40 s after the start is not too late');
select is((select (v->>'slot')::int from r where k = 's2!'), 3, 'stopped at 3 s, answered at 40 s: judged at 10 s, the last gift');

-- answered right as the freeze ends: still the gift it locked
insert into r values ('s3', public.quiz_start(1::smallint, 151::smallint, false));
select lives_ok($$ select public.quiz_time_stop(pg_temp.round_id('s3')) $$, 'a third stop');
select pg_temp.clock('s3', 32, 30);
insert into r values ('s3!', public.quiz_answer(pg_temp.round_id('s3'), pg_temp.answer_of('s3')));
select is((select (v->>'slot')::int from r where k = 's3!'), 0, 'stopped at 2 s, answered as the freeze ends: the first gift');

-- a stopped round lasts 30 s longer
insert into r values ('s4', public.quiz_start(1::smallint, 151::smallint, false));
select lives_ok($$ select public.quiz_time_stop(pg_temp.round_id('s4')) $$, 'a fourth stop');
select pg_temp.clock('s4', 35, 33);
insert into r values ('s4!', public.quiz_answer(pg_temp.round_id('s4'), pg_temp.answer_of('s4')));
select is((select v->>'outcome' from r where k = 's4!'), 'right', 'a stopped easy round is not over at 35 s');

-- too late to stop
insert into r values ('s5', public.quiz_start(1::smallint, 151::smallint, false));
select pg_temp.clock('s5', 15, null);
select throws_ok($$ select public.quiz_time_stop(pg_temp.round_id('s5')) $$, 'P0001', 'time_over', 'no stop once the round is over');
select is((public.quiz_status()->>'time_left')::int, 6, 'a refused stop spends nothing');
insert into r values ('s5!', public.quiz_answer(pg_temp.round_id('s5'), pg_temp.answer_of('s5')));

-- out of turns: wake up early
insert into r values ('before', public.quiz_status());
insert into r values ('woke', public.quiz_time_refill());
select is((select (v->>'left')::int from r where k = 'woke'), 5, 'a refill gives 5 turns at once');
select is((select (v->>'rerolls_left')::int from r where k = 'woke'), 3, 'and 3 swaps');
select is((select (v->>'time_left')::int from r where k = 'woke'), 5, 'a refill spends one charge');
select is(
  (select v->>'streak' || '/' || (v->>'records') from r where k = 'woke'),
  (select v->>'streak' || '/' || (v->>'records') from r where k = 'before'),
  'the streak and the records stay'
);
select throws_ok($$ select public.quiz_time_refill() $$, 'P0001', 'has_turns', 'no refill with turns left');

insert into r values ('s6', public.quiz_start(1::smallint, 151::smallint, false));
select pg_temp.spend_all('11111111-1111-1111-1111-111111111111');
select throws_ok($$ select public.quiz_time_stop(pg_temp.round_id('s6')) $$, 'P0001', 'no_time', 'no eleventh charge');
select pg_temp.time_start('11111111-1111-1111-1111-111111111111', interval '1 hour 1 second');
select is((public.quiz_status()->>'time_left')::int, 10, 'the charges are full 1 hour after the first use');

-- another trainer's round
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
insert into r values ('g', public.quiz_start(1::smallint, 151::smallint, false));
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select throws_ok($$ select public.quiz_time_stop(pg_temp.round_id('g')) $$, 'P0001', 'no_round', 'nobody stops another trainer''s round');
select throws_ok($$ update public.quiz_players set time_used = 0 $$, '42501', null, 'nobody resets their own charges');

reset role;
set local role anon;
select throws_ok($$ select public.quiz_time_stop(pg_temp.round_id('s6')) $$, '42501', null, 'guests can not stop time');
select throws_ok($$ select public.quiz_time_refill() $$, '42501', null, 'guests can not wake up early');

reset role;
select * from finish();
rollback;
