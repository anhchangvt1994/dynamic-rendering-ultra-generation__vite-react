-- Candy Rush: the match-3 game. The rules port src/pages/MiniGamePage/games/candy/engine.mjs
-- (vectors.json keeps both in step). Cells are numbered 0..41 (row * 6 + col) in the API;
-- plpgsql arrays are 1-based, so cell i is element i + 1. The tape is read as tape[pos % length].
-- minigame_finish replays the client's moves; settle, status, view and start learn the new game.
create or replace function public.minigame_rules()
returns jsonb language sql immutable set search_path = '' as $fn$
  select $rules${
  "TURNS": 3,
  "REFILL_HOURS": 2,
  "DURATION_S": 300,
  "TOLERANCE_S": 5,
  "MIN_HUNGER": 40,
  "BASE_EXP": [6, 10, 16],
  "BOND_STEP": 0.05,
  "SPEED_MAX": 0.2,
  "COMBO_STEP": 0.02,
  "COMBO_MAX": 0.1,
  "QUEST_SLOTS": 3,
  "STREAK_DAYS": 7,
  "LOSE_EXP_RATIO": 0.25,
  "COST_WIN": { "hunger": 8, "clean": 4, "fun": 5 },
  "COST_LOSE": { "hunger": 12, "clean": 6, "fun": 8 },
  "XP_WIN": 10,
  "XP_LOSE": 3,
  "XP_SOURCE": { "quiz": 5, "cook": 3, "care": 1, "evolve": 15 },
  "CARE_XP_DAILY": 10,
  "LEVEL_MAX": 30,
  "XP_CURVE": 40,
  "XP_POWER": 1.5,
  "TEAM_MAX": 6,
  "TEAM_EVERY": 5,
  "BOND_WEIGHT": 2,
  "GRID": [
    { "cols": 4, "pairs": 6 },
    { "cols": 4, "pairs": 8 },
    { "cols": 5, "pairs": 10 }
  ],
  "CHEST": [
    { "size": 1, "sure": 0 },
    { "size": 2, "sure": 1 },
    { "size": 3, "sure": 1 }
  ],
  "CHEST_SURE_W": { "3": 92, "4": 8 },
  "CHEST_REST_W": { "1": 40, "2": 48, "3": 10, "4": 2 },
  "CANDY": {
    "COLS": 6,
    "ROWS": 7,
    "KINDS": [4, 5, 6],
    "MOVES": [20, 18, 16],
    "TARGET": [3000, 3000, 2400],
    "CELL": 10,
    "TAPE": 1000,
    "FLAWLESS_LEFT": 0.25
  }
}$rules$::jsonb
$fn$;

-- a jsonb array of numbers as int[] (in order)
create function public.minigame_candy_arr(p_json jsonb)
returns int[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(e::int order by n), '{}'::int[])
  from jsonb_array_elements_text(p_json) with ordinality t(e, n)
$$;

-- sorted cells (0-based) inside a row or column run of 3 or more
create function public.minigame_candy_lines(p_board int[])
returns int[] language plpgsql immutable set search_path = '' as $$
declare
  v_hit boolean[] := array_fill(false, array[42]);
  v_out int[] := '{}';
  v_line int; v_start int; v_step int; v_len int; v_from int; v_i int; v_k int;
begin
  for v_line in 0..12 loop
    if v_line < 7 then v_start := v_line * 6; v_step := 1; v_len := 6;
    else v_start := v_line - 7; v_step := 6; v_len := 7; end if;
    v_from := 0;
    for v_i in 1..v_len loop
      continue when v_i < v_len and p_board[v_start + v_i * v_step + 1] = p_board[v_start + v_from * v_step + 1];
      if v_i - v_from >= 3 and p_board[v_start + v_from * v_step + 1] <> -1 then
        for v_k in v_from..v_i - 1 loop v_hit[v_start + v_k * v_step + 1] := true; end loop;
      end if;
      v_from := v_i;
    end loop;
  end loop;
  for v_i in 1..42 loop
    if v_hit[v_i] then v_out := v_out || (v_i - 1); end if;
  end loop;
  return v_out;
end;
$$;

-- true when swapping two adjacent cells makes a line
create function public.minigame_candy_has_move(p_board int[])
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_b int[];
  v_i int;
  v_j int;
