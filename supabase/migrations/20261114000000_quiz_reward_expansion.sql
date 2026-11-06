-- Ten turns per existing three-hour window; immutable v1 rounds keep v1 drop.
create or replace function public.quiz_left(p_player public.quiz_players)
returns integer language sql immutable set search_path = ''
as $$ select greatest(0, 10 + p_player.bonus - p_player.used) $$;

alter table public.quiz_rounds add column chest_reward_version smallint;
create or replace function public.quiz_shard_stamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.shard_rule_version := 2;
  new.shard_catalog_version := 1;
  new.chest_reward_version := 1;
  return new;
end;
$$;

create function public.quiz_shard_rule_version(p_meta jsonb, p_version integer)
returns table(required integer, "drop" double precision)
language plpgsql set search_path = '' as $$
begin
  if p_version not in (1,2) or p_version is null then
    raise exception 'unsupported_rule_version';
  end if;
  return query select r.required, least(1::float8, r."drop" + case when p_version=2 then .1 else 0 end)
    from public.quiz_shard_rule(p_meta) r;
end;
$$;

create or replace function public.quiz_shard_settle(p_event public.quiz_shard_events)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_event public.quiz_shard_events := p_event;
  v_meta jsonb;
  v_rule record;
begin
  if v_event.state = 'pending' then
    select metadata into v_meta from public.pokemon_shard_catalog
      where version=v_event.catalog_version and pokemon_id=v_event.pokemon_id;
    if v_meta is not null then
      select * into v_rule from public.quiz_shard_rule_version(v_meta,v_event.rule_version);
      if v_event.roll < v_rule."drop" then
        insert into public.pokemon_shards(user_id,pokemon_id,count)
          values(v_event.user_id,v_event.pokemon_id,1)
          on conflict(user_id,pokemon_id) do update set count=public.pokemon_shards.count+1;
      end if;
      update public.quiz_shard_events set
        state=case when v_event.roll < v_rule."drop" then 'awarded' else 'not_awarded' end,
        required=v_rule.required,"drop"=v_rule."drop",settled_at=now()
        where round_id=v_event.round_id returning * into v_event;
    end if;
  end if;
  return public.quiz_shard_receipt(v_event);
end;
$$;

