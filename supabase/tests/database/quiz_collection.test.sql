-- "Who's That Pokémon?": the answer follows the collection (yarn db:test)
-- 70% from the collection with 10+ species, 20% with 1-9, none with none;
-- src/pages/QuizPage/engine/collection.mjs is the same rule.
begin;
select plan(10);
select setseed(0.42);

insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ash@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'gary@example.com', 'authenticated', 'authenticated');

-- the species a trainer has caught, from..to
create function pg_temp.own(p_user uuid, p_from int, p_to int) returns void
language sql security definer as $$
  delete from public.caught where user_id = p_user;
  insert into public.caught (user_id, pokemon_id)
  select p_user, g from generate_series(p_from, p_to) g;
$$;
-- 300 answers: how many are among the trainer's caught, and how many break
-- the range or the recent answers
create function pg_temp.draw(p_user uuid, p_from int, p_to int, p_recent smallint[])
returns table (inside int, stray int)
language plpgsql security definer as $$
declare
  v_answer smallint;
begin
  inside := 0;
  stray := 0;
  for i in 1..300 loop
    v_answer := public.quiz_pick_answer(p_user, p_from::smallint, p_to::smallint, p_recent);
    if exists (select 1 from public.caught where user_id = p_user and pokemon_id = v_answer) then
      inside := inside + 1;
    end if;
    if v_answer not between p_from and p_to or v_answer = any(p_recent) then
      stray := stray + 1;
    end if;
  end loop;
  return next;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated, service_role;

\set ash '''11111111-1111-1111-1111-111111111111'''
\set gary '''22222222-2222-2222-2222-222222222222'''

-- nothing caught: all from outside, in range, none recent
select is((select stray from pg_temp.draw(:ash, 1, 151, array[1,2,3,4,5,6,7,8,9,10]::smallint[])), 0, 'with nothing caught: in the range, none of the last 10');
select is((select inside from pg_temp.draw(:ash, 1, 151, '{}')), 0, 'with nothing caught: none from the collection');

-- 10 caught: about 70%
select pg_temp.own(:ash, 1, 10);
select ok((select inside between 186 and 234 from pg_temp.draw(:ash, 1, 151, '{}')), '10 caught: about 70% come from the collection');
select is((select stray from pg_temp.draw(:ash, 1, 151, '{}')), 0, '10 caught: answers stay in the range');

-- 9 caught: about 20%
select pg_temp.own(:ash, 1, 9);
select ok((select inside between 30 and 90 from pg_temp.draw(:ash, 1, 151, '{}')), '9 caught: about 20% come from the collection');

-- caught outside the range count for nothing
select pg_temp.own(:ash, 1, 10);
select is((select inside + stray from pg_temp.draw(:ash, 152, 251, '{}')), 0, 'caught outside the range: ignored, answers in the range');

-- every caught species is among the last 10 answers: they come from outside
select is((select inside + stray from pg_temp.draw(:ash, 1, 151, array[1,2,3,4,5,6,7,8,9,10]::smallint[])), 0, 'all caught are recent: none repeats, none from the collection');

-- another trainer's collection is not this one's
select ok((select inside < 60 from pg_temp.draw(:gary, 1, 151, '{}')), 'a trainer with nothing caught is not drawn from another''s collection');

-- a round of the game: four distinct options of the range, the answer one of them
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((select count(distinct o)::int from jsonb_array_elements_text(public.quiz_start(1::smallint, 151::smallint, false)->'options') o), 4, 'a started round has four distinct options');
select throws_ok($$ select public.quiz_pick_answer('11111111-1111-1111-1111-111111111111', 1::smallint, 151::smallint, '{}') $$, '42501', null, 'the rule is not callable by a player');

select * from finish();
rollback;
