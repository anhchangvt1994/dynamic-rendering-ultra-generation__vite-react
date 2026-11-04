-- Species shards: a right answer may also drop one shard of the answered
-- species (src/pages/QuizPage/shards/rules.mjs is the same rule).
--   R = clamp((255 - capture_rate) / 254), legendary floor .90, mythical .95
--   P = power level / 9; D = .55R + .30P + .15RP
--   needs 3 + floor(17D + .5) shards; drops when roll < 1 - .9D
-- The roll is made once, when the answer is recorded; a claim only compares
-- it to the pinned catalog version, so a retry can never re-roll.

-- the catalog: versioned PokéAPI species data (scripts/pokemon-shards), never
-- changed once a row exists
create table public.pokemon_shard_catalog (
  version smallint not null,
  pokemon_id smallint not null check (pokemon_id between 1 and 1025),
  metadata jsonb not null,
  primary key (version, pokemon_id)
);

create function public.pokemon_shard_catalog_frozen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'catalog_frozen' using errcode = 'P0001';
end;
$$;
create trigger pokemon_shard_catalog_frozen
before update or delete on public.pokemon_shard_catalog
for each row execute function public.pokemon_shard_catalog_frozen();

create table public.pokemon_shards (
  user_id uuid not null references auth.users (id) on delete cascade,
  pokemon_id smallint not null check (pokemon_id between 1 and 1025),
  count integer not null check (count > 0),
  primary key (user_id, pokemon_id)
);

-- one entitlement per round (the round itself may be pruned later)
create table public.quiz_shard_events (
  round_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  pokemon_id smallint not null,
  rule_version smallint not null,
  catalog_version smallint not null,
  roll double precision check (roll >= 0 and roll < 1),
  state text not null check (state in ('pending', 'awarded', 'not_awarded', 'ineligible')),
  required integer,
  "drop" double precision,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index quiz_shard_events_pending on public.quiz_shard_events (user_id, created_at)
  where state = 'pending';

-- rounds from before this migration keep null versions: never eligible
alter table public.quiz_rounds
  add column shard_rule_version smallint,
  add column shard_catalog_version smallint;

alter table public.pokemon_shard_catalog enable row level security;
alter table public.pokemon_shards enable row level security;
alter table public.quiz_shard_events enable row level security;
create policy "pokemon_shard_catalog: read" on public.pokemon_shard_catalog
  for select to authenticated using (true);
create policy "pokemon_shards: read own" on public.pokemon_shards
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "quiz_shard_events: read own" on public.quiz_shard_events
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.pokemon_shard_catalog, public.pokemon_shards, public.quiz_shard_events
  from anon, authenticated;
grant select on public.pokemon_shard_catalog, public.pokemon_shards, public.quiz_shard_events to authenticated;

-- new rounds are stamped with the current rule and catalog versions
create function public.quiz_shard_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.shard_rule_version := 1;
  new.shard_catalog_version := 1;
  return new;
end;
$$;
create trigger quiz_shard_stamp
before insert on public.quiz_rounds
for each row execute function public.quiz_shard_stamp();

-- the answer recorded: a right one queues the entitlement and its one roll,
-- the others are closed. Local SQL only: it can not fail the answer.
create function public.quiz_shard_queue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.quiz_shard_events (round_id, user_id, pokemon_id, rule_version, catalog_version,
    roll, state, settled_at)
  values (new.id, new.user_id, new.answer_id, new.shard_rule_version, new.shard_catalog_version,
    case when new.outcome = 'right' then random() end,
    case when new.outcome = 'right' then 'pending' else 'ineligible' end,
    case when new.outcome = 'right' then null else now() end)
  on conflict (round_id) do nothing;
  return new;
end;
$$;
create trigger quiz_shard_queue
after update of outcome on public.quiz_rounds
for each row
when (old.outcome is null and new.outcome is not null and new.shard_rule_version is not null)
execute function public.quiz_shard_queue();

-- shards needed and drop chance of a catalog entry
create function public.quiz_shard_rule(p_meta jsonb)
returns table (required integer, "drop" double precision)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_r double precision := greatest(0, least(1, (255 - (p_meta->>'captureRate')::int) / 254.0));
  v_p double precision := (p_meta->>'powerLevel')::int / 9.0;
  v_d double precision;
begin
  if (p_meta->>'legendary')::boolean then v_r := greatest(v_r, 0.90); end if;
  if (p_meta->>'mythical')::boolean then v_r := greatest(v_r, 0.95); end if;
  v_d := 0.55 * v_r + 0.30 * v_p + 0.15 * (v_r * v_p);
  required := 3 + floor(17 * v_d + 0.5 + 1e-9)::int;
  "drop" := 1 - 0.9 * v_d;
  return next;
end;
$$;

-- the receipt of an event (its balance read as it stands)
create function public.quiz_shard_receipt(p_event public.quiz_shard_events)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'roundId', p_event.round_id,
    'speciesId', p_event.pokemon_id,
    'state', p_event.state,
    'count', coalesce((select s.count from public.pokemon_shards s
      where s.user_id = p_event.user_id and s.pokemon_id = p_event.pokemon_id), 0),
    'required', p_event.required,
    'drop', p_event."drop"
  )
