-- "Who's That Pokémon?" on the server: the game's state per account, its
-- rounds and the bag, all written by the functions below only. A user reads
-- their own bag and player row; nobody reads the rounds (they hold the
-- answers). The Node server reads a round's answer through quiz_art with the
-- service role, to serve its artwork and cry without the number.

-- the catalogue (src/pages/QuizPage/items.mjs, kept equal by
-- catalogue.test.mjs): rank is the catalogue's order, most valuable first ---

create table public.quiz_items (
  id text primary key,
  tier smallint not null check (tier between 1 and 4),
  hard boolean not null default false,
  rank smallint not null unique
);

insert into public.quiz_items (id, tier, hard, rank) values
  ('gold-bottle-cap', 4, false, 0),
  ('rare-candy', 4, false, 1),
  ('bottle-cap', 4, false, 2),
  ('soothe-bell', 4, false, 3),
  ('pp-max', 4, false, 4),
  ('tm-normal', 4, true, 5),
  ('tm-fighting', 4, true, 6),
  ('tm-ground', 4, true, 7),
  ('tm-electric', 4, true, 8),
  ('tm-fire', 4, true, 9),
  ('tm-ice', 4, true, 10),
  ('tm-psychic', 4, true, 11),
  ('tm-grass', 4, true, 12),
  ('tm-dragon', 4, true, 13),
  ('tm-ghost', 4, true, 14),
  ('protein', 3, false, 15),
  ('calcium', 3, false, 16),
  ('carbos', 3, false, 17),
  ('hp-up', 3, false, 18),
  ('iron', 3, false, 19),
  ('zinc', 3, false, 20),
  ('hm-water', 3, true, 21),
  ('hm-flying', 3, true, 22),
  ('hm-normal', 3, true, 23),
  ('pp-up', 3, false, 24),
  ('pomeg-berry', 3, false, 25),
  ('kelpsy-berry', 3, false, 26),
  ('qualot-berry', 3, false, 27),
  ('hondew-berry', 3, false, 28),
  ('grepa-berry', 3, false, 29),
  ('tamato-berry', 3, false, 30),
  ('thunder-stone', 2, false, 31),
  ('fire-stone', 2, false, 32),
  ('water-stone', 2, false, 33),
  ('leaf-stone', 2, false, 34),
  ('moon-stone', 2, false, 35),
  ('ice-stone', 2, false, 36),
  ('shiny-stone', 2, false, 37),
  ('dusk-stone', 2, false, 38),
  ('dawn-stone', 2, false, 39),
  ('sun-stone', 2, false, 40),
  ('sitrus-berry', 2, false, 41),
  ('lum-berry', 2, false, 42),
  ('leppa-berry', 2, false, 43),
  ('moomoo-milk', 2, false, 44),
  ('rage-candy-bar', 2, false, 45),
  ('big-malasada', 2, false, 46),
  ('lava-cookie', 2, false, 47),
  ('old-gateau', 2, false, 48),
  ('casteliacone', 2, false, 49),
  ('lumiose-galette', 2, false, 50),
  ('shalour-sable', 2, false, 51),
  ('pewter-crunchies', 2, false, 52),
  ('lemonade', 1, false, 53),
  ('soda-pop', 1, false, 54),
  ('fresh-water', 1, false, 55),
  ('oran-berry', 1, false, 56),
  ('cheri-berry', 1, false, 57),
  ('chesto-berry', 1, false, 58),
  ('pecha-berry', 1, false, 59),
  ('rawst-berry', 1, false, 60),
  ('aspear-berry', 1, false, 61);

-- a player: the 3-hour window, the streak, the records ---------------------

create table public.quiz_players (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz,
  used smallint not null default 0,
  bonus smallint not null default 0,
  rerolls smallint not null default 0,
  wins smallint not null default 0,
  window_gifts text[] not null default '{}',
  streak smallint not null default 0,
  records smallint not null default 0,
  records_total integer not null default 0
);

-- a round: its answer never leaves the database before it is answered ------

create table public.quiz_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  answer_id smallint not null check (answer_id between 1 and 1025),
  options smallint[] not null check (cardinality(options) = 4),
  veil text not null check (veil in ('warp', 'shards', 'torch')),
  hard boolean not null,
  -- the Pokédex range it was drawn from (a swap draws from it again)
  range_from smallint not null,
  range_to smallint not null,
  gifts text[] not null,
  bonus_slot smallint not null,
  duration_ms integer not null,
  -- the Node proxy could not fetch its artwork: the one reason for a swap
  art_failed boolean not null default false,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  choice smallint,
  outcome text check (outcome in ('right', 'wrong', 'time')),
  slot smallint,
  won_item text references public.quiz_items (id)
);

create index quiz_rounds_user_started on public.quiz_rounds (user_id, started_at desc);
-- one unanswered round per player at a time
create unique index quiz_rounds_one_pending on public.quiz_rounds (user_id) where answered_at is null;

-- the bag --------------------------------------------------------------------

