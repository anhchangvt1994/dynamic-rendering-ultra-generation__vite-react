-- Pokémon build, read side: innate genes derived from the individual's id, EV
-- from care, exp / level / stars, final stats and the default moves. Only what
-- changes over time is stored (pokemon_growth); everything else is a pure
-- function of the id, the species data and the care row.

create table public.pokemon_growth (
  individual_id uuid primary key references public.pokemon_individuals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  iv smallint[] not null check (cardinality(iv) = 6 and 0 <= all (iv) and 31 >= all (iv)),
  bonus_exp integer not null default 0 check (bonus_exp >= 0),
  bonus_stars smallint not null default 0 check (bonus_stars between 0 and 1),
  item_uses smallint not null default 0 check (item_uses between 0 and 3)
);
create index pokemon_growth_owner on public.pokemon_growth (user_id);
alter table public.pokemon_growth enable row level security;
create policy "read own growth" on public.pokemon_growth for select using (user_id = (select auth.uid()));
revoke all on public.pokemon_growth from anon, authenticated;
grant select on public.pokemon_growth to authenticated;

-- 25 natures: index = 5 * raised + lowered over (atk, def, spe, spa, spd);
-- raised = lowered is neutral. stat 0..5 = hp, atk, def, spa, spd, spe
create function public.pokemon_nature_mult(p_nature smallint, p_stat smallint)
returns numeric language sql immutable set search_path = '' as $$
  select case
    when p_stat = 0 or p_nature / 5 = p_nature % 5 then 1
    when p_stat = (array[1, 2, 5, 3, 4])[p_nature / 5 + 1] then 1.1
    when p_stat = (array[1, 2, 5, 3, 4])[p_nature % 5 + 1] then 0.9
    else 1
  end
$$;

create function public.pokemon_stat_value(p_base integer, p_iv integer, p_ev integer, p_level integer, p_is_hp boolean, p_mult numeric)
returns integer language sql immutable set search_path = '' as $$
  select case when p_is_hp
    then (2 * p_base + p_iv + p_ev / 4) * p_level / 100 + p_level + 10
    else pg_catalog.floor(((2 * p_base + p_iv + p_ev / 4) * p_level / 100 + 5) * p_mult)::integer
  end
$$;

-- The official growth curves divided by 250 (medium: level 50 = 500, 100 =
-- 4000), and never fewer than one exp per early level so a newborn does not
-- start at level 5.
create function public.pokemon_level_exp(p_growth text, p_level integer)
returns integer language plpgsql immutable set search_path = '' as $$
declare
  n numeric := p_level;
  raw numeric;
begin
  if p_level <= 1 then return 0; end if;
  raw := case p_growth
    when 'fast' then 4 * n ^ 3 / 5
    when 'medium' then n ^ 3
    when 'medium-slow' then 6 * n ^ 3 / 5 - 15 * n ^ 2 + 100 * n - 140
    when 'slow' then 5 * n ^ 3 / 4
    when 'erratic' then case
      when n < 50 then n ^ 3 * (100 - n) / 50
      when n < 68 then n ^ 3 * (150 - n) / 100
      when n < 98 then n ^ 3 * pg_catalog.floor((1911 - 10 * n) / 3) / 500
      else n ^ 3 * (160 - n) / 100 end
    when 'fluctuating' then case
      when n < 15 then n ^ 3 * (pg_catalog.floor((n + 1) / 3) + 24) / 50
      when n < 36 then n ^ 3 * (n + 14) / 50
      else n ^ 3 * (pg_catalog.floor(n / 2) + 32) / 50 end
  end;
  return greatest(pg_catalog.ceil(raw / 250)::integer, p_level - 1);
end;
$$;

create function public.pokemon_level_from_exp(p_growth text, p_exp integer, p_cap integer)
returns integer language sql immutable set search_path = '' as $$
  select coalesce(max(l), 1)
    from pg_catalog.generate_series(1, least(greatest(p_cap, 1), 100)) l
   where public.pokemon_level_exp(p_growth, l) <= p_exp
