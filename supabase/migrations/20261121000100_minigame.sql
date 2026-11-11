-- Mini game rounds: the turn window (3 per game, refilling after 2 hours),
-- status and start. Rewards come in the next migration. The layout and seed
-- of a round are never readable by the browser.
create table public.minigame_players (
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null,
  window_start timestamptz,
  used smallint not null default 0,
  wins integer not null default 0,
  best jsonb not null default '{}',
  primary key (user_id, game)
);
create table public.minigame_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null,
  individual_id uuid references public.pokemon_individuals(id) on delete set null,
  difficulty smallint not null check (difficulty between 1 and 3),
  seed bigint not null,
  layout jsonb not null,
  progress jsonb not null,
  started_at timestamptz not null default now(),
  deadline timestamptz not null,
  status text not null default 'open' check (status in ('open','won','lost','expired')),
  receipt jsonb
);
create index minigame_rounds_user on public.minigame_rounds (user_id, started_at desc);
create unique index minigame_rounds_one_open on public.minigame_rounds (user_id, game) where status = 'open';
alter table public.minigame_players enable row level security;
alter table public.minigame_rounds enable row level security;
create policy "minigame_players: read own" on public.minigame_players
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "minigame_rounds: read own" on public.minigame_rounds
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.minigame_players, public.minigame_rounds from anon, authenticated;
grant select on public.minigame_players to authenticated;
grant select (id, user_id, game, individual_id, difficulty, progress, started_at, deadline, status, receipt)
  on public.minigame_rounds to authenticated;

-- the player's row for a game, locked, its window started over after 2 hours
create function public.minigame_window(p_user uuid, p_game text)
returns public.minigame_players language plpgsql set search_path = '' as $$
declare
  v_row public.minigame_players;
  v_hours integer := (public.minigame_rules()->>'REFILL_HOURS')::integer;
begin
  insert into public.minigame_players (user_id, game) values (p_user, p_game) on conflict do nothing;
  select * into v_row from public.minigame_players where user_id = p_user and game = p_game for update;
  if v_row.window_start is not null and now() >= v_row.window_start + make_interval(hours => v_hours) then
    update public.minigame_players set window_start = null, used = 0
      where user_id = p_user and game = p_game returning * into v_row;
  end if;
  return v_row;
end;
$$;

-- the pairs of a memory round: `pairs` species picked and shuffled by the seed
create function public.minigame_layout_memory(p_seed bigint, p_pairs integer)
returns jsonb language sql immutable set search_path = '' as $$
  with picked as (
    select id from generate_series(1, 1025) id
    order by md5(p_seed::text || ':s:' || id::text) limit p_pairs
  ), dealt as (
    select id, k from picked, generate_series(1, 2) k
  )
  select jsonb_build_object('cards', coalesce(jsonb_agg(id order by md5(p_seed::text || ':c:' || id::text || ':' || k::text)), '[]'))
  from dealt
$$;

-- what the browser may know of a round
create function public.minigame_view(p_round public.minigame_rounds)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_grid jsonb := public.minigame_rules()->'GRID'->(p_round.difficulty - 1);
  v_matched int[] := array(select jsonb_array_elements_text(p_round.progress->'matched')::int);
  v_open jsonb := p_round.progress->'open';
  v_shown int[] := v_matched;
begin
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

-- settled in the next migration; closes a round with its reward and care cost
create function public.minigame_settle(p_round uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'not_ready' using errcode = 'P0001';
end;
$$;

-- closes the player's rounds that ran past the deadline (and its tolerance)
create function public.minigame_expire(p_user uuid)
returns void language plpgsql set search_path = '' as $$
declare
  v_tol integer := (public.minigame_rules()->>'TOLERANCE_S')::integer;
  v_id uuid;
begin
  for v_id in select id from public.minigame_rounds
    where user_id = p_user and status = 'open' and now() > deadline + make_interval(secs => v_tol)
    order by started_at
  loop
    perform public.minigame_settle(v_id, 'expired');
  end loop;
end;
$$;

create function public.minigame_status()
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
  perform public.trainer_grant_xp(v_user, 0);
  perform public.minigame_expire(v_user);
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
      'owned', (select count(*) from public.pokemon_individuals where user_id = v_user),
      'badges', (select coalesce(jsonb_agg(jsonb_build_object('id', badge, 'at', earned_at) order by earned_at), '[]')
        from public.trainer_badges where user_id = v_user)),
    'games', v_games,
    'open', v_open,
    'now', now());
end;
$$;

create function public.minigame_start(p_game text, p_individual uuid, p_difficulty smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_rules jsonb := public.minigame_rules();
  v_ind public.pokemon_individuals;
  v_care public.pokemon_care;
  v_player public.minigame_players;
  v_seed bigint;
  v_layout jsonb;
  v_round public.minigame_rounds;
  v_hunger numeric;
begin
  if p_game is null or p_game <> 'memory' then raise exception 'bad_game' using errcode = 'P0001'; end if;
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
  v_layout := public.minigame_layout_memory(v_seed, (v_rules->'GRID'->(p_difficulty - 1)->>'pairs')::integer);
  insert into public.minigame_rounds (user_id, game, individual_id, difficulty, seed, layout, progress, deadline)
    values (v_user, p_game, p_individual, p_difficulty, v_seed, v_layout,
      '{"open":null,"matched":[],"flips":0,"doneAt":null}',
      now() + make_interval(secs => (v_rules->>'DURATION_S')::integer))
    returning * into v_round;
  return jsonb_build_object('round', v_round.id, 'deadline', v_round.deadline, 'view', public.minigame_view(v_round));
end;
$$;

revoke execute on function
  public.minigame_window(uuid, text), public.minigame_layout_memory(bigint, integer),
  public.minigame_view(public.minigame_rounds), public.minigame_settle(uuid, text),
  public.minigame_expire(uuid), public.minigame_status(), public.minigame_start(text, uuid, smallint)
  from public, anon, authenticated;
grant execute on function public.minigame_status(), public.minigame_start(text, uuid, smallint) to authenticated;