create table public.bag (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.quiz_items (id),
  count integer not null check (count > 0),
  primary key (user_id, item_id)
);

alter table public.quiz_items enable row level security;
alter table public.quiz_players enable row level security;
alter table public.quiz_rounds enable row level security;
alter table public.bag enable row level security;

create policy "quiz_items: read" on public.quiz_items
  for select to anon, authenticated using (true);
create policy "quiz_players: read own" on public.quiz_players
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "bag: read own" on public.bag
  for select to authenticated using ((select auth.uid()) = user_id);
-- quiz_rounds: no policy at all, so no row for anyone but the functions

-- start from nothing (the self-hosted image grants new tables to anon and
-- authenticated), then grant exactly this
revoke all on table public.quiz_items, public.quiz_players, public.quiz_rounds, public.bag
  from anon, authenticated;
grant select on public.quiz_items to anon, authenticated;
grant select on public.quiz_players, public.bag to authenticated;

-- ============================================================================
-- the game: the rules of src/pages/QuizPage/items.mjs and progress.mjs
--   5 turns per 3-hour window (it starts with the first round); a lucky gift
--   gives one back, never above 5. Veil 14 s (choices) or 22 s (typed); the
--   veil left k = 1 - smoothstep(t), gift slot = first SLOT_AT [.75,.5,.25,0]
--   with k > at; the server's clock decides, with 400 ms for the network.
--   Streak 10 → a chest; 10 records → the special chest.
-- ============================================================================

-- a tier drawn by weight ({"4": 2, "3": 10, ...}), then an item of it not yet
-- taken (TM/HM only when typed); null when nothing is left
create function public.quiz_draw(p_weights jsonb, p_hard boolean, p_taken text[])
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_total numeric;
  v_roll numeric;
  v_tier smallint;
  v_item text;
  v_row record;
begin
  select sum(value::numeric) into v_total from jsonb_each_text(p_weights);
  for attempt in 1..20 loop
    v_roll := random() * v_total;
    v_tier := null;
    for v_row in select key::smallint as tier, value::numeric as weight
                 from jsonb_each_text(p_weights) order by key desc loop
      v_roll := v_roll - v_row.weight;
      if v_roll < 0 then
        v_tier := v_row.tier;
        exit;
      end if;
    end loop;
    v_tier := coalesce(v_tier, (select min(key::smallint) from jsonb_each_text(p_weights)));
    select id into v_item from public.quiz_items
    where tier = v_tier and (p_hard or not hard) and id <> all(p_taken)
    order by random() limit 1;
    if v_item is not null then
      return v_item;
    end if;
  end loop;
  return null;
end;
$$;

-- a chest's gifts: p_sure of them from p_sure_w, the rest from p_rest_w,
-- most valuable first; never a TM or HM
create function public.quiz_chest(p_size int, p_sure int, p_sure_w jsonb, p_rest_w jsonb)
returns text[]
language plpgsql
set search_path = ''
as $$
declare
  v_taken text[] := '{}';
  v_item text;
begin
  for i in 1..p_size loop
    v_item := public.quiz_draw(case when i <= p_sure then p_sure_w else p_rest_w end, false, v_taken);
    if v_item is not null then
      v_taken := v_taken || v_item;
    end if;
  end loop;
  return array(select id from public.quiz_items where id = any(v_taken) order by rank);
end;
$$;

-- the player's row, locked, its window started over if it ran out
create function public.quiz_window(p_user uuid)
returns public.quiz_players
language plpgsql
set search_path = ''
as $$
declare
  v_player public.quiz_players;
begin
  insert into public.quiz_players (user_id) values (p_user) on conflict do nothing;
  select * into v_player from public.quiz_players where user_id = p_user for update;
  if v_player.window_start is not null and now() >= v_player.window_start + interval '3 hours' then
    update public.quiz_players
    set window_start = null, used = 0, bonus = 0, rerolls = 0, wins = 0, window_gifts = '{}'
    where user_id = p_user
    returning * into v_player;
  end if;
  return v_player;
end;
$$;

create function public.quiz_left(p_player public.quiz_players)
returns int
language sql
immutable
set search_path = ''
as $$ select greatest(0, 5 + p_player.bonus - p_player.used) $$;

-- what the browser may know of a round: no answer, and no options to pick
-- from when the name is typed (typed rounds pay the TM and HM)
create function public.quiz_public(p_round public.quiz_rounds)
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
    'now', now()
  )
$$;

-- a new round: four options none of which is among the last 30 answers (a
-- recent answer among them would give the answer away), one of them the
-- answer; a veil unlike the last one, four gifts and maybe a bonus turn
-- behind one
create function public.quiz_new_round(p_user uuid, p_from smallint, p_to smallint, p_hard boolean)
returns public.quiz_rounds
language plpgsql
set search_path = ''
as $$
declare
  v_recent smallint[];
  v_pool smallint[];
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
    where user_id = p_user order by started_at desc limit 30
  );
  v_pool := array(
    select g from generate_series(p_from::int, p_to::int) g where g <> all(v_recent)
  );
  if cardinality(v_pool) < 4 then
    v_pool := array(select g from generate_series(p_from::int, p_to::int) g);
  end if;
  v_options := array(select o from unnest(v_pool) o order by random() limit 4);
  v_answer := v_options[1 + floor(random() * 4)::int];

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