begin
  for v_i in 0..41 loop
    for v_j in
      select x from (values (case when v_i % 6 < 5 then v_i + 1 end), (case when v_i + 6 < 42 then v_i + 6 end)) t(x)
      where x is not null
    loop
      v_b := p_board;
      v_b[v_i + 1] := p_board[v_j + 1];
      v_b[v_j + 1] := p_board[v_i + 1];
      if cardinality(public.minigame_candy_lines(v_b)) > 0 then return true; end if;
    end loop;
  end loop;
  return false;
end;
$$;

-- a board from the tape, reading order: a value that would make 3 in a row with the two
-- cells to its left or above is skipped (consumed); no move on the board: deal again from pos
create function public.minigame_candy_fill(p_tape int[], p_kinds int, p_pos int)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_len int := cardinality(p_tape);
  v_pos int := p_pos;
  v_b int[];
  v_i int; v_r int; v_c int; v_v int; v_attempt int;
begin
  for v_attempt in 1..100 loop
    v_b := array_fill(-1, array[42]);
    for v_i in 0..41 loop
      v_r := v_i / 6;
      v_c := v_i % 6;
      loop
        v_v := p_tape[(v_pos % v_len) + 1];
        v_pos := v_pos + 1;
        continue when v_c >= 2 and v_b[v_i] = v_v and v_b[v_i - 1] = v_v;
        continue when v_r >= 2 and v_b[v_i - 5] = v_v and v_b[v_i - 11] = v_v;
        v_b[v_i + 1] := v_v;
        exit;
      end loop;
    end loop;
    if public.minigame_candy_has_move(v_b) then
      return jsonb_build_object('board', to_jsonb(v_b), 'pos', v_pos);
    end if;
  end loop;
  raise exception 'tape_cannot_make_board' using errcode = 'P0001';
end;
$$;

-- one move: null when not allowed (range, adjacency, no line), else the new board, pos,
-- the points of the whole cascade and its depth (regen: the board was dealt again)
create function public.minigame_candy_swap(p_board int[], p_tape int[], p_kinds int, p_pos int, p_a int, p_b int)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_b int[] := p_board;
  v_len int := cardinality(p_tape);
  v_pos int := p_pos;
  v_lines int[];
  v_keep int[];
  v_gain int := 0;
  v_depth int := 0;
  v_regen boolean := false;
  v_fill jsonb;
  v_i int; v_c int; v_r int; v_k int; v_t int;
begin
  if p_a is null or p_b is null or p_a not between 0 and 41 or p_b not between 0 and 41 or p_a = p_b then return null; end if;
  if not ((abs(p_a - p_b) = 1 and p_a / 6 = p_b / 6) or abs(p_a - p_b) = 6) then return null; end if;
  v_t := v_b[p_a + 1];
  v_b[p_a + 1] := v_b[p_b + 1];
  v_b[p_b + 1] := v_t;
  v_lines := public.minigame_candy_lines(v_b);
  if cardinality(v_lines) = 0 then return null; end if;
  while cardinality(v_lines) > 0 loop
    v_depth := v_depth + 1;
    v_gain := v_gain + 10 * v_depth * cardinality(v_lines);
    foreach v_i in array v_lines loop v_b[v_i + 1] := -1; end loop;
    for v_c in 0..5 loop
      v_keep := '{}';
      for v_r in reverse 6..0 loop
        if v_b[v_r * 6 + v_c + 1] <> -1 then v_keep := v_keep || v_b[v_r * 6 + v_c + 1]; end if;
      end loop;
      v_k := 0;
      for v_r in reverse 6..0 loop
        v_b[v_r * 6 + v_c + 1] := case when v_k < cardinality(v_keep) then v_keep[v_k + 1] else -1 end;
        v_k := v_k + 1;
      end loop;
    end loop;
    for v_c in 0..5 loop
      for v_r in reverse 6..0 loop
        if v_b[v_r * 6 + v_c + 1] = -1 then
          v_b[v_r * 6 + v_c + 1] := p_tape[(v_pos % v_len) + 1];
          v_pos := v_pos + 1;
        end if;
      end loop;
    end loop;
    v_lines := public.minigame_candy_lines(v_b);
  end loop;
  if not public.minigame_candy_has_move(v_b) then
    v_fill := public.minigame_candy_fill(p_tape, p_kinds, v_pos);
    v_b := public.minigame_candy_arr(v_fill->'board');
    v_pos := (v_fill->>'pos')::int;
    v_regen := true;
  end if;
  return jsonb_build_object('board', to_jsonb(v_b), 'pos', v_pos, 'gain', v_gain, 'depth', v_depth, 'regen', v_regen);
