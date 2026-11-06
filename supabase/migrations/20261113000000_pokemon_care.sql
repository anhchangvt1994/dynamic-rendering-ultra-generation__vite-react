-- The room's care of each individual: needs that fall by the hour to a floor,
-- affection, growth stats, and feed / bathe / pet, each idempotent by
-- operation. The rules mirror src/pages/MyPokemonPage/care/care.mjs and
-- likes.mjs; sqlParity.test.mjs keeps them equal.
create table public.pokemon_care (
  individual_id uuid primary key references public.pokemon_individuals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hunger numeric(5,2) not null,
  clean numeric(5,2) not null,
  fun numeric(5,2) not null,
  needs_at timestamptz not null,
  affection integer not null default 0,
  power integer not null default 0,
  beauty integer not null default 0,
  happiness integer not null default 0,
  agility integer not null default 0,
  wisdom integer not null default 0,
  friendship integer not null default 0,
  last_cared_at timestamptz,
  mood_event text check (mood_event in ('liked','disliked','overpet')),
  mood_event_at timestamptz,
  pet_window_start timestamptz,
  pet_window_count smallint not null default 0,
  bathed_at timestamptz
);
create index pokemon_care_owner on public.pokemon_care (user_id);
create table public.pokemon_care_ops (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  individual_id uuid not null,
  action text not null,
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
alter table public.pokemon_care enable row level security;
alter table public.pokemon_care_ops enable row level security;
create policy "pokemon_care: read own" on public.pokemon_care
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.pokemon_care, public.pokemon_care_ops from anon, authenticated;
grant select on public.pokemon_care to authenticated;

-- care.mjs CARE, as JSON
create function public.pokemon_care_rules()
returns jsonb language sql immutable set search_path = '' as $fn$
  select $rules${
  "FLOOR": 25,
  "MAX": 100,
  "START": 60,
  "DECAY_PER_HOUR": { "hunger": 4, "clean": 2, "fun": 3 },
  "FEED_HUNGER": 30,
  "FULL_AT": 90,
  "LIKED_FUN": 10,
  "BATHE_CLEAN": 40,
  "BATHE_COOLDOWN_MIN": 30,
  "PET_FUN": 15,
  "PET_WINDOW_MIN": 10,
  "PET_LIMIT": 3,
  "AFFECTION": { "feed": 3, "liked": 5, "disliked": 0, "bathe": 2, "pet": 1 },
  "LEVELS": [0, 10, 30, 60, 100, 150, 210, 280, 360, 450],
  "CAP_BASE": 60,
  "CAP_PER_STAR": 20,
  "MOOD_WINDOW_MIN": 10,
  "IGNORE_AFTER_H": 48,
  "HUNGRY_BELOW": 40,
  "HAPPY_AT": 60
}$rules$::jsonb
$fn$;

-- likes.mjs LIKES: personality i likes [i][1] and dislikes [i][2]
create function public.pokemon_care_taste(p_personality smallint, p_flavor text)
returns text language sql immutable set search_path = '' as $$
  with t(pair) as (select (array[
    array['happiness','power'],
    array['power','wisdom'],
    array['wisdom','agility'],
    array['agility','beauty'],
    array['power','happiness'],
    array['happiness','agility'],
    array['happiness','wisdom'],
    array['wisdom','happiness'],
    array['beauty','power'],
    array['agility','wisdom'],
    array['beauty','agility'],
    array['wisdom','power']
  ])[p_personality + 1:p_personality + 1])
  select case
    when p_flavor is null then 'neutral'
    when p_flavor = pair[1][1] then 'liked'
    when p_flavor = pair[1][2] then 'disliked'
    else 'neutral' end
  from t
$$;

-- needsNow: each need falls by its rate per hour, never under the floor
create function public.pokemon_care_now(p_care public.pokemon_care, p_now timestamptz)
returns public.pokemon_care language plpgsql stable set search_path = '' as $$
declare
  r jsonb := public.pokemon_care_rules();
  v_hours numeric := greatest(0, extract(epoch from (p_now - p_care.needs_at)) / 3600);
  v_floor numeric := (r->>'FLOOR')::numeric;
begin
  p_care.hunger := greatest(v_floor, round(p_care.hunger - (r->'DECAY_PER_HOUR'->>'hunger')::numeric * v_hours, 2));
  p_care.clean := greatest(v_floor, round(p_care.clean - (r->'DECAY_PER_HOUR'->>'clean')::numeric * v_hours, 2));
  p_care.fun := greatest(v_floor, round(p_care.fun - (r->'DECAY_PER_HOUR'->>'fun')::numeric * v_hours, 2));
  p_care.needs_at := p_now;
  return p_care;
end;
$$;

-- CareState, camelCase like care.mjs
create function public.pokemon_care_json(p_care public.pokemon_care)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'needs', jsonb_build_object('hunger', p_care.hunger, 'clean', p_care.clean, 'fun', p_care.fun),
    'needsAt', p_care.needs_at,
    'affection', p_care.affection,
    'stats', jsonb_build_object('power', p_care.power, 'beauty', p_care.beauty,
      'happiness', p_care.happiness, 'agility', p_care.agility,
      'wisdom', p_care.wisdom, 'friendship', p_care.friendship),
    'lastCaredAt', p_care.last_cared_at,
    'moodEvent', p_care.mood_event,
    'moodEventAt', p_care.mood_event_at,
    'petWindowStart', p_care.pet_window_start,
    'petWindowCount', p_care.pet_window_count,
    'bathedAt', p_care.bathed_at)
