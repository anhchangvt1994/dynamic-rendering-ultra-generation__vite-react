-- Palkia's help: yarn db:test
-- A stop with the Roar of Time takes 2 wrong options away half of the time,
-- and on its own draw tells the name's first letter 1 time in 5.
begin;
select plan(17);

insert into auth.users (id, email, aud, role)
values ('11111111-1111-1111-1111-111111111111', 'ash@example.com', 'authenticated', 'authenticated');

create temp table r (k text primary key, v jsonb);
grant all on r to authenticated;

create function pg_temp.round_id(name text) returns uuid
language sql as $$ select (v->>'id')::uuid from r where k = name $$;
create function pg_temp.row_of(name text) returns public.quiz_rounds
language sql security definer as $$
  select * from public.quiz_rounds where id = pg_temp.round_id(name)
$$;
-- 400 draws of Palkia on a round: how many took options away, and whether
-- every draw took exactly 2 of its wrong options
create function pg_temp.draws(name text, out helped int, out fair boolean)
language plpgsql security definer as $$
declare
  v_round public.quiz_rounds := pg_temp.row_of(name);
  v_removed smallint[];
begin
  helped := 0;
  fair := true;
  for i in 1..400 loop
    v_removed := public.quiz_palkia(v_round);
    if v_removed is not null then
      helped := helped + 1;
      fair := fair and cardinality(v_removed) = 2 and v_removed[1] <> v_removed[2]
        and v_removed <@ v_round.options and not (v_round.answer_id = any (v_removed));
    end if;
  end loop;
end;
$$;
create function pg_temp.set_removed(name text) returns void
language sql security definer as $$
  update public.quiz_rounds set removed = array(
    select o from unnest(options) o where o <> answer_id limit 2
  ) where id = pg_temp.round_id(name)
$$;
create function pg_temp.removed_of(name text) returns smallint[]
language sql security definer as $$
  select removed from public.quiz_rounds where id = pg_temp.round_id(name)
$$;
-- 400 draws of the letter: how many told it, and whether always the right one
create function pg_temp.hints(name text, out told int, out right_letter boolean)
language plpgsql security definer as $$
declare
  v_round public.quiz_rounds := pg_temp.row_of(name);
  v_letter text;
  v_first text;
begin
  told := 0;
  right_letter := true;
  v_first := (select (array['B', 'P', 'M'])[i] from (values (1, 1), (2, 25), (3, 150)) t(i, id) where id = v_round.answer_id);
  for i in 1..400 loop
    v_letter := public.quiz_hint(v_round);
    if v_letter is not null then
      told := told + 1;
      right_letter := right_letter and v_letter ~ '^[A-Z]$'
        and (v_first is null or v_letter = v_first);
    end if;
  end loop;
end;
$$;
-- a round whose answer is a known Pokémon (Pikachu: P)
create function pg_temp.answer_is(name text, pokemon smallint) returns void
language sql security definer as $$
  update public.quiz_rounds set answer_id = pokemon, options = array[pokemon, 1, 4, 7]
  where id = pg_temp.round_id(name)
$$;
create function pg_temp.letter_of(name text) returns text
language sql security definer as $$
  select letter from public.quiz_rounds where id = pg_temp.round_id(name)
$$;
grant execute on all functions in schema pg_temp to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into r values ('easy', public.quiz_start(1::smallint, 151::smallint, false));
select ok((select v ? 'removed' from r where k = 'easy'), 'a round tells which options Palkia took away');
select ok((select v->'removed' = 'null'::jsonb from r where k = 'easy'), 'none before the stop');
select ok((select v ? 'letter' and v->'letter' = 'null'::jsonb from r where k = 'easy'), 'no letter before the stop');
select is((select helped between 160 and 240 from pg_temp.draws('easy')), true, 'Palkia helps about half of the stops');
select is((select fair from pg_temp.draws('easy')), true, 'it takes 2 wrong options away, never the answer');
select throws_ok($$ select public.quiz_palkia(pg_temp.row_of('easy')) $$, '42501', null, 'nobody calls Palkia');
select throws_ok($$ select public.quiz_hint(pg_temp.row_of('easy')) $$, '42501', null, 'nobody asks for the letter');

-- the stop: Palkia's draw is kept on the round
insert into r values ('easy~', public.quiz_time_stop(pg_temp.round_id('easy')));
select is(
  (select v->'removed' from r where k = 'easy~'),
  coalesce(to_jsonb(pg_temp.removed_of('easy')), 'null'),
  'the stop tells what Palkia took away, and the round keeps it'
);
select is(public.quiz_status()->'pending'->'removed', coalesce(to_jsonb(pg_temp.removed_of('easy')), 'null'), 'a reload brings it back');
select is((select v->>'letter' from r where k = 'easy~'), pg_temp.letter_of('easy'), 'the stop tells the letter it drew, and the round keeps it');
select ok(
  (select v->'removed' = 'null'::jsonb or jsonb_array_length(v->'removed') = 2 from r where k = 'easy~'),
  'nothing or 2 options'
);

-- a taken option sent anyway (straight to the API) is a wrong answer
select pg_temp.set_removed('easy');
insert into r values ('easy!', public.quiz_answer(pg_temp.round_id('easy'), (pg_temp.removed_of('easy'))[1]));
select is((select v->>'outcome' from r where k = 'easy!'), 'wrong', 'a taken option is wrong');

-- the letter: 1 stop in 5, Pikachu's is P (from the quiz's own labels)
insert into r values ('pika', public.quiz_start(1::smallint, 151::smallint, false));
select pg_temp.answer_is('pika', 25::smallint);
select is((select told between 48 and 112 from pg_temp.hints('pika')), true, 'Palkia tells the letter about 1 stop in 5');
select is((select right_letter from pg_temp.hints('pika')), true, 'the letter is the name''s first');
select public.quiz_answer(pg_temp.round_id('pika'), 25::smallint);

-- typed rounds have no options to take away
insert into r values ('hard', public.quiz_start(1::smallint, 151::smallint, true));
select is((select helped from pg_temp.draws('hard')), 0, 'Palkia never helps a typed round');
insert into r values ('hard~', public.quiz_time_stop(pg_temp.round_id('hard')));
select ok((select v->'removed' = 'null'::jsonb from r where k = 'hard~'), 'a typed round stopped: nothing taken');
select is((select told > 0 from pg_temp.hints('hard')), true, 'a typed round can be told the letter');

reset role;
select * from finish();
rollback;
