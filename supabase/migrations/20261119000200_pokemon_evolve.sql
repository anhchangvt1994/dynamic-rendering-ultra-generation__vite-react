-- Pokémon evolution: the write side. Re-checks every condition on the server,
-- spends the stone, swaps the species, keeps the level from dropping and
-- records the species in the collection. Idempotent per operation id.

create function public.pokemon_evolve(
  p_operation uuid, p_individual uuid, p_branch smallint,
  p_context jsonb default '{}', p_item text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_prior public.pokemon_evolution_log;
  v_ind public.pokemon_individuals;
  v_opts jsonb;
  v_branch jsonb;
  v_alt jsonb;
  v_from smallint;
  v_before integer;
  v_after integer;
  v_build jsonb;
  v_growth text;
  v_exp integer;
  v_first boolean;
  v_dropped text[] := '{}';
  v_custom boolean;
  v_receipt jsonb;
begin
  if p_operation is null then raise exception 'invalid_operation' using errcode = 'P0001'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':evolve:' || p_operation::text, 0));
  select * into v_prior from public.pokemon_evolution_log where user_id = v_user and operation_id = p_operation;
  if found then
    if v_prior.individual_id <> p_individual or v_prior.branch <> p_branch or v_prior.item is distinct from p_item then
      raise exception 'operation_conflict' using errcode = 'P0001';
    end if;
    return v_prior.receipt;
  end if;

  select * into v_ind from public.pokemon_individuals where id = p_individual and user_id = v_user for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  v_from := v_ind.pokemon_id;

  v_opts := public.pokemon_evolution_options(p_individual, coalesce(p_context, '{}'));
  select b into v_branch from pg_catalog.jsonb_array_elements(v_opts -> 'branches') b
    where (b ->> 'to')::integer = p_branch limit 1;
  if v_branch is null then raise exception 'invalid_branch' using errcode = 'P0001'; end if;

  select a into v_alt from pg_catalog.jsonb_array_elements(v_branch -> 'alts') a
    where (a ->> 'ok')::boolean
      and case when p_item is null then a ->> 'kind' <> 'item'
               else a ->> 'kind' = 'item' and a ->> 'item' = p_item end
    limit 1;
  if v_alt is null then raise exception 'not_eligible' using errcode = 'P0001'; end if;

  if p_item is not null then
    update public.bag set count = count - 1 where user_id = v_user and item_id = p_item and count > 1;
    if not found then
      delete from public.bag where user_id = v_user and item_id = p_item and count = 1;
      if not found then raise exception 'no_item' using errcode = 'P0001'; end if;
    end if;
  end if;

  v_before := (v_opts ->> 'level')::integer;
  insert into public.pokemon_growth (individual_id, user_id, iv)
    values (v_ind.id, v_user, public.pokemon_birth_iv(v_ind.potential))
    on conflict (individual_id) do nothing;
  update public.pokemon_individuals set pokemon_id = p_branch where id = v_ind.id;

  v_build := public.pokemon_build(v_ind.id);
  v_after := (v_build ->> 'level')::integer;
  if v_after < v_before then
    select growth into v_growth from public.pokemon_species_base where species = p_branch;
    v_exp := (v_build ->> 'exp')::integer;
    update public.pokemon_growth
      set bonus_exp = bonus_exp + (public.pokemon_level_exp(v_growth, v_before) - v_exp)
      where individual_id = v_ind.id;
    v_build := public.pokemon_build(v_ind.id);
    v_after := (v_build ->> 'level')::integer;
  end if;

  select moves_custom into v_custom from public.pokemon_growth where individual_id = v_ind.id;
  if v_custom then
    with gone as (
      delete from public.pokemon_moveset m
        where m.individual_id = v_ind.id
          and not exists (select 1 from public.pokemon_learnset l where l.species = p_branch and l.move = m.move)
        returning m.move)
    select coalesce(pg_catalog.array_agg(move order by move), '{}') into v_dropped from gone;
    v_build := public.pokemon_build(v_ind.id);
  end if;

  insert into public.pokemon_dex (user_id, pokemon_id, via) values (v_user, v_from, 'owned')
    on conflict do nothing;
  insert into public.pokemon_dex (user_id, pokemon_id, via) values (v_user, p_branch, 'evolution')
    on conflict do nothing;
  v_first := found;

  v_receipt := pg_catalog.jsonb_build_object(
    'from', v_from, 'to', p_branch, 'first', v_first, 'item', p_item,
    'levelBefore', v_before, 'levelAfter', v_after,
    'build', v_build, 'dropped', pg_catalog.to_jsonb(v_dropped));
  insert into public.pokemon_evolution_log (user_id, operation_id, individual_id, branch, item, receipt)
    values (v_user, p_operation, v_ind.id, p_branch, p_item, v_receipt);
  return v_receipt;
end;
$$;
revoke all on function public.pokemon_evolve(uuid, uuid, smallint, jsonb, text) from public, anon;
grant execute on function public.pokemon_evolve(uuid, uuid, smallint, jsonb, text) to authenticated;
