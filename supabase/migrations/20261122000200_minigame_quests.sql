-- Mini-game v2: daily quests (3 a day, picked per user and day), a 7-day streak,
-- bumps from the xp triggers and from settle, and the claim. Lock order:
-- Pokémon -> care -> bag -> trainer -> quests. The catalog mirrors quests.mjs.
alter table public.trainer_profiles
  add column quest_streak smallint not null default 0,
  add column quest_streak_day date;

create table public.minigame_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  slot smallint not null check (slot between 1 and 3),
  kind text not null,
  goal integer not null check (goal > 0),
  progress integer not null default 0 check (progress >= 0),
  claimed_at timestamptz,
  gift jsonb,
  primary key (user_id, day, slot)
);
alter table public.minigame_quests enable row level security;
create policy "minigame_quests: read own" on public.minigame_quests
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.minigame_quests from anon, authenticated;
grant select on public.minigame_quests to authenticated;

create function public.minigame_quest_catalog()
returns jsonb language sql immutable set search_path = '' as $fn$
  select $quests$[
  { "kind": "quiz_win", "goal": 2, "xp": 8, "label": "Thắng 2 câu đố" },
  { "kind": "cook", "goal": 1, "xp": 6, "label": "Nấu 1 món ăn" },
  { "kind": "care", "goal": 3, "xp": 6, "label": "Chăm sóc Pokémon 3 lần" },
  { "kind": "evolve", "goal": 1, "xp": 15, "label": "Tiến hóa 1 Pokémon" },
  { "kind": "play", "goal": 2, "xp": 5, "label": "Chơi 2 ván mini-game" },
  { "kind": "win", "goal": 1, "xp": 8, "label": "Thắng 1 ván mini-game" },
  { "kind": "flawless", "goal": 1, "xp": 12, "label": "Thắng 1 ván không lật sai" }
]$quests$::jsonb
$fn$;

