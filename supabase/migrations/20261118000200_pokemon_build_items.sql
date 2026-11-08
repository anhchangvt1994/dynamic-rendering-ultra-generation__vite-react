-- Pokémon build, write side (1): the rare Quiz items and the awakening. A
-- player may use at most 3 items per individual; the awakening is free and
-- once. Both raise the individual's stars, which the care stat cap follows.
-- Every call is idempotent by operation id.

create table public.pokemon_build_ops (
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_id uuid not null,
  individual_id uuid not null references public.pokemon_individuals (id) on delete cascade,
  kind text not null,
  item text,
  stat smallint,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
alter table public.pokemon_build_ops enable row level security;
revoke all on public.pokemon_build_ops from anon, authenticated;

-- care rows grow stats up to the cap of the individual's current stars
do $$
declare
  v_old text := $old$coalesce((v_ind.potential->>'stars')::integer, 1)$old$;
  v_def text := pg_get_functiondef('public.pokemon_care_act(uuid, uuid, text, text)'::regprocedure);
begin
  if position(v_old in v_def) = 0 then raise exception 'pokemon_care_act changed shape'; end if;
  execute replace(v_def, v_old, 'public.pokemon_build_stars(p_individual)');
end $$;

-- the shared prologue: idempotency check, the individual locked, a growth row
create function public.pokemon_build_begin(p_operation uuid, p_individual uuid, p_kind text, p_item text, p_stat smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_prior public.pokemon_build_ops;
  v_ind public.pokemon_individuals;
begin
  if p_operation is null then raise exception 'invalid_operation' using errcode = 'P0001'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':build:' || p_operation::text, 0));
  select * into v_prior from public.pokemon_build_ops where user_id = v_user and operation_id = p_operation;
  if found then
    if v_prior.kind <> p_kind or v_prior.individual_id <> p_individual
      or v_prior.item is distinct from p_item or v_prior.stat is distinct from p_stat then
      raise exception 'operation_conflict' using errcode = 'P0001';
    end if;
    return v_prior.result;
  end if;
  select * into v_ind from public.pokemon_individuals where id = p_individual and user_id = v_user for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  insert into public.pokemon_growth (individual_id, user_id, iv)
    values (v_ind.id, v_user, public.pokemon_birth_iv(v_ind.potential))
    on conflict (individual_id) do nothing;
  return null;
end;
$$;

create function public.pokemon_use_item(p_operation uuid, p_individual uuid, p_item text, p_stat smallint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_replay jsonb := public.pokemon_build_begin(p_operation, p_individual, 'item', p_item, p_stat);
  g public.pokemon_growth;
  v_count integer;
  v_build jsonb;
  v_result jsonb;
begin
  if v_replay is not null then return v_replay; end if;
  select * into g from public.pokemon_growth where individual_id = p_individual for update;
  if g.item_uses >= 3 then raise exception 'item_limit' using errcode = 'P0001'; end if;
  select count into v_count from public.bag where user_id = v_user and item_id = p_item for update;
  if not found then raise exception 'no_item' using errcode = 'P0001'; end if;

  if p_item = 'bottle-cap' then
    if p_stat is null or p_stat not between 0 and 5 then raise exception 'invalid_stat' using errcode = 'P0001'; end if;
    if g.iv[p_stat + 1] >= 31 then raise exception 'iv_maxed' using errcode = 'P0001'; end if;
    g.iv[p_stat + 1] := 31;
  elsif p_item = 'gold-bottle-cap' then
    if g.iv = array[31, 31, 31, 31, 31, 31]::smallint[] then raise exception 'iv_maxed' using errcode = 'P0001'; end if;
    g.iv := array[31, 31, 31, 31, 31, 31]::smallint[];
  elsif p_item = 'rare-candy' then
    v_build := public.pokemon_build(p_individual);
    if (v_build ->> 'capped')::boolean then raise exception 'level_capped' using errcode = 'P0001'; end if;
    g.bonus_exp := g.bonus_exp + ((v_build ->> 'expNext')::integer - (v_build ->> 'exp')::integer);
  else
    raise exception 'invalid_item' using errcode = 'P0001';
  end if;

  if v_count = 1 then
    delete from public.bag where user_id = v_user and item_id = p_item;
  else
    update public.bag set count = count - 1 where user_id = v_user and item_id = p_item;
  end if;
  update public.pokemon_growth set iv = g.iv, bonus_exp = g.bonus_exp, item_uses = g.item_uses + 1
    where individual_id = p_individual;
  v_result := public.pokemon_build(p_individual);
  insert into public.pokemon_build_ops (user_id, operation_id, individual_id, kind, item, stat, result)
    values (v_user, p_operation, p_individual, 'item', p_item, p_stat, v_result);
  return v_result;
end;
$$;

create function public.pokemon_awaken(p_operation uuid, p_individual uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_replay jsonb := public.pokemon_build_begin(p_operation, p_individual, 'awaken', null, null);
  g public.pokemon_growth;
  v_affection integer;
  v_result jsonb;
begin
  if v_replay is not null then return v_replay; end if;
  select * into g from public.pokemon_growth where individual_id = p_individual for update;
  if g.bonus_stars > 0 then raise exception 'already_awakened' using errcode = 'P0001'; end if;
  select coalesce(max(affection), 0) into v_affection from public.pokemon_care where individual_id = p_individual;
  if v_affection < 450 then raise exception 'not_ready' using errcode = 'P0001'; end if;
  if public.pokemon_build_stars(p_individual) >= 5 then raise exception 'max_stars' using errcode = 'P0001'; end if;
  update public.pokemon_growth set bonus_stars = 1 where individual_id = p_individual;
  v_result := public.pokemon_build(p_individual);
  insert into public.pokemon_build_ops (user_id, operation_id, individual_id, kind, result)
    values (v_user, p_operation, p_individual, 'awaken', v_result);
  return v_result;
end;
$$;

revoke execute on function
  public.pokemon_build_begin(uuid, uuid, text, text, smallint),
  public.pokemon_use_item(uuid, uuid, text, smallint),
  public.pokemon_awaken(uuid, uuid)
  from public, anon, authenticated;
grant execute on function
  public.pokemon_use_item(uuid, uuid, text, smallint),
  public.pokemon_awaken(uuid, uuid)
  to authenticated;