$$;

-- settle one locked event against its pinned catalog; a missing catalog row
-- leaves it pending (never an error, never a default rarity)
create function public.quiz_shard_settle(p_event public.quiz_shard_events)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.quiz_shard_events := p_event;
  v_meta jsonb;
  v_rule record;
begin
  if v_event.state = 'pending' then
    select metadata into v_meta from public.pokemon_shard_catalog
    where version = v_event.catalog_version and pokemon_id = v_event.pokemon_id;
    if v_meta is not null then
      select * into v_rule from public.quiz_shard_rule(v_meta);
      if v_event.roll < v_rule."drop" then
        insert into public.pokemon_shards (user_id, pokemon_id, count)
        values (v_event.user_id, v_event.pokemon_id, 1)
        on conflict (user_id, pokemon_id) do update set count = public.pokemon_shards.count + 1;
      end if;
      update public.quiz_shard_events set
        state = case when v_event.roll < v_rule."drop" then 'awarded' else 'not_awarded' end,
        required = v_rule.required,
        "drop" = v_rule."drop",
        settled_at = now()
      where round_id = v_event.round_id
      returning * into v_event;
    end if;
  end if;
  return public.quiz_shard_receipt(v_event);
end;
$$;

-- the player's claim of a round: idempotent, only for their own answered round
create function public.quiz_claim_shard(p_round uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_event public.quiz_shard_events;
  v_round public.quiz_rounds;
begin
  select * into v_event from public.quiz_shard_events
  where round_id = p_round and user_id = v_user for update;
  if v_event.round_id is not null then
    return public.quiz_shard_settle(v_event);
  end if;
  select * into v_round from public.quiz_rounds
  where id = p_round and user_id = v_user and answered_at is not null;
  if v_round.id is null then
    raise exception 'no_round' using errcode = 'P0001';
  end if;
  -- answered before the feature (or with no queued event): never eligible
  return jsonb_build_object('roundId', v_round.id, 'speciesId', v_round.answer_id,
    'state', 'ineligible', 'count', coalesce((select s.count from public.pokemon_shards s
      where s.user_id = v_user and s.pokemon_id = v_round.answer_id), 0),
    'required', null, 'drop', null);
end;
$$;

-- settle the caller's pending events (the retry for a catalog that came late)
create function public.quiz_reconcile_shards(p_limit int default 20)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_event public.quiz_shard_events;
  v_out jsonb := '[]';
begin
  for v_event in
    select * from public.quiz_shard_events
    where user_id = v_user and state = 'pending'
    order by created_at
    limit greatest(1, least(100, coalesce(p_limit, 20)))
    for update skip locked
  loop
    v_out := v_out || jsonb_build_array(public.quiz_shard_settle(v_event));
  end loop;
  return v_out;
end;
$$;

revoke execute on function
  public.pokemon_shard_catalog_frozen(),
  public.quiz_shard_stamp(),
  public.quiz_shard_queue(),
  public.quiz_shard_rule(jsonb),
  public.quiz_shard_receipt(public.quiz_shard_events),
  public.quiz_shard_settle(public.quiz_shard_events),
  public.quiz_claim_shard(uuid),
  public.quiz_reconcile_shards(int)
from public, anon, authenticated;
grant execute on function public.quiz_claim_shard(uuid), public.quiz_reconcile_shards(int) to authenticated;
