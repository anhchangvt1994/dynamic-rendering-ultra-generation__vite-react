-- Pokémon evolution: what each branch needs and how far the individual is.
-- Read only. Server clock decides day / dusk / night (Asia/Ho_Chi_Minh).

create function public.pokemon_evolution_clock(p_now timestamptz default now())
returns text language sql stable set search_path = '' as $$
  select case
    when h >= 6 and h < 17 then 'day'
    when h = 17 then 'dusk'
    else 'night' end
  from (select extract(hour from p_now at time zone 'Asia/Ho_Chi_Minh')::integer h) t
$$;
revoke all on function public.pokemon_evolution_clock(timestamptz) from public, anon, authenticated;

create function public.pokemon_evolution_options(p_individual uuid, p_context jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  i public.pokemon_individuals;
  c public.pokemon_care;
  v_build jsonb;
  v_level integer;
  v_gender text;
  v_atk integer;
  v_def integer;
  v_moves text[];
  v_types text[];
  v_clock text := public.pokemon_evolution_clock();
  v_where text := p_context ->> 'where';
  v_party jsonb := case when pg_catalog.jsonb_typeof(p_context -> 'party') = 'array' then p_context -> 'party' else '[]'::jsonb end;
  e public.pokemon_evolutions;
  v_reasons jsonb;
  v_ok boolean;
  v_kind text;
  v_owned integer;
  v_have boolean;
  v_alts jsonb;
  v_branches jsonb := '[]';
  v_to smallint := null;
  v_eligible boolean := false;
  v_bkind text;
  v_first_kind text;
  v_ok_kind text;
  v_unavailable text;
begin
  select * into i from public.pokemon_individuals where id = p_individual and user_id = auth.uid();
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into c from public.pokemon_care where individual_id = i.id;
  v_build := public.pokemon_build(i.id);
  v_level := (v_build ->> 'level')::integer;
  v_gender := v_build ->> 'gender';
  v_atk := (v_build -> 'stats' ->> 1)::integer;
  v_def := (v_build -> 'stats' ->> 2)::integer;
  select coalesce(pg_catalog.array_agg(m) filter (where m is not null), '{}')
    into v_moves from pg_catalog.jsonb_array_elements_text(v_build -> 'moves') m;
  select coalesce(pg_catalog.array_agg(r.type), '{}') into v_types
    from public.pokemon_moves_ref r where r.move = any (v_moves);

  for e in
    select * from public.pokemon_evolutions where from_species = i.pokemon_id order by to_species, alt
  loop
    if v_to is distinct from e.to_species then
      if v_to is not null then
        v_branches := v_branches || pg_catalog.jsonb_build_object(
          'to', v_to, 'eligible', v_eligible, 'kind', coalesce(v_ok_kind, v_first_kind), 'alts', v_alts);
      end if;
      v_to := e.to_species; v_alts := '[]'; v_eligible := false; v_ok_kind := null; v_first_kind := null;
    end if;

    v_reasons := '[]';
    v_ok := true;
    v_unavailable := coalesce(e.unavailable, case when e.party_type is not null then 'other' end);

    if e.min_level is not null then
      v_have := v_level >= e.min_level; v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'level', 'ok', v_have, 'need', e.min_level, 'have', v_level);
    end if;
    if e.min_happiness is not null then
      v_have := coalesce(c.affection, 0) >= e.min_happiness; v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'affection', 'ok', v_have, 'need', e.min_happiness, 'have', coalesce(c.affection, 0));
    end if;
    if e.min_affection is not null then
      v_have := coalesce(c.affection, 0) >= 150; v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'affection', 'ok', v_have, 'need', 150, 'have', coalesce(c.affection, 0));
    end if;
    if e.min_beauty is not null then
      v_have := coalesce(c.beauty, 0) >= pg_catalog.ceil(e.min_beauty / 2.0); v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'beauty', 'ok', v_have, 'need', pg_catalog.ceil(e.min_beauty / 2.0)::integer, 'have', coalesce(c.beauty, 0));
    end if;
    if e.time_of_day is not null then
      v_have := v_clock = e.time_of_day; v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'time', 'ok', v_have, 'need', e.time_of_day, 'have', v_clock);
    end if;
    if e.gender is not null then
      v_have := v_gender = case e.gender when 1 then 'female' else 'male' end; v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'gender', 'ok', v_have, 'need', case e.gender when 1 then 'female' else 'male' end, 'have', v_gender);
    end if;
    if e.known_move is not null then
      v_have := e.known_move = any (v_moves); v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'move', 'ok', v_have, 'need', e.known_move);
    end if;
    if e.known_move_type is not null then
      v_have := e.known_move_type = any (v_types); v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'move_type', 'ok', v_have, 'need', e.known_move_type);
    end if;
    if e.relative_stats is not null then
      v_have := pg_catalog.sign(v_atk - v_def) = e.relative_stats; v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'stat_rel', 'ok', v_have, 'need', e.relative_stats, 'have', pg_catalog.sign(v_atk - v_def)::integer);
    end if;
    if e.location is not null then
      v_have := v_where is not distinct from e.location; v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'location', 'ok', v_have, 'need', e.location);
    end if;
    if e.party_species is not null then
      v_have := v_party @> pg_catalog.to_jsonb(e.party_species::integer); v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'party_species', 'ok', v_have, 'need', e.party_species);
    end if;
    if e.party_type is not null then
      v_ok := false;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'party_type', 'ok', false, 'need', e.party_type);
    end if;
    if e.trade_species is not null then
      v_have := exists (select 1 from public.pokemon_individuals x where x.user_id = i.user_id and x.pokemon_id = e.trade_species);
      v_ok := v_ok and v_have;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'trade_species', 'ok', v_have, 'need', e.trade_species);
    end if;
    if v_unavailable is not null then
      v_ok := false;
      v_reasons := v_reasons || pg_catalog.jsonb_build_object('code', 'unavailable', 'ok', false, 'why', v_unavailable);
    end if;

    v_kind := case
      when e.item is not null then 'item'
      when e.min_happiness is not null or e.min_affection is not null then 'friend'
      when e.min_beauty is not null then 'beauty'
      when e.min_level is not null then 'level'
      else 'other' end;
    v_owned := case when e.item is null then null else coalesce(
      (select b.count from public.bag b where b.user_id = i.user_id and b.item_id = e.item), 0) end;

    v_alts := v_alts || pg_catalog.jsonb_build_object(
      'alt', e.alt, 'kind', v_kind, 'item', e.item, 'owned', v_owned,
      'ok', v_ok, 'unavailable', v_unavailable, 'reasons', v_reasons);
    v_first_kind := coalesce(v_first_kind, v_kind);
    if v_ok then
      v_eligible := true;
      v_ok_kind := coalesce(v_ok_kind, v_kind);
    end if;
  end loop;

  if v_to is not null then
    v_branches := v_branches || pg_catalog.jsonb_build_object(
      'to', v_to, 'eligible', v_eligible, 'kind', coalesce(v_ok_kind, v_first_kind), 'alts', v_alts);
  end if;

  return pg_catalog.jsonb_build_object('species', i.pokemon_id, 'level', v_level, 'branches', v_branches);
end;
$$;
revoke all on function public.pokemon_evolution_options(uuid, jsonb) from public, anon;
grant execute on function public.pokemon_evolution_options(uuid, jsonb) to authenticated;