create function public.quiz_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  return auth.uid();
end;
$$;

-- the player's state, and the round they left unanswered if any
create function public.quiz_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_player public.quiz_players := public.quiz_window(v_user);
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
    'pending', case when v_pending.id is null then null else public.quiz_public(v_pending) end
  );
end;
$$;

-- a round: the one left unanswered (no turn spent), else a new one for a turn
create function public.quiz_start(p_from smallint, p_to smallint, p_hard boolean)
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
  -- the whole Pokédex or one generation (GENERATIONS, src/pages/HomePage/catalog.mjs)
  if p_from is null or p_to is null or (p_from, p_to) not in (
    (1, 1025), (1, 151), (152, 251), (252, 386), (387, 493),
    (494, 649), (650, 721), (722, 809), (810, 905), (906, 1025)
  ) then
    raise exception 'bad_range' using errcode = 'P0001';
  end if;
  v_player := public.quiz_window(v_user);
  select * into v_round from public.quiz_rounds where user_id = v_user and answered_at is null;
  if v_round.id is not null then
    return public.quiz_public(v_round);
  end if;
  if public.quiz_left(v_player) <= 0 then
    raise exception 'no_turns' using errcode = 'P0001';
  end if;
  update public.quiz_players
  set used = used + 1, window_start = coalesce(window_start, now())
  where user_id = v_user;
  v_round := public.quiz_new_round(v_user, p_from, p_to, coalesce(p_hard, false));
  return public.quiz_public(v_round);
end;
$$;

-- a broken artwork (seen by the Node proxy, quiz_art_failed): another
-- Pokémon for the same turn and the same gifts, 3 times per window
create function public.quiz_reroll(p_round uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_player public.quiz_players := public.quiz_window(v_user);
  v_old public.quiz_rounds;
  v_round public.quiz_rounds;
begin
  select * into v_old from public.quiz_rounds
  where id = p_round and user_id = v_user and answered_at is null for update;
  if v_old.id is null then
    raise exception 'no_round' using errcode = 'P0001';
  end if;
  if not v_old.art_failed then
    raise exception 'art_ok' using errcode = 'P0001';
  end if;
  if v_player.rerolls >= 3 then
    raise exception 'no_rerolls' using errcode = 'P0001';
  end if;
  update public.quiz_players set rerolls = rerolls + 1 where user_id = v_user;
  delete from public.quiz_rounds where id = v_old.id;
  v_round := public.quiz_new_round(v_user, v_old.range_from, v_old.range_to, v_old.hard);
  update public.quiz_rounds set gifts = v_old.gifts, bonus_slot = v_old.bonus_slot
  where id = v_round.id
  returning * into v_round;
  return public.quiz_public(v_round);
end;
$$;

-- the answer: timed by the server, judged, paid
create function public.quiz_answer(p_round uuid, p_choice smallint)
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
  v_player := public.quiz_window(v_user);

  v_elapsed := extract(epoch from now() - v_round.started_at) * 1000;
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
    if v_streak >= 10 then
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
    'rerolls_left', greatest(0, 3 - v_player.rerolls)
  );
end;
$$;

-- for the Node server only (service role): the answer behind a round's
-- artwork and cry URLs
create function public.quiz_art(p_round uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$ select answer_id from public.quiz_rounds where id = p_round $$;

-- for the Node server only: the round's artwork could not be fetched
create function public.quiz_art_failed(p_round uuid)
returns void
language sql
security definer
set search_path = ''
as $$ update public.quiz_rounds set art_failed = true where id = p_round and answered_at is null $$;

-- functions are executable by PUBLIC by default: take that back, then grant
revoke execute on function
  public.quiz_draw(jsonb, boolean, text[]),
  public.quiz_chest(int, int, jsonb, jsonb),
  public.quiz_window(uuid),
  public.quiz_left(public.quiz_players),
  public.quiz_public(public.quiz_rounds),
  public.quiz_new_round(uuid, smallint, smallint, boolean),
  public.quiz_user(),
  public.quiz_status(),
  public.quiz_start(smallint, smallint, boolean),
  public.quiz_reroll(uuid),
  public.quiz_answer(uuid, smallint),
  public.quiz_art(uuid),
  public.quiz_art_failed(uuid)
from public, anon, authenticated;

grant execute on function
  public.quiz_status(),
  public.quiz_start(smallint, smallint, boolean),
  public.quiz_reroll(uuid),
  public.quiz_answer(uuid, smallint)
to authenticated;
grant execute on function public.quiz_art(uuid), public.quiz_art_failed(uuid) to service_role;
