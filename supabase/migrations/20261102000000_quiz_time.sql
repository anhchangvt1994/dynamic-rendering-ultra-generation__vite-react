-- "Who's That Pokémon?": the Roar of Time (docs/superpowers/specs/2026-11-01-quiz-time-power-design.md)
-- 10 charges, full again 1 hour after the first use. A charge stops a
-- round's clock for 30 s (its gift holds, its deadline moves), or opens a
-- new 3-hour window of turns when none is left. FREEZE_MS, TIME_CHARGES and
-- TIME_WINDOW_MS in src/pages/QuizPage/engine/rules.mjs mirror this file.
-- Its quiz_answer also pays the streak's chest at 5 in a row, not 10
-- (COMBO_AT, src/pages/QuizPage/progress.mjs).

alter table public.quiz_players
  add column time_start timestamptz,
  add column time_used smallint not null default 0;

alter table public.quiz_rounds add column frozen_at timestamptz;

-- a round's clock (ms): the time since it started, less its 30 s stop
create function public.quiz_clock(p_round public.quiz_rounds)
returns numeric
language sql
stable
set search_path = ''
as $$
  select extract(epoch from now() - p_round.started_at) * 1000
    - case when p_round.frozen_at is null then 0
      else least(30000, greatest(0, extract(epoch from now() - p_round.frozen_at) * 1000)) end
$$;

-- the player's row, locked (quiz_window), its charges full again once their
-- hour is over
create function public.quiz_time_window(p_user uuid)
returns public.quiz_players
language plpgsql
set search_path = ''
as $$
declare
  v_player public.quiz_players := public.quiz_window(p_user);
begin
  if v_player.time_start is not null and now() >= v_player.time_start + interval '1 hours' then
    update public.quiz_players set time_start = null, time_used = 0
    where user_id = p_user
    returning * into v_player;
  end if;
  return v_player;
end;
$$;

-- what the browser may know of a round: and when it was stopped
create or replace function public.quiz_public(p_round public.quiz_rounds)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_round.id,
    'options', case when p_round.hard then null else to_jsonb(p_round.options) end,
    'veil', p_round.veil,
    'hard', p_round.hard,
    'gifts', to_jsonb(p_round.gifts),
    'bonus', p_round.bonus_slot,
    'duration_ms', p_round.duration_ms,
    'started_at', p_round.started_at,
    'frozen_at', p_round.frozen_at,
    'now', now()
  )
$$;

-- the player's state, with the charges
create or replace function public.quiz_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_player public.quiz_players := public.quiz_time_window(v_user);
  v_pending public.quiz_rounds;
begin
  select * into v_pending from public.quiz_rounds where user_id = v_user and answered_at is null;
  return jsonb_build_object(
    'left', public.quiz_left(v_player),
    'refill_at', v_player.window_start + interval '3 hours',
    'now', now(),
    'used', v_player.used,
    'bonus', v_player.bonus,
    'wins', v_player.wins,
    'window_gifts', to_jsonb(v_player.window_gifts),
    'streak', v_player.streak,
    'records', v_player.records,
    'records_total', v_player.records_total,
    'rerolls_left', greatest(0, 3 - v_player.rerolls),
    'time_left', 10 - v_player.time_used,
    'time_refill_at', v_player.time_start + interval '1 hours',
    'pending', case when v_pending.id is null then null else public.quiz_public(v_pending) end
  );
end;
$$;

