-- "Who's That Pokémon?" played on the server: yarn db:test
-- Rounds are read here as postgres (reset role) only to learn their answers
-- and to move their clocks; every play goes through the functions as a user.
begin;
select plan(58);

insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ash@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'gary@example.com', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'misty@example.com', 'authenticated', 'authenticated');

-- what the test keeps between calls: rounds and verdicts by name
create temp table r (k text primary key, v jsonb);
grant all on r to authenticated, service_role;

create function pg_temp.round_id(name text) returns uuid
language sql as $$ select (v->>'id')::uuid from r where k = name $$;
create function pg_temp.answer_of(name text) returns smallint
language sql security definer as $$
  select answer_id from public.quiz_rounds where id = pg_temp.round_id(name)
$$;
create function pg_temp.wrong_of(name text) returns smallint
language sql security definer as $$
  select o from public.quiz_rounds, unnest(options) o
  where id = pg_temp.round_id(name) and o <> answer_id limit 1
$$;
create function pg_temp.backdate(name text, seconds int) returns void
language sql security definer as $$
  update public.quiz_rounds set started_at = now() - make_interval(secs => seconds)
  where id = pg_temp.round_id(name)
$$;
-- no lucky gift on the round: its turn back would leave a turn when the
-- test spends them all (1 run in 4 drew it)
create function pg_temp.no_luck(name text) returns void
language sql security definer as $$
  update public.quiz_rounds set bonus_slot = -1 where id = pg_temp.round_id(name)
$$;
-- what the Node proxy does when the artwork does not come
create function pg_temp.break_art(name text) returns void
language sql security definer as $$
  update public.quiz_rounds set art_failed = true where id = pg_temp.round_id(name)
$$;
-- Misty played Kalos 30 times (650-679, a second apart): her next 12 rounds
-- show no option among her last 30 answers, so no option can be crossed off
create function pg_temp.decoys_fresh() returns boolean
language plpgsql security definer as $$
declare
  v_user uuid := '33333333-3333-3333-3333-333333333333';
  v_recent smallint[];
  v_round public.quiz_rounds;
  v_ok boolean := true;
begin
  insert into public.quiz_rounds (user_id, answer_id, options, veil, hard, range_from, range_to,
    gifts, bonus_slot, duration_ms, started_at, answered_at)
  select v_user, 649 + i, array[650, 651, 652, 653], 'warp', false, 650, 721, '{}', -1, 14000,
    now() - make_interval(secs => 100 - i), now()
  from generate_series(1, 30) i;
  for i in 1..12 loop
    v_recent := array(select answer_id from public.quiz_rounds
      where user_id = v_user order by started_at desc limit 30);
    v_round := public.quiz_new_round(v_user, 650::smallint, 721::smallint, false);
    v_ok := v_ok and not (v_round.options && v_recent);
    update public.quiz_rounds set answered_at = now(), started_at = now() + make_interval(secs => i)
    where id = v_round.id;
  end loop;
  return v_ok;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated, service_role;

-- Ash ------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is((public.quiz_status()->>'left')::int, 5, 'a new player has 5 turns');
insert into r values ('a', public.quiz_start(1::smallint, 151::smallint, false));
select is((public.quiz_status()->>'left')::int, 4, 'starting a round spends a turn');
select is(public.quiz_start(1::smallint, 151::smallint, false)->>'id', (select v->>'id' from r where k = 'a'), 'starting again resumes the pending round');
select is((public.quiz_status()->>'left')::int, 4, 'resuming spends nothing');
select ok(not (select v ? 'answer_id' from r where k = 'a'), 'a round never carries its answer');
select is((select jsonb_array_length(v->'options') from r where k = 'a'), 4, 'four options');
select ok((select bool_and(o::int between 1 and 151) from r, jsonb_array_elements_text(v->'options') o where k = 'a'), 'options within the range');
select ok((select (v->'options') @> to_jsonb(pg_temp.answer_of('a')) from r where k = 'a'), 'the answer is one of the options');
select is((select jsonb_array_length(v->'gifts') from r where k = 'a'), 4, 'four gifts on the round');

select pg_temp.no_luck('a');
insert into r values ('a!', public.quiz_answer(pg_temp.round_id('a'), pg_temp.answer_of('a')));
select is((select v->>'outcome' from r where k = 'a!'), 'right', 'the right answer at once is right');
select is((select (v->>'slot')::int from r where k = 'a!'), 0, 'answering at once wins the first gift');
select is((select v->>'gift' from r where k = 'a!'), (select v->'gifts'->>0 from r where k = 'a'), 'the first gift is the round''s first');
select is((select count from public.bag where item_id = (select v->>'gift' from r where k = 'a!')), 1, 'the gift is in the bag');
select is((select (v->>'answer_id')::smallint from r where k = 'a!'), pg_temp.answer_of('a'), 'the verdict tells the answer');
select is((public.quiz_status()->>'streak')::int, 1, 'the streak grows');
select ok((select v ?& array['used', 'bonus', 'rerolls_left', 'left', 'refill_at'] from r where k = 'a!'), 'a verdict carries the whole new status');
select is((public.quiz_status()->>'wins')::int, 1, 'the window counts the win');
select throws_ok($$ select public.quiz_answer(pg_temp.round_id('a'), 1::smallint) $$, 'P0001', 'answered', 'a round can not be answered twice');