end;
$$;

-- a candy round's tape (1000 values from the seed) and the first board dealt from it
create function public.minigame_layout_candy(p_seed bigint, p_difficulty int)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_rules jsonb := public.minigame_rules()->'CANDY';
  v_kinds int := (v_rules->'KINDS'->>(p_difficulty - 1))::int;
  v_tape int[];
  v_fill jsonb;
begin
  select array_agg((('x' || substr(md5(p_seed::text || ':t:' || i::text), 1, 7))::bit(28)::int) % v_kinds order by i)
    into v_tape from generate_series(1, (v_rules->>'TAPE')::int) i;
  v_fill := public.minigame_candy_fill(v_tape, v_kinds, 0);
  return jsonb_build_object('tape', to_jsonb(v_tape), 'board', v_fill->'board', 'pos', v_fill->'pos');
end;
$$;

-- the moves replayed on a layout: {ok, score, moves, best, movesLeft, won, over}; ok is false for
-- any malformed move, an illegal one, a move after the win, or more than MOVES moves
create function public.minigame_candy_replay(p_layout jsonb, p_difficulty int, p_moves jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_bad constant jsonb := '{"ok":false,"score":0,"moves":0,"best":0,"movesLeft":0,"won":false,"over":false}';
  v_rules jsonb := public.minigame_rules()->'CANDY';
  v_max int;
  v_goal int;
  v_kinds int;
  v_tape int[];
  v_board int[];
  v_pos int;
  v_score int := 0;
  v_best int := 0;
  v_made int := 0;
  v_won boolean := false;
  v_mv jsonb;
  v_step jsonb;
  v_a numeric;
  v_b numeric;
begin
  if p_difficulty is null or p_difficulty not between 1 and 3 then return v_bad; end if;
  if coalesce(jsonb_typeof(p_moves), '') <> 'array' then return v_bad; end if;
  v_max := (v_rules->'MOVES'->>(p_difficulty - 1))::int;
  v_goal := (v_rules->'TARGET'->>(p_difficulty - 1))::int;
  v_kinds := (v_rules->'KINDS'->>(p_difficulty - 1))::int;
  v_tape := public.minigame_candy_arr(p_layout->'tape');
  v_board := public.minigame_candy_arr(p_layout->'board');
  v_pos := (p_layout->>'pos')::int;
  for v_mv in select value from jsonb_array_elements(p_moves) with ordinality t(value, n) order by n loop
    if v_won or v_made >= v_max then return v_bad; end if;
    if jsonb_typeof(v_mv) <> 'array' or jsonb_array_length(v_mv) <> 2 then return v_bad; end if;
    if jsonb_typeof(v_mv->0) <> 'number' or jsonb_typeof(v_mv->1) <> 'number' then return v_bad; end if;
    v_a := (v_mv->>0)::numeric;
    v_b := (v_mv->>1)::numeric;
    if v_a <> trunc(v_a) or v_b <> trunc(v_b) or v_a not between 0 and 41 or v_b not between 0 and 41 then return v_bad; end if;
    v_step := public.minigame_candy_swap(v_board, v_tape, v_kinds, v_pos, v_a::int, v_b::int);
    if v_step is null then return v_bad; end if;
    v_board := public.minigame_candy_arr(v_step->'board');
    v_pos := (v_step->>'pos')::int;
    v_score := v_score + (v_step->>'gain')::int;
    v_best := greatest(v_best, (v_step->>'depth')::int);
    v_made := v_made + 1;
    if v_score >= v_goal then v_won := true; end if;
  end loop;
  return jsonb_build_object('ok', true, 'score', v_score, 'moves', v_made, 'best', v_best,
    'movesLeft', v_max - v_made, 'won', v_won, 'over', v_won or v_made = v_max);
exception when others then
  return v_bad;
end;
$$;

-- what the browser may know of a round (a candy round shows its whole tape: the client plays it)
create or replace function public.minigame_view(p_round public.minigame_rounds)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_grid jsonb := public.minigame_rules()->'GRID'->(p_round.difficulty - 1);
  v_candy jsonb := public.minigame_rules()->'CANDY';
  v_matched int[] := array(select jsonb_array_elements_text(p_round.progress->'matched')::int);
  v_open jsonb := p_round.progress->'open';
  v_shown int[] := v_matched;
begin
  if p_round.game = 'candy' then
    return jsonb_build_object('kind', 'candy', 'cols', v_candy->'COLS', 'rows', v_candy->'ROWS',
      'kinds', v_candy->'KINDS'->(p_round.difficulty - 1), 'movesMax', v_candy->'MOVES'->(p_round.difficulty - 1),
      'target', v_candy->'TARGET'->(p_round.difficulty - 1),
      'board', p_round.layout->'board', 'tape', p_round.layout->'tape', 'pos', p_round.layout->'pos');
  end if;
  if v_open is not null and jsonb_typeof(v_open) = 'number' then
    v_shown := v_shown || (v_open #>> '{}')::int;
  end if;
  return jsonb_build_object(
    'cols', v_grid->'cols',
    'cards', jsonb_array_length(p_round.layout->'cards'),
    'matched', p_round.progress->'matched',
    'open', v_open,
    'faces', (select coalesce(jsonb_object_agg(i::text, p_round.layout->'cards'->i), '{}'::jsonb) from unnest(v_shown) i));
end;
$$;

create or replace function public.minigame_start(p_game text, p_individual uuid, p_difficulty smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_rules jsonb := public.minigame_rules();
  v_ind public.pokemon_individuals;
  v_care public.pokemon_care;
  v_player public.minigame_players;
  v_seed bigint;
  v_layout jsonb;
  v_progress jsonb;
  v_round public.minigame_rounds;
  v_hunger numeric;
begin
  if p_game is null or p_game not in ('memory', 'candy') then raise exception 'bad_game' using errcode = 'P0001'; end if;
  if p_difficulty is null or p_difficulty not between 1 and 3 then
    raise exception 'bad_difficulty' using errcode = 'P0001';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':mg:' || p_game, 0));
  perform public.minigame_expire(v_user);
  select * into v_ind from public.pokemon_individuals where id = p_individual and user_id = v_user for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if exists (select 1 from public.minigame_rounds where user_id = v_user and game = p_game and status = 'open') then
    raise exception 'round_open' using errcode = 'P0001';
  end if;
  select * into v_care from public.pokemon_care where individual_id = p_individual;
  if not found then
    v_care.hunger := (public.pokemon_care_rules()->>'START')::numeric;
    v_care.clean := v_care.hunger;
    v_care.fun := v_care.hunger;
    v_care.needs_at := v_ind.created_at;
  end if;
  v_hunger := (public.pokemon_care_now(v_care, now())).hunger;
  if v_hunger < (v_rules->>'MIN_HUNGER')::numeric then raise exception 'hungry' using errcode = 'P0001'; end if;
  v_player := public.minigame_window(v_user, p_game);
  if v_player.used >= (v_rules->>'TURNS')::integer then raise exception 'no_turns' using errcode = 'P0001'; end if;
  update public.minigame_players set used = used + 1, window_start = coalesce(window_start, now())
    where user_id = v_user and game = p_game;
  v_seed := floor(random() * 4503599627370496)::bigint;
  if p_game = 'candy' then
    v_layout := public.minigame_layout_candy(v_seed, p_difficulty);
    v_progress := jsonb_build_object('moves', 0, 'score', 0, 'best', 0,
      'movesLeft', (v_rules->'CANDY'->'MOVES'->>(p_difficulty - 1))::int, 'doneAt', null::text);
  else
    v_layout := public.minigame_layout_memory(v_seed, (v_rules->'GRID'->(p_difficulty - 1)->>'pairs')::integer);
    v_progress := '{"open":null,"matched":[],"flips":0,"doneAt":null}';
  end if;
  insert into public.minigame_rounds (user_id, game, individual_id, difficulty, seed, layout, progress, deadline)
    values (v_user, p_game, p_individual, p_difficulty, v_seed, v_layout, v_progress,
      now() + make_interval(secs => (v_rules->>'DURATION_S')::integer))
    returning * into v_round;
  return jsonb_build_object('round', v_round.id, 'deadline', v_round.deadline, 'view', public.minigame_view(v_round));
end;
$$;

-- settle: the 20261122000200 body; candy wins on p_status = 'won', needs no "not_finished",
-- is flawless with movesLeft >= ceil(FLAWLESS_LEFT x MOVES), and its receipt carries score and moves
create or replace function public.minigame_settle(p_round uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_rules jsonb := public.minigame_rules();
  v_round public.minigame_rounds;
  v_ind public.pokemon_individuals;
  v_care public.pokemon_care;
  v_have_care boolean := false;
  v_win boolean;
  v_d integer;
  v_pairs integer;
  v_bond integer := 1;
  v_base numeric;
  v_left numeric;
  v_exp integer := 0;
  v_gifts text[] := '{}';
  v_cost jsonb := '{"hunger":0,"clean":0,"fun":0}';
  v_per jsonb;
  v_needs jsonb := 'null';
  v_floor numeric := 25;
  v_xp integer;
  v_before integer;
  v_after integer;
  v_len integer;
  v_combo numeric := 0;
  v_receipt jsonb;
  v_hunger numeric;
  v_clean numeric;
  v_fun numeric;
  v_flawless boolean;
begin
  select * into v_round from public.minigame_rounds where id = p_round for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_round.status <> 'open' then return v_round.receipt; end if;
  v_d := v_round.difficulty;
  v_len := coalesce((v_round.progress->>'best')::int, 0);
  if v_round.game = 'candy' then
    v_win := p_status = 'won';
  else
    v_pairs := (v_rules->'GRID'->(v_d - 1)->>'pairs')::integer;
    v_win := p_status = 'won'
      or (p_status = 'expired' and jsonb_array_length(v_round.progress->'matched') = 2 * v_pairs);
  end if;
  if v_win and v_len >= 2 then
    v_combo := least((v_rules->>'COMBO_MAX')::numeric, (v_rules->>'COMBO_STEP')::numeric * (v_len - 1));
  end if;
  if v_round.game = 'memory' and v_win and jsonb_array_length(v_round.progress->'matched') <> 2 * v_pairs then
    raise exception 'not_finished' using errcode = 'P0001';
  end if;
  -- lock order: Pokémon, care, then trainer profile (the care actions take them in this order)
  if v_round.individual_id is not null then
    select * into v_ind from public.pokemon_individuals where id = v_round.individual_id for update;
    if found then
      select * into v_care from public.pokemon_care where individual_id = v_ind.id for update;
      if found then
        v_have_care := true;
      else
        v_care.individual_id := v_ind.id;
        v_care.user_id := v_ind.user_id;
        v_care.hunger := (public.pokemon_care_rules()->>'START')::numeric;
        v_care.clean := v_care.hunger;
        v_care.fun := v_care.hunger;
        v_care.needs_at := v_ind.created_at;
        v_care.affection := 0;
      end if;
      v_bond := public.trainer_bond(v_care.affection);
      v_base := (v_rules->'BASE_EXP'->>(v_d - 1))::numeric * (1 + (v_rules->>'BOND_STEP')::numeric * (v_bond - 1));
      if v_win then
        v_left := greatest(0, least((v_rules->>'DURATION_S')::numeric, extract(epoch from
          (v_round.deadline - coalesce((v_round.progress->>'doneAt')::timestamptz, now())))));
        v_exp := round(v_base * (1 + (v_rules->>'SPEED_MAX')::numeric * v_left / (v_rules->>'DURATION_S')::numeric + v_combo))::integer;
      else
        v_exp := round((v_rules->>'LOSE_EXP_RATIO')::numeric * round(v_base))::integer;
      end if;
      insert into public.pokemon_growth (individual_id, user_id, iv, bonus_exp)
        values (v_ind.id, v_ind.user_id, public.pokemon_birth_iv(v_ind.potential), v_exp)
        on conflict (individual_id) do update set bonus_exp = public.pokemon_growth.bonus_exp + excluded.bonus_exp;

      v_care := public.pokemon_care_now(v_care, now());
      v_per := case when v_win then v_rules->'COST_WIN' else v_rules->'COST_LOSE' end;
      v_hunger := greatest(v_care.hunger - (v_per->>'hunger')::numeric * v_d, least(v_care.hunger, v_floor));
      v_clean := greatest(v_care.clean - (v_per->>'clean')::numeric * v_d, least(v_care.clean, v_floor));
      v_fun := greatest(v_care.fun - (v_per->>'fun')::numeric * v_d, least(v_care.fun, v_floor));
      v_cost := jsonb_build_object('hunger', v_care.hunger - v_hunger, 'clean', v_care.clean - v_clean, 'fun', v_care.fun - v_fun);
      v_needs := jsonb_build_object('hunger', v_hunger, 'clean', v_clean, 'fun', v_fun);
      insert into public.pokemon_care (individual_id, user_id, hunger, clean, fun, needs_at)
        values (v_ind.id, v_ind.user_id, v_hunger, v_clean, v_fun, now())
        on conflict (individual_id) do update
          set hunger = excluded.hunger, clean = excluded.clean, fun = excluded.fun, needs_at = excluded.needs_at;
    end if;
  end if;
  -- no trainer lock yet: the bag comes before the trainer (kitchen and quiz take them in this order)
  v_before := coalesce((select public.trainer_level(xp) from public.trainer_profiles where user_id = v_round.user_id), 1);

  if v_win then
    v_gifts := public.quiz_chest((v_rules->'CHEST'->(v_d - 1)->>'size')::int, (v_rules->'CHEST'->(v_d - 1)->>'sure')::int,
      v_rules->'CHEST_SURE_W', v_rules->'CHEST_REST_W');
    insert into public.bag (user_id, item_id, count)
      select v_round.user_id, item, count(*) from unnest(v_gifts) item where item is not null group by item
      on conflict (user_id, item_id) do update set count = public.bag.count + excluded.count;
    insert into public.minigame_players (user_id, game, wins) values (v_round.user_id, v_round.game, 1)
      on conflict (user_id, game) do update set wins = public.minigame_players.wins + 1;
  end if;
  v_xp := case when v_win then (v_rules->>'XP_WIN')::int * v_d else (v_rules->>'XP_LOSE')::int end;
  perform public.trainer_grant_xp(v_round.user_id, v_xp);
  perform public.quest_bump(v_round.user_id, 'play', 1);
  if v_win then
    perform public.quest_bump(v_round.user_id, 'win', 1);
    v_flawless := case when v_round.game = 'candy'
      then (v_round.progress->>'movesLeft')::int >=
        ceil((v_rules->'CANDY'->>'FLAWLESS_LEFT')::numeric * (v_rules->'CANDY'->'MOVES'->>(v_d - 1))::numeric)
      else (v_round.progress->>'flips')::int = 2 * v_pairs end;
    if v_flawless then
      perform public.quest_bump(v_round.user_id, 'flawless', 1);
    end if;
  end if;
  select public.trainer_level(xp) into v_after from public.trainer_profiles where user_id = v_round.user_id;

  v_receipt := jsonb_build_object('round', v_round.id, 'status', case when v_win then 'won' else p_status end,
    'difficulty', v_d, 'exp', v_exp, 'gifts', to_jsonb(v_gifts), 'cost', v_cost, 'xp', v_xp,
    'level', v_after, 'levelUp', v_after > v_before, 'comboLen', v_len, 'combo', v_combo,
    'needs', v_needs, 'flips', (v_round.progress->>'flips')::int,
    'score', (v_round.progress->>'score')::int, 'moves', (v_round.progress->>'moves')::int);
  update public.minigame_rounds
    set status = case when v_win then 'won' else p_status end, receipt = v_receipt
    where id = p_round;
  return v_receipt;
end;
$$;

create or replace function public.minigame_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_rules jsonb := public.minigame_rules();
  v_profile public.trainer_profiles;
  v_level integer;
  v_games jsonb := '{}';
  v_player public.minigame_players;
  v_game text;
  v_round public.minigame_rounds;
  v_open jsonb;
  v_one jsonb;
  v_opens jsonb := '{}';
begin
  perform public.minigame_expire(v_user);
  perform public.trainer_grant_xp(v_user, 0);
  perform public.quest_ensure(v_user);
  select * into v_profile from public.trainer_profiles where user_id = v_user;
  v_level := public.trainer_level(v_profile.xp);
  foreach v_game in array array['memory', 'candy'] loop
    v_player := public.minigame_window(v_user, v_game);
    v_games := v_games || jsonb_build_object(v_game, jsonb_build_object(
      'left', greatest(0, (v_rules->>'TURNS')::integer - v_player.used),
      'resetAt', case when v_player.window_start is null then null
        else v_player.window_start + make_interval(hours => (v_rules->>'REFILL_HOURS')::integer) end,
      'wins', v_player.wins));
  end loop;
  for v_round in select * from public.minigame_rounds where user_id = v_user and status = 'open'
    order by started_at desc loop
    v_one := jsonb_build_object('round', v_round.id, 'game', v_round.game,
      'individualId', v_round.individual_id, 'difficulty', v_round.difficulty,
      'startedAt', v_round.started_at, 'deadline', v_round.deadline,
      'view', public.minigame_view(v_round));
    v_open := coalesce(v_open, v_one);
    v_opens := v_opens || jsonb_build_object(v_round.game, v_one);
  end loop;
  return jsonb_build_object(
    'trainer', jsonb_build_object(
      'xp', v_profile.xp, 'level', v_level, 'avatar', v_profile.avatar,
      'team', to_jsonb(v_profile.team), 'slots', public.trainer_team_slots(v_level),
      'owned', (select count(*) from public.pokemon_individuals where user_id = v_user)),
    'games', v_games,
    'quests', jsonb_build_object(
      'day', (now() at time zone 'utc')::date,
      'streak', v_profile.quest_streak, 'streakDay', v_profile.quest_streak_day,
      'items', (select coalesce(jsonb_agg(jsonb_build_object('slot', q.slot, 'kind', q.kind, 'goal', q.goal,
          'progress', q.progress, 'xp', (k.c->>'xp')::int, 'claimed', q.claimed_at is not null, 'gift', q.gift)
          order by q.slot), '[]')
        from public.minigame_quests q
        join lateral (select c from jsonb_array_elements(public.minigame_quest_catalog()) c where c->>'kind' = q.kind) k on true
        where q.user_id = v_user and q.day = (now() at time zone 'utc')::date)),
    'open', v_open,
    'opens', v_opens,
    'now', now());
end;
$$;

-- finish: memory as before; candy replays the client's moves (null counts as none). A malformed
-- or illegal list raises bad_move and changes nothing. Past the deadline (and its tolerance) the
-- round is lost; a win inside the time settles at once, and so does running out of moves.
drop function public.minigame_finish(uuid);
create function public.minigame_finish(p_round uuid, p_moves jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_tol integer := (public.minigame_rules()->>'TOLERANCE_S')::integer;
  v_round public.minigame_rounds;
  v_pairs integer;
  v_res jsonb;
  v_late boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':mg:finish', 0));
  select * into v_round from public.minigame_rounds where id = p_round and user_id = v_user;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_round.status <> 'open' then return v_round.receipt; end if;
  v_late := now() > v_round.deadline + make_interval(secs => v_tol);
  if v_round.game = 'candy' then
    v_res := public.minigame_candy_replay(v_round.layout, v_round.difficulty, coalesce(p_moves, '[]'::jsonb));
    if not (v_res->>'ok')::boolean then raise exception 'bad_move' using errcode = 'P0001'; end if;
    if not v_late and not ((v_res->>'won')::boolean or (v_res->>'over')::boolean) then
      raise exception 'not_finished' using errcode = 'P0001';
    end if;
    -- the replay is the record, even for a round that came too late
    update public.minigame_rounds
      set progress = jsonb_build_object('moves', v_res->'moves', 'score', v_res->'score', 'best', v_res->'best',
        'movesLeft', v_res->'movesLeft',
        'doneAt', case when (v_res->>'won')::boolean and not v_late then to_jsonb(now()) else null end)
      where id = p_round;
    return public.minigame_settle(p_round, case when (v_res->>'won')::boolean and not v_late then 'won' else 'lost' end);
  end if;
  v_pairs := (public.minigame_rules()->'GRID'->(v_round.difficulty - 1)->>'pairs')::integer;
  if jsonb_array_length(v_round.progress->'matched') = 2 * v_pairs then
    return public.minigame_settle(p_round, 'won');
  end if;
  if not v_late then
    raise exception 'not_finished' using errcode = 'P0001';
  end if;
  return public.minigame_settle(p_round, 'lost');
end;
$$;

revoke execute on function
  public.minigame_candy_arr(jsonb), public.minigame_candy_lines(int[]), public.minigame_candy_has_move(int[]),
  public.minigame_candy_fill(int[], int, int), public.minigame_candy_swap(int[], int[], int, int, int, int),
  public.minigame_layout_candy(bigint, int), public.minigame_candy_replay(jsonb, int, jsonb),
  public.minigame_view(public.minigame_rounds), public.minigame_settle(uuid, text),
  public.minigame_finish(uuid, jsonb), public.minigame_status(), public.minigame_start(text, uuid, smallint)
  from public, anon, authenticated;
grant execute on function public.minigame_finish(uuid, jsonb), public.minigame_status(),
  public.minigame_start(text, uuid, smallint) to authenticated;