$$;

create function public.pokemon_iv_stars(p_iv smallint[])
returns integer language sql immutable set search_path = '' as $$
  select 1 + least(4, (select coalesce(sum(x), 0) from pg_catalog.unnest(p_iv) x)::integer * 5 / 187)
$$;

-- IV at birth: the potential offsets (-5..5) spread over 0..31
create function public.pokemon_birth_iv(p_potential jsonb)
returns smallint[] language sql immutable set search_path = '' as $$
  select array(
    select least(31, greatest(0, (5 + coalesce((p_potential -> 'offsets' ->> i)::integer, 0)) * 31 / 10))::smallint
      from pg_catalog.generate_series(0, 5) i
     order by i
  )
$$;

-- potential stars at birth, plus the stars the IV items have added since, plus
-- the awakening star; the care stat cap and the level cap both follow it
create function public.pokemon_build_stars(p_individual uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select least(5,
    greatest(1, coalesce((i.potential ->> 'stars')::integer, 1)
      + public.pokemon_iv_stars(coalesce(g.iv, public.pokemon_birth_iv(i.potential)))
      - public.pokemon_iv_stars(public.pokemon_birth_iv(i.potential)))
    + coalesce(g.bonus_stars, 0))
    from public.pokemon_individuals i
    left join public.pokemon_growth g on g.individual_id = i.id
   where i.id = p_individual
$$;

create function public.pokemon_build_genes(p_id uuid, p_species smallint)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_base public.pokemon_species_base;
  v_regular jsonb;
  v_hidden jsonb;
  v_ability jsonb;
begin
  select * into v_base from public.pokemon_species_base where species = p_species;
  if not found then raise exception 'no species data for %', p_species; end if;
  select jsonb_agg(a order by (a ->> 'slot')::integer) filter (where not (a ->> 'hidden')::boolean),
         jsonb_agg(a order by (a ->> 'slot')::integer) filter (where (a ->> 'hidden')::boolean)
    into v_regular, v_hidden
    from pg_catalog.jsonb_array_elements(v_base.abilities) a;
  if v_hidden is not null and public.pokemon_individual_u32(p_id, 'ability-hidden') % 10 = 0 then
    v_ability := v_hidden -> 0;
  else
    v_ability := v_regular -> (public.pokemon_individual_u32(p_id, 'ability') % jsonb_array_length(v_regular))::integer;
  end if;
  return jsonb_build_object(
    'nature', (public.pokemon_individual_u32(p_id, 'nature') % 25)::integer,
    'ability', v_ability,
    'gender', case
      when v_base.gender_rate < 0 then 'none'
      when public.pokemon_individual_u32(p_id, 'gender') % 8 < v_base.gender_rate then 'female'
      else 'male' end,
    'shiny', public.pokemon_individual_u32(p_id, 'shiny') % 1024 = 0,
    'size', 90 + (public.pokemon_individual_u32(p_id, 'size') % 21)::integer
  );
end;
$$;

-- hp, atk, def, spa, spd, spe  <-  friendship, power, beauty, wisdom, happiness, agility
create function public.pokemon_build_ev(p_individual uuid)
returns smallint[] language plpgsql stable security definer set search_path = '' as $$
declare
  r jsonb := public.pokemon_care_rules();
  v_cap integer := (r ->> 'CAP_BASE')::integer + (r ->> 'CAP_PER_STAR')::integer * public.pokemon_build_stars(p_individual);
  c public.pokemon_care;
  v_stats integer[];
  v_ev integer[];
  v_sum integer;
begin
  select * into c from public.pokemon_care where individual_id = p_individual;
  if not found then return array[0, 0, 0, 0, 0, 0]::smallint[]; end if;
  v_stats := array[c.friendship, c.power, c.beauty, c.wisdom, c.happiness, c.agility];
  select array_agg(least(252, 252 * s / v_cap) order by o), sum(least(252, 252 * s / v_cap))
    into v_ev, v_sum
    from pg_catalog.unnest(v_stats) with ordinality t(s, o);
  if v_sum > 510 then
    select array_agg(e * 510 / v_sum order by o) into v_ev from pg_catalog.unnest(v_ev) with ordinality t(e, o);
  end if;
  return v_ev::smallint[];
end;
$$;

create function public.pokemon_default_moves(p_species smallint, p_level integer)
returns text[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(move order by level, move), '{}')
    from (select move, level from public.pokemon_learnset
           where species = p_species and method = 'level-up' and level <= p_level
           order by level desc, move desc limit 4) t
$$;

create function public.pokemon_build(p_individual uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  i public.pokemon_individuals;
  b public.pokemon_species_base;
  g public.pokemon_growth;
  c public.pokemon_care;
  v_genes jsonb;
  v_iv smallint[];
  v_ev smallint[];
  v_base integer[];
  v_stats integer[] := '{}';
  v_stars integer;
  v_cap integer;
  v_exp integer;
  v_level integer;
  k integer;
begin
  select * into i from public.pokemon_individuals where id = p_individual;
  if not found or i.user_id is distinct from auth.uid() then
    raise exception 'not your Pokémon' using errcode = '42501';
  end if;
  select * into b from public.pokemon_species_base where species = i.pokemon_id;
  if not found then raise exception 'no species data for %', i.pokemon_id; end if;
  select * into g from public.pokemon_growth where individual_id = i.id;
  select * into c from public.pokemon_care where individual_id = i.id;

  v_iv := coalesce(g.iv, public.pokemon_birth_iv(i.potential));
  v_stars := public.pokemon_build_stars(i.id);
  v_cap := least(100, 50 + 10 * v_stars);
  v_exp := coalesce(c.affection, 0) + coalesce(g.bonus_exp, 0);
  v_level := public.pokemon_level_from_exp(b.growth, v_exp, v_cap);
  v_genes := public.pokemon_build_genes(i.id, i.pokemon_id);
  v_ev := public.pokemon_build_ev(i.id);
  v_base := array[b.hp, b.atk, b.def, b.spa, b.spd, b.spe];
  for k in 0..5 loop
    v_stats := v_stats || public.pokemon_stat_value(
      v_base[k + 1], v_iv[k + 1], v_ev[k + 1], v_level, k = 0,
      public.pokemon_nature_mult((v_genes ->> 'nature')::smallint, k::smallint));
  end loop;

  return v_genes || jsonb_build_object(
    'species', i.pokemon_id,
    'level', v_level,
    'exp', v_exp,
    'expFloor', public.pokemon_level_exp(b.growth, v_level),
    'expNext', case when v_level >= v_cap then null else public.pokemon_level_exp(b.growth, v_level + 1) end,
    'cap', v_cap,
    'capped', v_level >= v_cap,
    'stars', v_stars,
    'bonusStars', coalesce(g.bonus_stars, 0),
    'awakened', coalesce(g.bonus_stars, 0) > 0,
    'itemUses', coalesce(g.item_uses, 0),
    'iv', to_jsonb(v_iv),
    'ev', to_jsonb(v_ev),
    'stats', to_jsonb(v_stats),
    'moves', to_jsonb(public.pokemon_default_moves(i.pokemon_id, v_level))
  );
end;
$$;

-- helpers read other people's rows as the owner role: only pokemon_build is public
revoke execute on function
  public.pokemon_build_stars(uuid), public.pokemon_build_ev(uuid),
  public.pokemon_build_genes(uuid, smallint), public.pokemon_default_moves(smallint, integer)
  from public, anon, authenticated;
revoke execute on function public.pokemon_build(uuid) from public, anon;
grant execute on function public.pokemon_build(uuid) to authenticated;