$$;

create function public.pokemon_care_act(p_operation uuid, p_individual uuid, p_action text, p_dish text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := public.pokemon_care_rules();
  v_user uuid := public.quiz_user();
  v_now timestamptz := now();
  v_prior public.pokemon_care_ops;
  v_ind public.pokemon_individuals;
  v_care public.pokemon_care;
  v_count integer;
  v_stats jsonb;
  v_top text[];
  v_taste text;
  v_cap integer;
  v_fresh boolean;
  v_receipt jsonb;
begin
  if p_operation is null then raise exception 'invalid_operation' using errcode = 'P0001'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':care:' || p_operation::text, 0));
  select * into v_prior from public.pokemon_care_ops
    where user_id = v_user and operation_id = p_operation;
  if found then
    if v_prior.action <> p_action or v_prior.individual_id <> p_individual
      or (v_prior.receipt->>'dishId') is distinct from p_dish then
      raise exception 'operation_conflict' using errcode = 'P0001';
    end if;
    return v_prior.receipt;
  end if;
  -- the individual's row lock serialises every action on it, also the first
  -- ones, before any care row exists to lock
  select * into v_ind from public.pokemon_individuals
    where id = p_individual and user_id = v_user for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into v_care from public.pokemon_care where individual_id = p_individual for update;
  if not found then
    v_care.individual_id := p_individual;
    v_care.user_id := v_user;
    v_care.hunger := (r->>'START')::numeric;
    v_care.clean := (r->>'START')::numeric;
    v_care.fun := (r->>'START')::numeric;
    v_care.needs_at := v_ind.created_at;
    v_care.affection := 0;
    v_care.power := 0; v_care.beauty := 0; v_care.happiness := 0;
    v_care.agility := 0; v_care.wisdom := 0; v_care.friendship := 0;
    v_care.pet_window_count := 0;
  end if;
  v_care := public.pokemon_care_now(v_care, v_now);

  if p_action = 'feed' then
    if v_care.hunger >= (r->>'FULL_AT')::numeric then
      raise exception 'full' using errcode = 'P0001';
    end if;
    select d.count, k.stats, k.top into v_count, v_stats, v_top
      from public.kitchen_dishes d join public.kitchen_recipes k on k.dish_id = d.dish_id
      where d.user_id = v_user and d.dish_id = p_dish for update of d;
    if not found then raise exception 'no_dish' using errcode = 'P0001'; end if;
    v_count := v_count - 1;
    if v_count = 0 then
      delete from public.kitchen_dishes where user_id = v_user and dish_id = p_dish;
    else
      update public.kitchen_dishes set count = v_count where user_id = v_user and dish_id = p_dish;
    end if;
    v_taste := public.pokemon_care_taste(v_ind.personality, v_top[1]);
    v_cap := (r->>'CAP_BASE')::integer + (r->>'CAP_PER_STAR')::integer * coalesce((v_ind.potential->>'stars')::integer, 1);
    v_care.power := greatest(v_care.power, least(v_cap, v_care.power + coalesce((v_stats->>'power')::integer, 0)));
    v_care.beauty := greatest(v_care.beauty, least(v_cap, v_care.beauty + coalesce((v_stats->>'beauty')::integer, 0)));
    v_care.happiness := greatest(v_care.happiness, least(v_cap, v_care.happiness + coalesce((v_stats->>'happiness')::integer, 0)));
    v_care.agility := greatest(v_care.agility, least(v_cap, v_care.agility + coalesce((v_stats->>'agility')::integer, 0)));
    v_care.wisdom := greatest(v_care.wisdom, least(v_cap, v_care.wisdom + coalesce((v_stats->>'wisdom')::integer, 0)));
    v_care.friendship := greatest(v_care.friendship, least(v_cap, v_care.friendship + coalesce((v_stats->>'friendship')::integer, 0)));
    v_care.hunger := least((r->>'MAX')::numeric, v_care.hunger + (r->>'FEED_HUNGER')::numeric);
    if v_taste = 'liked' then
      v_care.fun := least((r->>'MAX')::numeric, v_care.fun + (r->>'LIKED_FUN')::numeric);
    end if;
    v_care.affection := v_care.affection + (r->'AFFECTION'->>(case v_taste when 'neutral' then 'feed' else v_taste end))::integer;
    if v_taste <> 'neutral' then
      v_care.mood_event := v_taste;
      v_care.mood_event_at := v_now;
    end if;
  elsif p_action = 'bathe' then
    if v_care.bathed_at is not null
      and v_now - v_care.bathed_at < make_interval(mins => (r->>'BATHE_COOLDOWN_MIN')::integer) then
      raise exception 'bathe_cooldown' using errcode = 'P0001';
    end if;
    v_care.clean := least((r->>'MAX')::numeric, v_care.clean + (r->>'BATHE_CLEAN')::numeric);
    v_care.affection := v_care.affection + (r->'AFFECTION'->>'bathe')::integer;
    v_care.bathed_at := v_now;
  elsif p_action = 'pet' then
    v_fresh := v_care.pet_window_start is null
      or v_now - v_care.pet_window_start >= make_interval(mins => (r->>'PET_WINDOW_MIN')::integer);
    if not v_fresh and v_care.pet_window_count >= (r->>'PET_LIMIT')::integer then
      v_care.pet_window_count := v_care.pet_window_count + 1;
      v_care.mood_event := 'overpet';
      v_care.mood_event_at := v_now;
    else
      v_care.fun := least((r->>'MAX')::numeric, v_care.fun + (r->>'PET_FUN')::numeric);
      v_care.affection := v_care.affection + (r->'AFFECTION'->>'pet')::integer;
      if v_fresh then
        v_care.pet_window_start := v_now;
        v_care.pet_window_count := 1;
      else
        v_care.pet_window_count := v_care.pet_window_count + 1;
      end if;
    end if;
  else
    raise exception 'invalid_action' using errcode = 'P0001';
  end if;
  v_care.last_cared_at := v_now;

  insert into public.pokemon_care select v_care.*
    on conflict (individual_id) do update set
      hunger = excluded.hunger, clean = excluded.clean, fun = excluded.fun,
      needs_at = excluded.needs_at, affection = excluded.affection,
      power = excluded.power, beauty = excluded.beauty, happiness = excluded.happiness,
      agility = excluded.agility, wisdom = excluded.wisdom, friendship = excluded.friendship,
      last_cared_at = excluded.last_cared_at, mood_event = excluded.mood_event,
      mood_event_at = excluded.mood_event_at, pet_window_start = excluded.pet_window_start,
      pet_window_count = excluded.pet_window_count, bathed_at = excluded.bathed_at;
  v_receipt := jsonb_build_object('operationId', p_operation, 'individualId', p_individual,
    'action', p_action, 'care', public.pokemon_care_json(v_care));
  if p_action = 'feed' then
    v_receipt := v_receipt || jsonb_build_object('dishId', p_dish, 'dishCount', v_count);
  end if;
  insert into public.pokemon_care_ops(user_id, operation_id, individual_id, action, receipt)
    values (v_user, p_operation, p_individual, p_action, v_receipt);
  return v_receipt;
end;
$$;

create function public.care_feed(p_operation uuid, p_individual uuid, p_dish text)
returns jsonb language sql security definer set search_path = '' as $$
  select public.pokemon_care_act(p_operation, p_individual, 'feed', p_dish)
$$;
create function public.care_bathe(p_operation uuid, p_individual uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select public.pokemon_care_act(p_operation, p_individual, 'bathe', null)
$$;
create function public.care_pet(p_operation uuid, p_individual uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select public.pokemon_care_act(p_operation, p_individual, 'pet', null)
$$;

revoke execute on function public.pokemon_care_rules(), public.pokemon_care_taste(smallint, text),
  public.pokemon_care_now(public.pokemon_care, timestamptz), public.pokemon_care_json(public.pokemon_care),
  public.pokemon_care_act(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.care_feed(uuid, uuid, text), public.care_bathe(uuid, uuid),
  public.care_pet(uuid, uuid) from public, anon, authenticated;
grant execute on function public.care_feed(uuid, uuid, text), public.care_bathe(uuid, uuid),
  public.care_pet(uuid, uuid) to authenticated;