-- too late: right, but the veil was gone
insert into r values ('b', public.quiz_start(1::smallint, 151::smallint, false));
select pg_temp.backdate('b', 30);
insert into r values ('b!', public.quiz_answer(pg_temp.round_id('b'), pg_temp.answer_of('b')));
select is((select v->>'outcome' from r where k = 'b!'), 'time', 'a right answer after the veil is gone is too late');
select ok((select v->'gift' = 'null'::jsonb from r where k = 'b!'), 'no gift when time is up');
select is((public.quiz_status()->>'streak')::int, 0, 'time breaks the streak');

-- half way: a later gift
insert into r values ('h', public.quiz_start(1::smallint, 151::smallint, false));
select pg_temp.backdate('h', 9);
select pg_temp.no_luck('h');
insert into r values ('h!', public.quiz_answer(pg_temp.round_id('h'), pg_temp.answer_of('h')));
select is((select (v->>'slot')::int from r where k = 'h!'), 2, '9 of 14 s (veil a third left): the third gift');

-- wrong
insert into r values ('c', public.quiz_start(1::smallint, 151::smallint, false));
insert into r values ('c!', public.quiz_answer(pg_temp.round_id('c'), pg_temp.wrong_of('c')));
select is((select v->>'outcome' from r where k = 'c!'), 'wrong', 'a wrong name is wrong');
select is((select v->>'missed' from r where k = 'c!'), (select v->'gifts'->>0 from r where k = 'c'), 'a wrong answer tells the gift it missed');
select is((select sum(count)::int from public.bag), 2, 'only the right answers filled the bag');

-- the veil ran out on the page: -2 is time, whatever the server's grace
insert into r values ('t', public.quiz_start(1::smallint, 151::smallint, false));
select pg_temp.backdate('t', 14);
insert into r values ('t!', public.quiz_answer(pg_temp.round_id('t'), -2::smallint));
select is((select v->>'outcome' from r where k = 't!'), 'time', 'the page''s time up (-2) is time, not a wrong answer');
select ok((select v->'missed' = 'null'::jsonb from r where k = 't!'), 'time up misses no named gift');

-- out of turns
select throws_ok($$ select public.quiz_start(1::smallint, 151::smallint, false) $$, 'P0001', 'no_turns', 'no sixth round in the window');
select ok((public.quiz_status()->>'refill_at')::timestamptz > now() + interval '2 hours 59 minutes', 'the turns come back 3 hours after the first round');
select ok(
  (select count(*) = 0 from r, jsonb_array_elements_text(v->'gifts') g join public.quiz_items i on i.id = g
   where r.k in ('a', 'b', 'h', 'c', 't') and i.hard),
  'no TM or HM unless the name is typed'
);

-- a new window
reset role;
update public.quiz_players set window_start = now() - interval '3 hours 1 second'
where user_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
insert into r values ('f', public.quiz_start(1::smallint, 151::smallint, false));
select is((public.quiz_status()->>'left')::int, 4, 'a new window once the old one is over');
select is((public.quiz_status()->>'wins')::int, 0, 'the new window counts from zero');

-- a broken artwork: 3 swaps for free, only when the proxy saw it break
select throws_ok($$ select public.quiz_reroll(pg_temp.round_id('f')) $$, 'P0001', 'art_ok', 'no swap of an artwork that came through');
select pg_temp.break_art('f');
insert into r values ('f1', public.quiz_reroll(pg_temp.round_id('f')));
select is((select v->'gifts' from r where k = 'f1'), (select v->'gifts' from r where k = 'f'), 'a swap keeps the gifts');
select is((select v->'bonus' from r where k = 'f1'), (select v->'bonus' from r where k = 'f'), 'a swap keeps the bonus turn where it was');
select pg_temp.break_art('f1');
insert into r values ('f2', public.quiz_reroll(pg_temp.round_id('f1')));
select pg_temp.break_art('f2');
insert into r values ('f3', public.quiz_reroll(pg_temp.round_id('f2')));
select pg_temp.break_art('f3');
select is((public.quiz_status()->>'left')::int, 4, 'swapping a Pokémon costs no turn');
select throws_ok($$ select public.quiz_reroll(pg_temp.round_id('f3')) $$, 'P0001', 'no_rerolls', 'a fourth swap is refused');

