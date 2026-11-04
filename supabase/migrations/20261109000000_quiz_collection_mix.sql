-- "Who's That Pokémon?": the answer follows the player's collection
-- 70% of the answers come from the species the player has caught when there
-- are 10 or more of them in the range, 20% when there are 1-9, none when
-- there are none. An answer is not drawn again for 10 rounds. The page's
-- rule is src/pages/QuizPage/engine/collection.mjs: keep the two in step.

-- the answer: `p_recent` has the newest answer first; the memory shrinks from
-- its oldest end only when both groups are spent
create function public.quiz_pick_answer(p_user uuid, p_from smallint, p_to smallint, p_recent smallint[])
returns smallint
language plpgsql
set search_path = ''
as $$
declare
  v_owned smallint[];
  v_share numeric;
  v_inside boolean;
  v_keep int;
  v_last int := least(1, coalesce(cardinality(p_recent), 0));
  v_memory smallint[];
  v_in smallint[];
  v_out smallint[];
  v_first smallint[];
  v_second smallint[];
begin
  p_recent := coalesce(p_recent, '{}');
  v_owned := array(
    select pokemon_id from public.caught
    where user_id = p_user and pokemon_id between p_from and p_to
  );
  v_share := case
    when cardinality(v_owned) = 0 then 0
    when cardinality(v_owned) >= 10 then 0.7
    else 0.2
  end;
  v_inside := random() < v_share;
  for v_keep in reverse least(cardinality(p_recent), 10)..v_last loop
    v_memory := p_recent[1:v_keep];
    v_in := array(select o from unnest(v_owned) o where o <> all(v_memory));
    v_out := array(
      select g from generate_series(p_from::int, p_to::int) g
      where g <> all(v_owned) and g <> all(v_memory)
    );
    v_first := case when v_inside then v_in else v_out end;
    v_second := case when v_inside then v_out else v_in end;
    if cardinality(v_first) > 0 then
      return v_first[1 + floor(random() * cardinality(v_first))::int];
    elsif cardinality(v_second) > 0 then
      return v_second[1 + floor(random() * cardinality(v_second))::int];
    end if;
  end loop;
  return p_from + floor(random() * (p_to - p_from + 1))::int;
end;
$$;

-- a new round: the answer by the collection's rule, three other options none
-- of which is among the last 10 answers (a recent answer among them would
-- give the answer away) when the range has enough others, in a random order;
-- a veil unlike the last one, four gifts and maybe a bonus turn behind one
create or replace function public.quiz_new_round(p_user uuid, p_from smallint, p_to smallint, p_hard boolean)
returns public.quiz_rounds
language plpgsql
set search_path = ''
as $$
declare
  v_recent smallint[];
  v_answer smallint;
  v_options smallint[];
  v_last_veil text;
  v_veil text;
  v_taken text[] := '{}';
  v_item text;
  v_weights jsonb[] := array[
    '{"4": 2, "3": 10, "2": 50, "1": 38}',
    '{"4": 0.5, "3": 5, "2": 42, "1": 52.5}',
    '{"3": 2, "2": 30, "1": 68}',
    '{"2": 12, "1": 88}'
  ]::jsonb[];
  v_round public.quiz_rounds;
begin
  v_recent := array(
    select answer_id from public.quiz_rounds
    where user_id = p_user order by started_at desc limit 10
  );
  v_answer := public.quiz_pick_answer(p_user, p_from, p_to, v_recent);
  v_options := array(
    select o from unnest(
      array[v_answer] || array(
        select g::smallint from generate_series(p_from::int, p_to::int) g
        where g <> v_answer
        order by (g = any(v_recent)), random() limit 3
      )
    ) o order by random()
  );

  select veil into v_last_veil from public.quiz_rounds
  where user_id = p_user order by started_at desc limit 1;
  select v into v_veil from unnest(array['warp', 'shards', 'torch']) v
  where v is distinct from v_last_veil order by random() limit 1;

  for i in 1..4 loop
    v_item := public.quiz_draw(v_weights[i], p_hard, v_taken);
    if v_item is not null then
      v_taken := v_taken || v_item;
    end if;
  end loop;

  insert into public.quiz_rounds (
    user_id, answer_id, options, veil, hard, range_from, range_to, gifts, bonus_slot, duration_ms
  ) values (
    p_user, v_answer, v_options, v_veil, p_hard, p_from, p_to,
    array(select id from public.quiz_items where id = any(v_taken) order by rank),
    case when random() < 0.25 then floor(random() * cardinality(v_taken))::smallint else -1 end,
    case when p_hard then 22000 else 14000 end
  ) returning * into v_round;
  return v_round;
end;
$$;

revoke execute on function public.quiz_pick_answer(uuid, smallint, smallint, smallint[])
from public, anon, authenticated;
