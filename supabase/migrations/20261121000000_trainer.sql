-- The trainer: a profile (xp, avatar, team), badges, and the XP that every
-- activity pays. Level is derived from xp, never stored. The rules mirror
-- src/pages/MiniGamePage/minigame.mjs; sqlParity.test.mjs keeps them equal.
create table public.trainer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  avatar text not null default 'rookie',
  team uuid[] not null default '{}' check (cardinality(team) <= 6),
  care_xp_day date,
  care_xp smallint not null default 0
);
create table public.trainer_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge)
);
alter table public.trainer_profiles enable row level security;
alter table public.trainer_badges enable row level security;
create policy "trainer_profiles: read own" on public.trainer_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "trainer_badges: read own" on public.trainer_badges
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.trainer_profiles, public.trainer_badges from anon, authenticated;
grant select on public.trainer_profiles, public.trainer_badges to authenticated;

-- minigame.mjs MINIGAME, as JSON
create function public.minigame_rules()
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
  "CHEST_REST_W": { "1": 40, "2": 48, "3": 10, "4": 2 }
}$rules$::jsonb
$fn$;

create function public.trainer_xp_for(l integer)
returns integer language sql immutable set search_path = '' as $$
  select round(40 * power((l - 1)::numeric, 1.5))::integer
$$;

create function public.trainer_level(p_xp integer)
returns integer language sql immutable set search_path = '' as $$
  select coalesce(max(l), 1) from generate_series(1, 30) l where public.trainer_xp_for(l) <= p_xp
$$;

-- adds xp, creating the profile; care xp stops at 10 a day
create function public.trainer_grant_xp(p_user uuid, p_amount integer, p_source text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_row public.trainer_profiles;
  v_today date := (now() at time zone 'utc')::date;
  v_amount integer := p_amount;
begin
  insert into public.trainer_profiles (user_id) values (p_user) on conflict do nothing;
  select * into v_row from public.trainer_profiles where user_id = p_user for update;
  if p_source = 'care' then
    if v_row.care_xp_day is distinct from v_today then
      v_row.care_xp := 0;
    end if;
    v_amount := greatest(0, least(p_amount, 10 - v_row.care_xp));
    update public.trainer_profiles
      set care_xp_day = v_today, care_xp = v_row.care_xp + v_amount
      where user_id = p_user;
  end if;
  update public.trainer_profiles set xp = xp + v_amount where user_id = p_user;
end;
$$;

-- xp from the events the game already records ------------------------------
create function public.trainer_xp_on_quiz() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.trainer_grant_xp(new.user_id, 5, 'quiz');
  return null;
end;
$$;
create trigger trainer_xp_quiz after update of outcome on public.quiz_rounds
  for each row when (old.outcome is null and new.outcome = 'right')
  execute function public.trainer_xp_on_quiz();

create function public.trainer_xp_on_dish() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.count > old.count then
    perform public.trainer_grant_xp(new.user_id, 3, 'cook');
  end if;
  return null;
end;
$$;
create trigger trainer_xp_dish after insert or update of count on public.kitchen_dishes
  for each row execute function public.trainer_xp_on_dish();

create function public.trainer_xp_on_care() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.trainer_grant_xp(new.user_id, 1, 'care');
  return null;
end;
$$;
create trigger trainer_xp_care after insert on public.pokemon_care_ops
  for each row execute function public.trainer_xp_on_care();

create function public.trainer_xp_on_evolve() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.trainer_grant_xp(new.user_id, 15, 'evolve');
  return null;
end;
$$;
create trigger trainer_xp_evolve after insert on public.pokemon_evolution_log
  for each row execute function public.trainer_xp_on_evolve();

revoke execute on function
  public.minigame_rules(), public.trainer_xp_for(integer), public.trainer_level(integer),
  public.trainer_grant_xp(uuid, integer, text), public.trainer_xp_on_quiz(),
  public.trainer_xp_on_dish(), public.trainer_xp_on_care(), public.trainer_xp_on_evolve()
  from public, anon, authenticated;
