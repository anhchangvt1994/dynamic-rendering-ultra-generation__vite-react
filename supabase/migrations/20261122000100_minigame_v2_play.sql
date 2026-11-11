-- Mini-game v2: the flip keeps the match chain, settle pays the combo, adds no badges and
-- keeps the lock order Pokémon -> care -> bag -> trainer; status stops returning badges.
create or replace function public.minigame_flip(p_round uuid, p_index smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_tol integer := (public.minigame_rules()->>'TOLERANCE_S')::integer;
  v_round public.minigame_rounds;
  v_cards jsonb;
  v_n integer;
  v_matched int[];
  v_open int;
  v_flips integer;
  v_face int;
  v_match boolean;
  v_with int;
  v_done boolean := false;
  v_progress jsonb;
  v_run integer;
  v_best integer;
begin
  select * into v_round from public.minigame_rounds where id = p_round and user_id = v_user for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_round.status <> 'open' or now() > v_round.deadline + make_interval(secs => v_tol) then
    raise exception 'round_closed' using errcode = 'P0001';
  end if;
  v_cards := v_round.layout->'cards';
  v_n := jsonb_array_length(v_cards);
  v_matched := array(select jsonb_array_elements_text(v_round.progress->'matched')::int);
  v_open := case when jsonb_typeof(v_round.progress->'open') = 'number' then (v_round.progress->>'open')::int end;
  v_flips := (v_round.progress->>'flips')::int;
  if p_index is null or p_index < 0 or p_index >= v_n or p_index = any(v_matched) then
    raise exception 'bad_index' using errcode = 'P0001';
  end if;
  if v_open = p_index then raise exception 'already_open' using errcode = 'P0001'; end if;
  v_flips := v_flips + 1;
  v_face := (v_cards->>p_index)::int;
  v_progress := v_round.progress;
  if v_open is null then
    v_progress := jsonb_set(jsonb_set(v_progress, '{open}', to_jsonb(p_index::int)), '{flips}', to_jsonb(v_flips));
  else
    v_with := v_open;
    v_match := (v_cards->>v_open)::int = v_face;
    if v_match then
      v_matched := v_matched || v_open || p_index::int;
      v_done := cardinality(v_matched) = v_n;
    end if;
    v_run := case when v_match then coalesce((v_round.progress->>'run')::int, 0) + 1 else 0 end;
    v_best := greatest(coalesce((v_round.progress->>'best')::int, 0), v_run);
    v_progress := jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(v_progress, '{open}', 'null'),
      '{matched}', to_jsonb(v_matched)), '{flips}', to_jsonb(v_flips)), '{run}', to_jsonb(v_run)), '{best}', to_jsonb(v_best));
    if v_done then v_progress := jsonb_set(v_progress, '{doneAt}', to_jsonb(now())); end if;
  end if;
  update public.minigame_rounds set progress = v_progress where id = p_round;
  return jsonb_build_object('face', v_face,
    'open', case when v_open is null then to_jsonb(p_index::int) else 'null'::jsonb end,
    'match', case when v_open is null then 'null'::jsonb else to_jsonb(v_match) end,
    'with', case when v_open is null then 'null'::jsonb else to_jsonb(v_with) end,
    'matched', to_jsonb(v_matched), 'flips', v_flips, 'done', v_done);
end;
$$;

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
begin
  select * into v_round from public.minigame_rounds where id = p_round for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_round.status <> 'open' then return v_round.receipt; end if;
  v_d := v_round.difficulty;
  v_len := coalesce((v_round.progress->>'best')::int, 0);
  v_pairs := (v_rules->'GRID'->(v_d - 1)->>'pairs')::integer;
  v_win := p_status = 'won'
    or (p_status = 'expired' and jsonb_array_length(v_round.progress->'matched') = 2 * v_pairs);
  if v_win and v_len >= 2 then
    v_combo := least((v_rules->>'COMBO_MAX')::numeric, (v_rules->>'COMBO_STEP')::numeric * (v_len - 1));
  end if;
  if v_win and jsonb_array_length(v_round.progress->'matched') <> 2 * v_pairs then
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
  select public.trainer_level(xp) into v_after from public.trainer_profiles where user_id = v_round.user_id;

  v_receipt := jsonb_build_object('round', v_round.id, 'status', case when v_win then 'won' else p_status end,
    'difficulty', v_d, 'exp', v_exp, 'gifts', to_jsonb(v_gifts), 'cost', v_cost, 'xp', v_xp,
    'level', v_after, 'levelUp', v_after > v_before, 'comboLen', v_len, 'combo', v_combo,
    'needs', v_needs, 'flips', (v_round.progress->>'flips')::int);
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
begin
  perform public.minigame_expire(v_user);
  perform public.trainer_grant_xp(v_user, 0);
  select * into v_profile from public.trainer_profiles where user_id = v_user;
  v_level := public.trainer_level(v_profile.xp);
  foreach v_game in array array['memory'] loop
    v_player := public.minigame_window(v_user, v_game);
    v_games := v_games || jsonb_build_object(v_game, jsonb_build_object(
      'left', greatest(0, (v_rules->>'TURNS')::integer - v_player.used),
      'resetAt', case when v_player.window_start is null then null
        else v_player.window_start + make_interval(hours => (v_rules->>'REFILL_HOURS')::integer) end,
      'wins', v_player.wins));
  end loop;
  select * into v_round from public.minigame_rounds where user_id = v_user and status = 'open'
    order by started_at desc limit 1;
  if found then
    v_open := jsonb_build_object('round', v_round.id, 'game', v_round.game,
      'individualId', v_round.individual_id, 'difficulty', v_round.difficulty,
      'startedAt', v_round.started_at, 'deadline', v_round.deadline,
      'view', public.minigame_view(v_round));
  end if;
  return jsonb_build_object(
    'trainer', jsonb_build_object(
      'xp', v_profile.xp, 'level', v_level, 'avatar', v_profile.avatar,
      'team', to_jsonb(v_profile.team), 'slots', public.trainer_team_slots(v_level),
      'owned', (select count(*) from public.pokemon_individuals where user_id = v_user)),
    'games', v_games,
    'open', v_open,
    'now', now());
end;
$$;