-- today's 3 quests, created once: the first 3 kinds by md5(user || day || kind)
create function public.quest_ensure(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  if exists (select 1 from public.minigame_quests where user_id = p_user and day = v_day) then return; end if;
  insert into public.minigame_quests (user_id, day, slot, kind, goal)
    select p_user, v_day, (row_number() over (order by md5(p_user::text || v_day::text || (c->>'kind'))))::smallint,
      c->>'kind', (c->>'goal')::int
    from jsonb_array_elements(public.minigame_quest_catalog()) c
    order by md5(p_user::text || v_day::text || (c->>'kind'))
    limit (public.minigame_rules()->>'QUEST_SLOTS')::int
    on conflict do nothing;
end;
$$;

-- progress for today's quest of a kind; never raises, so the action that called it is safe
create function public.quest_bump(p_user uuid, p_kind text, p_n integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_n is null or p_n <= 0 then return; end if;
  perform public.quest_ensure(p_user);
  update public.minigame_quests set progress = least(goal, progress + p_n)
    where user_id = p_user and day = (now() at time zone 'utc')::date and kind = p_kind and claimed_at is null;
exception when others then
  null;
end;
$$;

-- the xp triggers: quest bump after the xp (trainer, then quests)
create or replace function public.trainer_xp_on_quiz() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.trainer_grant_xp(new.user_id, 5, 'quiz');
  perform public.quest_bump(new.user_id, 'quiz_win', 1);
  return null;
end;
$$;
create or replace function public.trainer_xp_on_dish() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.count > old.count then
    perform public.trainer_grant_xp(new.user_id, 3, 'cook');
    perform public.quest_bump(new.user_id, 'cook', case when tg_op = 'INSERT' then new.count else new.count - old.count end);
  end if;
  return null;
end;
$$;
create or replace function public.trainer_xp_on_care() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.trainer_grant_xp(new.user_id, 1, 'care');
  perform public.quest_bump(new.user_id, 'care', 1);
  return null;
end;
$$;
create or replace function public.trainer_xp_on_evolve() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.trainer_grant_xp(new.user_id, 15, 'evolve');
  perform public.quest_bump(new.user_id, 'evolve', 1);
  return null;
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
  perform public.quest_bump(v_round.user_id, 'play', 1);
  if v_win then
    perform public.quest_bump(v_round.user_id, 'win', 1);
    if (v_round.progress->>'flips')::int = 2 * v_pairs then
      perform public.quest_bump(v_round.user_id, 'flawless', 1);
    end if;
  end if;
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
  perform public.quest_ensure(v_user);
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
    'now', now());
end;
$$;

-- claims one quest of today (or, past midnight, the latest one): xp, a gift, the streak.
-- Same-user claims are serialized; a replay returns the stored receipt and pays nothing.
create function public.minigame_quest_claim(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_rules jsonb := public.minigame_rules();
  v_today date := (now() at time zone 'utc')::date;
  v_row public.minigame_quests;
  v_prof public.trainer_profiles;
  v_xp integer;
  v_streak integer;
  v_seven boolean;
  v_gift text[];
  v_sgift text[];
  v_before integer;
  v_after integer;
  v_receipt jsonb;
begin
  if p_slot is null or p_slot not between 1 and (v_rules->>'QUEST_SLOTS')::int then
    raise exception 'bad_slot' using errcode = 'P0001';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':mg:quest', 0));
  select * into v_row from public.minigame_quests where user_id = v_user and slot = p_slot
    order by (day = v_today) desc, day desc limit 1;
  if not found then raise exception 'not_done' using errcode = 'P0001'; end if;
  if v_row.claimed_at is not null then
    return jsonb_build_object('slot', v_row.slot, 'xp', (v_row.gift->>'xp')::int, 'gift', v_row.gift->'items',
      'streak', (v_row.gift->>'streak')::int, 'streakGift', v_row.gift->'streakGift',
      'level', (v_row.gift->>'level')::int, 'levelUp', (v_row.gift->>'levelUp')::boolean);
  end if;
  if v_row.progress < v_row.goal then raise exception 'not_done' using errcode = 'P0001'; end if;
  select (c->>'xp')::int into v_xp from jsonb_array_elements(public.minigame_quest_catalog()) c where c->>'kind' = v_row.kind;
  -- the streak this claim lands on (an unlocked read; claims are serialized above)
  select * into v_prof from public.trainer_profiles where user_id = v_user;
  v_streak := case
    when v_prof.quest_streak_day = v_today then v_prof.quest_streak
    when v_prof.quest_streak_day = v_today - 1 then v_prof.quest_streak + 1
    else 1 end;
  v_seven := v_prof.quest_streak_day is distinct from v_today and v_streak >= (v_rules->>'STREAK_DAYS')::int;
  v_before := coalesce((select public.trainer_level(xp) from public.trainer_profiles where user_id = v_user), 1);
  -- gifts into the bag first (bag before trainer)
  v_gift := public.quiz_chest(1, 0, v_rules->'CHEST_SURE_W', v_rules->'CHEST_REST_W');
  if v_seven then
    v_sgift := public.quiz_chest(2, 1, v_rules->'CHEST_SURE_W', v_rules->'CHEST_REST_W');
  end if;
  insert into public.bag (user_id, item_id, count)
    select v_user, item, count(*) from unnest(v_gift || coalesce(v_sgift, '{}')) item where item is not null group by item
    on conflict (user_id, item_id) do update set count = public.bag.count + excluded.count;
  perform public.trainer_grant_xp(v_user, v_xp);
  update public.trainer_profiles set quest_streak = case when v_seven then 0 else v_streak end, quest_streak_day = v_today
    where user_id = v_user;
  select public.trainer_level(xp) into v_after from public.trainer_profiles where user_id = v_user;
  select * into v_row from public.minigame_quests where user_id = v_user and day = v_row.day and slot = p_slot for update;
  if v_row.claimed_at is not null or v_row.progress < v_row.goal then
    raise exception 'not_done' using errcode = 'P0001';
  end if;
  v_receipt := jsonb_build_object('slot', p_slot, 'xp', v_xp, 'gift', to_jsonb(v_gift), 'streak', v_streak,
    'streakGift', case when v_seven then to_jsonb(v_sgift) else 'null'::jsonb end,
    'level', v_after, 'levelUp', v_after > v_before);
  update public.minigame_quests set claimed_at = now(),
    gift = jsonb_build_object('items', v_receipt->'gift', 'xp', v_xp, 'streak', v_streak,
      'streakGift', v_receipt->'streakGift', 'level', v_after, 'levelUp', v_after > v_before)
    where user_id = v_user and day = v_row.day and slot = p_slot;
  return v_receipt;
end;
$$;

revoke execute on function
  public.minigame_quest_catalog(), public.quest_ensure(uuid), public.quest_bump(uuid, text, integer),
  public.minigame_quest_claim(smallint), public.minigame_settle(uuid, text), public.minigame_status()
  from public, anon, authenticated;
grant execute on function public.minigame_status(), public.minigame_quest_claim(smallint) to authenticated;