create table public.quiz_chest_shard_events (
  round_id uuid not null,
  kind text not null check(kind in ('combo','special')),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_version smallint not null default 1 check(rule_version=1),
  catalog_version smallint not null default 1 check(catalog_version=1),
  entropy jsonb not null,
  shards jsonb not null default '[]',
  state text not null default 'pending' check(state in ('pending','awarded')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  primary key(round_id,kind)
);
create index quiz_chest_shards_pending on public.quiz_chest_shard_events(user_id,created_at) where state='pending';
alter table public.quiz_chest_shard_events enable row level security;
create policy "chest shards: read own" on public.quiz_chest_shard_events for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.quiz_chest_shard_events from anon,authenticated;
grant select on public.quiz_chest_shard_events to authenticated;

create function public.quiz_chest_entropy()
returns jsonb language sql volatile set search_path = '' as $$
  select jsonb_build_object('countRoll',random(),'pieces',
    (select jsonb_agg(jsonb_build_object('groupRoll',random(),'speciesRoll',random())) from generate_series(1,3)))
$$;

-- Frozen catalog v1 consists of all 1025 species; primary key plus ID bounds
-- makes the count check a membership check, not merely a pool-size heuristic.
create function public.quiz_draw_chest_shards(p_kind text,p_entropy jsonb,p_catalog integer)
returns jsonb language plpgsql set search_path = '' as $$
declare
  n integer; piece jsonb; pool smallint[]; chosen smallint;
  result jsonb := '[]'; i integer; rare boolean;
begin
  if p_kind not in ('combo','special') or p_kind is null then raise exception 'invalid_kind'; end if;
  if p_catalog <> 1 or (select count(*) from public.pokemon_shard_catalog where version=p_catalog) <> 1025 then
    raise exception 'catalog_unavailable' using errcode='P0001';
  end if;
  if jsonb_typeof(p_entropy->'pieces') is distinct from 'array' or jsonb_array_length(p_entropy->'pieces')<>3
    or not coalesce((p_entropy->>'countRoll')::float8 >= 0 and (p_entropy->>'countRoll')::float8 < 1,false) then
    raise exception 'invalid_entropy';
  end if;
  for piece in select value from jsonb_array_elements(p_entropy->'pieces') loop
    if not coalesce((piece->>'groupRoll')::float8 >= 0 and (piece->>'groupRoll')::float8 < 1
      and (piece->>'speciesRoll')::float8 >= 0 and (piece->>'speciesRoll')::float8 < 1,false) then
      raise exception 'invalid_entropy';
    end if;
  end loop;
  n := floor((p_entropy->>'countRoll')::float8*4)::int;
  for i in 0..n-1 loop
    piece := p_entropy->'pieces'->i;
    rare := (piece->>'groupRoll')::float8 < .7;
    select array_agg(pokemon_id order by pokemon_id) into pool from public.pokemon_shard_catalog
      where version=p_catalog and (p_kind='combo' or
        (((metadata->>'legendary')::boolean or (metadata->>'mythical')::boolean or (metadata->>'captureRate')::integer <=45)=rare));
    if coalesce(cardinality(pool),0)=0 then raise exception 'catalog_unavailable' using errcode='P0001'; end if;
    chosen := pool[1+floor((piece->>'speciesRoll')::float8*cardinality(pool))::int];
    result := result || jsonb_build_array(chosen);
  end loop;
  return coalesce((select jsonb_agg(jsonb_build_object('speciesId',id,'count',cnt) order by id)
    from (select value::text::integer id,count(*) cnt from jsonb_array_elements(result) group by value) x),'[]'::jsonb);
end;
$$;

create function public.quiz_chest_shard_settle(p_round uuid,p_kind text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.quiz_chest_shard_events; selected jsonb; row record;
begin
  select * into e from public.quiz_chest_shard_events where round_id=p_round and kind=p_kind for update;
  if not found then raise exception 'no_chest' using errcode='P0001'; end if;
  if e.state='pending' then
    begin
      selected := public.quiz_draw_chest_shards(e.kind,e.entropy,e.catalog_version);
    exception when sqlstate 'P0001' then
      if sqlerrm <> 'catalog_unavailable' then raise; end if;
      return jsonb_build_object('roundId',e.round_id,'kind',e.kind,'state','pending','shards','[]'::jsonb);
    end;
    -- Ascending species order also prevents deadlocks across separate chests.
    for row in select * from jsonb_to_recordset(selected) as x("speciesId" int,count int) order by "speciesId" loop
      insert into public.pokemon_shards(user_id,pokemon_id,count) values(e.user_id,row."speciesId",row.count)
        on conflict(user_id,pokemon_id) do update set count=public.pokemon_shards.count+excluded.count;
    end loop;
    update public.quiz_chest_shard_events set shards=selected,state='awarded',settled_at=now()
      where round_id=e.round_id and kind=e.kind returning * into e;
  end if;
  return jsonb_build_object('roundId',e.round_id,'kind',e.kind,'state',e.state,'shards',e.shards);
end;
$$;

create function public.quiz_claim_chest_shards(p_round uuid,p_kind text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.quiz_user();
begin
  if not exists(select 1 from public.quiz_chest_shard_events where round_id=p_round and kind=p_kind and user_id=u) then
    raise exception 'no_chest' using errcode='P0001';
  end if;
  return public.quiz_chest_shard_settle(p_round,p_kind);
end;
$$;

create function public.quiz_reconcile_chest_shards(p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.quiz_user(); e record; result jsonb := '[]';
begin
  for e in select round_id,kind from public.quiz_chest_shard_events where user_id=u and state='pending'
    order by created_at,round_id,kind limit greatest(1,least(100,coalesce(p_limit,20))) for update skip locked loop
    result := result || jsonb_build_array(public.quiz_chest_shard_settle(e.round_id,e.kind));
  end loop;
  return result;
end;
$$;

revoke execute on function public.quiz_shard_rule_version(jsonb,integer),public.quiz_chest_entropy(),
  public.quiz_draw_chest_shards(text,jsonb,integer),public.quiz_chest_shard_settle(uuid,text) from public,anon,authenticated;
revoke execute on function public.quiz_claim_chest_shards(uuid,text),public.quiz_reconcile_chest_shards(integer) from public,anon;
grant execute on function public.quiz_claim_chest_shards(uuid,text),public.quiz_reconcile_chest_shards(integer) to authenticated;

-- Preserve the existing answer transaction, adding chest entitlements before commit.
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
    if v_round.chest_reward_version = 1 then
      insert into public.quiz_chest_shard_events(round_id,kind,user_id,entropy)
        select v_round.id, chest->>'kind', v_user, public.quiz_chest_entropy()
        from jsonb_array_elements(v_chests) chest
        on conflict(round_id,kind) do nothing;
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
      bonus = case when v_lucky and public.quiz_left(v_player) < 10 then bonus + 1 else bonus end
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
    'chest_reward_version', v_round.chest_reward_version,
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

