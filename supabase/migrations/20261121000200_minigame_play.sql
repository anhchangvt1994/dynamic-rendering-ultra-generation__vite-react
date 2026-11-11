-- Mini game play: card flips (the server reveals one card at a time),
-- settle (the only writer of a round's status: exp, gifts, care cost, trainer
-- xp and badges, once) and finish. Rules mirror minigame.mjs and games/memory/rules.mjs.
create function public.minigame_flip(p_round uuid, p_index smallint)
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
    v_progress := jsonb_set(jsonb_set(jsonb_set(v_progress, '{open}', 'null'),
      '{matched}', to_jsonb(v_matched)), '{flips}', to_jsonb(v_flips));
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
  v_badges text[] := '{}';
  v_badge text;
  v_receipt jsonb;
  v_hunger numeric;
  v_clean numeric;
  v_fun numeric;
begin
  select * into v_round from public.minigame_rounds where id = p_round for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_round.status <> 'open' then return v_round.receipt; end if;
  v_d := v_round.difficulty;
  v_pairs := (v_rules->'GRID'->(v_d - 1)->>'pairs')::integer;
  v_win := p_status = 'won'
    or (p_status = 'expired' and jsonb_array_length(v_round.progress->'matched') = 2 * v_pairs);
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
        v_exp := round(v_base * (1 + (v_rules->>'SPEED_MAX')::numeric * v_left / (v_rules->>'DURATION_S')::numeric))::integer;
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
  perform public.trainer_grant_xp(v_round.user_id, 0);
  select public.trainer_level(xp) into v_before from public.trainer_profiles where user_id = v_round.user_id;

  if v_win then
    v_gifts := public.quiz_chest((v_rules->'CHEST'->(v_d - 1)->>'size')::int, (v_rules->'CHEST'->(v_d - 1)->>'sure')::int,
      v_rules->'CHEST_SURE_W', v_rules->'CHEST_REST_W');
    insert into public.bag (user_id, item_id, count)
      select v_round.user_id, item, count(*) from unnest(v_gifts) item where item is not null group by item
      on conflict (user_id, item_id) do update set count = public.bag.count + excluded.count;
    insert into public.minigame_players (user_id, game, wins) values (v_round.user_id, v_round.game, 1)
      on conflict (user_id, game) do update set wins = public.minigame_players.wins + 1;
    if (v_round.progress->>'flips')::int = 2 * v_pairs then
      insert into public.trainer_badges (user_id, badge) values (v_round.user_id, 'flawless') on conflict do nothing;
      if found then v_badges := array_append(v_badges, 'flawless'); end if;
    end if;
  end if;
  v_xp := case when v_win then (v_rules->>'XP_WIN')::int * v_d else (v_rules->>'XP_LOSE')::int end;
  perform public.trainer_grant_xp(v_round.user_id, v_xp);
  v_badges := v_badges || coalesce(public.trainer_award_badges(v_round.user_id), '{}');
  select public.trainer_level(xp) into v_after from public.trainer_profiles where user_id = v_round.user_id;

  v_receipt := jsonb_build_object('round', v_round.id, 'status', case when v_win then 'won' else p_status end,
    'difficulty', v_d, 'exp', v_exp, 'gifts', to_jsonb(v_gifts), 'cost', v_cost, 'xp', v_xp,
    'level', v_after, 'levelUp', v_after > v_before, 'badges', to_jsonb(v_badges),
    'needs', v_needs, 'flips', (v_round.progress->>'flips')::int);
  update public.minigame_rounds
    set status = case when v_win then 'won' else p_status end, receipt = v_receipt
    where id = p_round;
  return v_receipt;
end;
$$;

create function public.minigame_finish(p_round uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_tol integer := (public.minigame_rules()->>'TOLERANCE_S')::integer;
  v_round public.minigame_rounds;
  v_pairs integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':mg:finish', 0));
  select * into v_round from public.minigame_rounds where id = p_round and user_id = v_user;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_round.status <> 'open' then return v_round.receipt; end if;
  v_pairs := (public.minigame_rules()->'GRID'->(v_round.difficulty - 1)->>'pairs')::integer;
  if jsonb_array_length(v_round.progress->'matched') = 2 * v_pairs then
    return public.minigame_settle(p_round, 'won');
  end if;
  if now() <= v_round.deadline + make_interval(secs => v_tol) then
    raise exception 'not_finished' using errcode = 'P0001';
  end if;
  return public.minigame_settle(p_round, 'lost');
end;
$$;

revoke execute on function public.minigame_flip(uuid, smallint), public.minigame_finish(uuid),
  public.minigame_settle(uuid, text) from public, anon, authenticated;
grant execute on function public.minigame_flip(uuid, smallint), public.minigame_finish(uuid) to authenticated;
