-- Appearance v3: common/rare palettes come 70 % from the species' vibe set,
-- else from the common pool; stars marks come three to seven.
--   {"v":3,"palette":key,"shift":[[dh,ds,dl]×3],"marks":{"kind","count","seed"}|null}
-- Mirrors src/pages/BagPage/individuals/traits.mjs; the palette arrays mirror
-- SET_KEYS / TIER_KEYS in palettes.mjs (a JS test reads the arrays below). The
-- golden vectors in both test suites keep the two identical.

-- One vibe per species, written only by the server (service role) from the
-- Pokédex data; players can neither read nor write it.
create table public.pokemon_species_vibes (
  species_id smallint primary key check (species_id between 1 and 1025),
  vibe text not null check (vibe in ('cute','cool','fierce','mystic','nature')),
  v integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.pokemon_species_vibes enable row level security;
revoke all on public.pokemon_species_vibes from anon, authenticated;
grant select, insert, update on public.pokemon_species_vibes to service_role;

-- The pure rule: traits of an id under a vibe (null or unknown → pool).
create function public.pokemon_individual_traits_v(p_id uuid, p_vibe text)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_tier integer;
  v_set text;
  v_keys text[];
  v_shift jsonb := '[]';
  v_marks jsonb := null;
  v_kind integer;
  v_kind_name text;
  v_offsets integer[] := '{}';
  v_sum integer;
  i integer;
begin
  v_tier := (public.pokemon_individual_u32(p_id, 'palette-tier') % 100)::integer;
  if v_tier < 40 then
    v_keys := array['origin'];
  elsif v_tier >= 95 then
    v_keys := array['gold','silver','obsidian','invert','pearl'];
  else
    v_set := case
      when p_vibe in ('cute','cool','fierce','mystic','nature')
        and public.pokemon_individual_u32(p_id, 'palette-pool') % 100 < 70 then p_vibe
      else 'pool' end;
    if v_tier < 75 then
      v_keys := case v_set
        when 'cute' then array['strawberry-milk','mint-cream','banana','lavender']
        when 'cool' then array['cobalt','blaze','steel-blue','night-forest']
        when 'fierce' then array['crimson','venom','plum','toxic-green']
        when 'mystic' then array['nebula','ice-crystal','sapphire','ruby']
        when 'nature' then array['sprout','sea','amber','ochre']
        else array['sky','coral','mint','rose'] end;
    else
      v_keys := case v_set
        when 'cute' then array['cotton-candy','peach-milk','cloud']
        when 'cool' then array['lava','midnight','frostfire']
        when 'fierce' then array['blood-moon','toxin','umbra']
        when 'mystic' then array['aurora','galaxy','emerald']
        when 'nature' then array['jade','sakura','sunset']
        else array['candy','twilight','glacier'] end;
    end if;
  end if;
  for i in 0..2 loop
    v_shift := v_shift || jsonb_build_array(jsonb_build_array(
      (public.pokemon_individual_u32(p_id, 'shift' || i || '-h') % 17)::integer - 8,
      (public.pokemon_individual_u32(p_id, 'shift' || i || '-s') % 21)::integer - 10,
      (public.pokemon_individual_u32(p_id, 'shift' || i || '-l') % 13)::integer - 6));
  end loop;
  if public.pokemon_individual_u32(p_id, 'marks') % 100 < 60 then
    -- cumulative weights: spots 30, stripes 25, patch 20, scar 12, flower 8, stars 5
    v_kind := (public.pokemon_individual_u32(p_id, 'marks-kind') % 100)::integer;
    v_kind_name := case
      when v_kind < 30 then 'spots' when v_kind < 55 then 'stripes'
      when v_kind < 75 then 'patch' when v_kind < 87 then 'scar'
      when v_kind < 95 then 'flower' else 'stars' end;
    v_marks := jsonb_build_object(
      'kind', v_kind_name,
      'count', case when v_kind_name = 'stars'
        then 3 + (public.pokemon_individual_u32(p_id, 'marks-count') % 5)::integer
        else 1 + (public.pokemon_individual_u32(p_id, 'marks-count') % 10)::integer end,
      'seed', (public.pokemon_individual_u32(p_id, 'marks-seed') % 2147483648)::integer);
  end if;
  for i in 0..5 loop
    v_offsets := v_offsets || ((public.pokemon_individual_u32(p_id, 'p' || i) % 11)::integer - 5);
  end loop;
  select sum(o) into v_sum from unnest(v_offsets) o;
  return jsonb_build_object(
    'personality', (public.pokemon_individual_u32(p_id, 'personality') % 12)::integer,
    'appearance', jsonb_build_object('v', 3,
      'palette', v_keys[1 + (public.pokemon_individual_u32(p_id, 'palette') % pg_catalog.array_length(v_keys, 1))::integer],
      'shift', v_shift,
      'marks', v_marks),
    'potential', jsonb_build_object('v', 1, 'offsets', to_jsonb(v_offsets),
      'stars', 1 + ((v_sum + 30) * 5) / 61));
end;
$$;
revoke execute on function public.pokemon_individual_traits_v(uuid, text) from public, anon, authenticated;

-- traits(id, species): the species' vibe from the table (no row → no vibe).
-- Called from security definer functions (trade, upgrade).
create or replace function public.pokemon_individual_traits(p_id uuid, p_species smallint)
returns jsonb language sql stable set search_path = '' as $$
  select public.pokemon_individual_traits_v(p_id,
    (select vibe from public.pokemon_species_vibes where species_id = p_species));
$$;
revoke execute on function public.pokemon_individual_traits(uuid, smallint) from public, anon, authenticated;

-- Every individual (and the receipt of the trade that made it) takes the
-- appearance its id and species' vibe give now; personality and potential
-- are untouched. Idempotent: run again after the vibes table changes.
create or replace function public.pokemon_individuals_upgrade_appearance()
returns void language sql security definer set search_path = '' as $$
  update public.pokemon_individuals
    set appearance = public.pokemon_individual_traits(id, pokemon_id)->'appearance'
    where appearance is distinct from public.pokemon_individual_traits(id, pokemon_id)->'appearance';
  update public.pokemon_card_trades
    set receipt = pg_catalog.jsonb_set(receipt, '{traits,appearance}',
      public.pokemon_individual_traits(individual_id, pokemon_id)->'appearance')
    where receipt ? 'traits'
      and receipt#>'{traits,appearance}' is distinct from
        public.pokemon_individual_traits(individual_id, pokemon_id)->'appearance';
$$;
revoke execute on function public.pokemon_individuals_upgrade_appearance() from public, anon, authenticated;

select public.pokemon_individuals_upgrade_appearance();