-- the answer, timed on the round's clock (its stop taken out)
create or replace function public.quiz_answer(p_round uuid, p_choice smallint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_round public.quiz_rounds;
  v_player public.quiz_players;
  v_elapsed numeric;
  v_t numeric;
  v_k numeric;
  v_slot smallint := -1;
  v_outcome text;
  v_gift text;
  v_missed text;
  v_lucky boolean := false;
  v_chests jsonb := '[]';
  v_gifts text[];
  v_streak int;
  v_records int;
begin
  select * into v_round from public.quiz_rounds
  where id = p_round and user_id = v_user for update;
  if v_round.id is null then
    raise exception 'no_round' using errcode = 'P0001';
  end if;
  if v_round.answered_at is not null then
    raise exception 'answered' using errcode = 'P0001';
  end if;
  v_player := public.quiz_time_window(v_user);

  v_elapsed := public.quiz_clock(v_round);
  v_t := least(1, greatest(0, v_elapsed - 400) / v_round.duration_ms);
  v_k := 1 - v_t * v_t * (3 - 2 * v_t);
  v_slot := case when v_k > 0.75 then 0 when v_k > 0.5 then 1 when v_k > 0.25 then 2 when v_k > 0 then 3 else -1 end;
  v_outcome := case
    -- -2: the page saw the veil run out (its clock has no grace)
    when p_choice = -2 or v_elapsed >= v_round.duration_ms + 400 or v_slot < 0 then 'time'
    when p_choice = v_round.answer_id then 'right'
    else 'wrong'
  end;

  if v_outcome = 'right' then
    v_gift := v_round.gifts[v_slot + 1];
    v_lucky := v_round.bonus_slot = v_slot;
    v_gifts := array[v_gift];
    v_streak := v_player.streak + 1;
    v_records := v_player.records;
    -- 5 in a row pays the chest (10 in the first migration): COMBO_AT
    if v_streak >= 5 then
      v_streak := 0;
      v_records := v_records + 1;
      v_chests := v_chests || jsonb_build_array(jsonb_build_object(
        'kind', 'combo',
        'gifts', to_jsonb(public.quiz_chest(3 + floor(random() * 3)::int, 1,
          '{"4": 8, "3": 92}', '{"4": 2, "3": 10, "2": 48, "1": 40}'))
      ));
      if v_records >= 10 then
        v_records := 0;
        v_chests := v_chests || jsonb_build_array(jsonb_build_object(
          'kind', 'special',
          'gifts', to_jsonb(public.quiz_chest(10, 3,
            '{"4": 50, "3": 50}', '{"4": 12, "3": 28, "2": 40, "1": 20}'))
        ));
      end if;
    end if;
    v_gifts := v_gifts || array(
      select jsonb_array_elements_text(chest->'gifts') from jsonb_array_elements(v_chests) chest
    );
    insert into public.bag (user_id, item_id, count)
    select v_user, item, count(*) from unnest(v_gifts) item where item is not null group by item
    on conflict (user_id, item_id) do update set count = public.bag.count + excluded.count;

    update public.quiz_players set
      streak = v_streak,
      records = v_records,
      -- one chest of a streak at most per answer: one record more
      records_total = records_total + case when jsonb_array_length(v_chests) > 0 then 1 else 0 end,
      wins = wins + 1,
      window_gifts = (window_gifts || v_gift)[greatest(1, cardinality(window_gifts) + 1 - 11):],
      bonus = case when v_lucky and public.quiz_left(v_player) < 5 then bonus + 1 else bonus end
    where user_id = v_user
    returning * into v_player;
  else
    if v_outcome = 'wrong' then
      v_missed := v_round.gifts[v_slot + 1];
    end if;
    update public.quiz_players set streak = 0 where user_id = v_user returning * into v_player;
  end if;

  update public.quiz_rounds set
    answered_at = now(),
    choice = p_choice,
    outcome = v_outcome,
    slot = case when v_outcome = 'time' then null else v_slot end,
    won_item = v_gift
  where id = v_round.id;

  return jsonb_build_object(
    'outcome', v_outcome,
    'answer_id', v_round.answer_id,
    'slot', case when v_outcome = 'time' then null else v_slot end,
    'gift', v_gift,
    'lucky', v_lucky,
    'missed', v_missed,
    'chests', v_chests,
    'streak', v_player.streak,
    'records', v_player.records,
    'records_total', v_player.records_total,
    'left', public.quiz_left(v_player),
    'refill_at', v_player.window_start + interval '3 hours',
    'wins', v_player.wins,
    'window_gifts', to_jsonb(v_player.window_gifts),
    'used', v_player.used,
    'bonus', v_player.bonus,
    'rerolls_left', greatest(0, 3 - v_player.rerolls),
    'time_left', 10 - v_player.time_used,
    'time_refill_at', v_player.time_start + interval '1 hours'
  );
end;
$$;

-- stop a round's clock for 30 s: one charge, once per round, before its
-- veil is gone
create function public.quiz_time_stop(p_round uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_player public.quiz_players;
  v_round public.quiz_rounds;
begin
  -- NOTE - The round first, then the player (quiz_time_window locks it):
  -- quiz_answer's order, or an answer sent with the stop deadlocks
  select * into v_round from public.quiz_rounds
  where id = p_round and user_id = v_user for update;
  v_player := public.quiz_time_window(v_user);
  if v_round.id is null then
    raise exception 'no_round' using errcode = 'P0001';
  end if;
  if v_round.answered_at is not null then
    raise exception 'answered' using errcode = 'P0001';
  end if;
  if v_round.frozen_at is not null then
    raise exception 'time_used' using errcode = 'P0001';
  end if;
  if public.quiz_clock(v_round) >= v_round.duration_ms then
    raise exception 'time_over' using errcode = 'P0001';
  end if;
  if v_player.time_used >= 10 then
    raise exception 'no_time' using errcode = 'P0001';
  end if;
  update public.quiz_players
  set time_used = time_used + 1, time_start = coalesce(time_start, now())
  where user_id = v_user;
  update public.quiz_rounds set frozen_at = now() where id = v_round.id
  returning * into v_round;
  return public.quiz_public(v_round);
end;
$$;

-- out of turns: a new 3-hour window at once, for one charge (the streak and
-- the records stay)
create function public.quiz_time_refill()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_player public.quiz_players := public.quiz_time_window(v_user);
begin
  if public.quiz_left(v_player) > 0 then
    raise exception 'has_turns' using errcode = 'P0001';
  end if;
  if v_player.time_used >= 10 then
    raise exception 'no_time' using errcode = 'P0001';
  end if;
  update public.quiz_players set
    window_start = null, used = 0, bonus = 0, rerolls = 0, wins = 0, window_gifts = '{}',
    time_used = time_used + 1, time_start = coalesce(time_start, now())
  where user_id = v_user;
  return public.quiz_status();
end;
$$;

revoke execute on function
  public.quiz_clock(public.quiz_rounds),
  public.quiz_time_window(uuid),
  public.quiz_time_stop(uuid),
  public.quiz_time_refill()
from public, anon, authenticated;

grant execute on function public.quiz_time_stop(uuid), public.quiz_time_refill() to authenticated;