-- the chests: streak 10 and the tenth record
reset role;
update public.quiz_players set streak = 9, records = 9
where user_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
insert into r values ('f3!', public.quiz_answer(pg_temp.round_id('f3'), pg_temp.answer_of('f3')));
select is((select jsonb_array_length(v->'chests') from r where k = 'f3!'), 2, 'a streak of 10 that is the tenth record pays two chests');
select ok(
  (select jsonb_array_length(v->'chests'->0->'gifts') between 3 and 5 and v->'chests'->0->>'kind' = 'combo' from r where k = 'f3!'),
  'the streak chest holds 3 to 5 gifts'
);
select ok(
  (select count(*) >= 1 from r, jsonb_array_elements_text(v->'chests'->0->'gifts') g join public.quiz_items i on i.id = g
   where r.k = 'f3!' and i.tier >= 3),
  'the streak chest holds a rare gift at least'
);
select ok(
  (select count(*) >= 3 from r, jsonb_array_elements_text(v->'chests'->1->'gifts') g join public.quiz_items i on i.id = g
   where r.k = 'f3!' and i.tier >= 3 and jsonb_array_length(v->'chests'->1->'gifts') = 10 and v->'chests'->1->>'kind' = 'special'),
  'the special chest holds 10 gifts, 3 rare at least'
);
select is(
  (select array[(v->>'streak')::int, (v->>'records')::int, (v->>'records_total')::int] from r where k = 'f3!'),
  array[0, 0, 1],
  'the streak and the records start over; the total keeps count'
);

-- the window runs out while a round waits: picking it up costs nothing
insert into r values ('g', public.quiz_start(1::smallint, 151::smallint, false));
reset role;
update public.quiz_players set window_start = now() - interval '3 hours 1 second'
where user_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
select is(public.quiz_start(1::smallint, 151::smallint, false)->>'id', (select v->>'id' from r where k = 'g'), 'a round left over a window''s end is picked up again');
select is((public.quiz_status()->>'left')::int, 5, 'picking it up spends nothing in the new window');
insert into r values ('g!', public.quiz_answer(pg_temp.round_id('g'), -1::smallint));
insert into r values ('i', public.quiz_start(1::smallint, 151::smallint, false));
select is((public.quiz_status()->>'left')::int, 4, 'the next round opens the new window');

-- what a user can not do
select throws_ok($$ select * from public.quiz_rounds $$, '42501', null, 'nobody reads the rounds (they hold the answers)');
select throws_ok($$ insert into public.bag (user_id, item_id, count) values ('11111111-1111-1111-1111-111111111111', 'rare-candy', 99) $$, '42501', null, 'nobody fills their own bag');
select throws_ok($$ update public.quiz_players set streak = 9 $$, '42501', null, 'nobody sets their own streak');
select throws_ok($$ select public.quiz_art(pg_temp.round_id('a')) $$, '42501', null, 'a user can not ask for a round''s answer');
select throws_ok($$ select public.quiz_art_failed(pg_temp.round_id('i')) $$, '42501', null, 'a user can not mark their artwork broken');

-- Gary -----------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ select public.quiz_answer(pg_temp.round_id('f3'), 1::smallint) $$, 'P0001', 'no_round', 'nobody answers another trainer''s round');
select is((select count(*)::int from public.bag), 0, 'nobody sees another trainer''s bag');
select throws_ok($$ select public.quiz_start(5::smallint, 7::smallint, false) $$, 'P0001', 'bad_range', 'a range of fewer than 4 Pokémon is refused');
select throws_ok($$ select public.quiz_start(1::smallint, 31::smallint, false) $$, 'P0001', 'bad_range', 'only the whole Pokédex or a generation');
insert into r values ('k', public.quiz_start(650::smallint, 721::smallint, true));
select ok(coalesce(r.v->'options', 'null'::jsonb) = 'null'::jsonb, 'a typed round shows no options to pick from') from r where k = 'k';
insert into r values ('k!', public.quiz_answer(pg_temp.round_id('k'), -1::smallint));

-- no option is one of the last answers (the answer never is) ----------------
reset role;
select ok(pg_temp.decoys_fresh(), 'the other options are not recent answers either');

-- the Node proxy ---------------------------------------------------------------
reset role;
set local role service_role;
select is(public.quiz_art(pg_temp.round_id('a')), pg_temp.answer_of('a'), 'the server role reads a round''s answer for its artwork');
select public.quiz_art_failed(pg_temp.round_id('i'));
reset role;
select ok((select art_failed from public.quiz_rounds where id = pg_temp.round_id('i')), 'the server role marks a round''s artwork broken');

select * from finish();
rollback;
