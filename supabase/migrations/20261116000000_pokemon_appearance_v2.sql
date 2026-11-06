-- Appearance v2: a curated palette per colour region, a small shift of each
-- region, and an optional group of marks the room draws on the body.
--   {"v":2,"palette":key,"shift":[[dh,ds,dl]×3],"marks":{"kind","count","seed"}|null}
-- Mirrors src/pages/BagPage/individuals/traits.mjs; the palette keys per tier
-- mirror TIER_KEYS in palettes.mjs (a JS test reads the arrays below). The
-- golden vectors in both test suites keep the two identical.
create or replace function public.pokemon_individual_traits(p_id uuid, p_species smallint)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_tier integer;
  v_keys text[];
  v_shift jsonb := '[]';
  v_marks jsonb := null;
  v_kind integer;
  v_offsets integer[] := '{}';
  v_sum integer;
  i integer;
begin
  v_tier := (public.pokemon_individual_u32(p_id, 'palette-tier') % 100)::integer;
  v_keys := case
    when v_tier < 40 then array['origin']
    when v_tier < 75 then array['ember','sunflower','moss','sky','lilac','coral','mint','sand','cocoa','rose','ocean','forest','peach','slate']
    when v_tier < 95 then array['sakura','aurora','lava','glacier','twilight','jade','amethyst','sunset','midnight','candy']
    else array['gold','silver','obsidian','invert','pearl']
  end;
  for i in 0..2 loop
    v_shift := v_shift || jsonb_build_array(jsonb_build_array(
      (public.pokemon_individual_u32(p_id, 'shift' || i || '-h') % 17)::integer - 8,
      (public.pokemon_individual_u32(p_id, 'shift' || i || '-s') % 21)::integer - 10,
      (public.pokemon_individual_u32(p_id, 'shift' || i || '-l') % 13)::integer - 6));
  end loop;
  if public.pokemon_individual_u32(p_id, 'marks') % 100 < 60 then
    -- cumulative weights: spots 30, stripes 25, patch 20, scar 12, flower 8, stars 5
    v_kind := (public.pokemon_individual_u32(p_id, 'marks-kind') % 100)::integer;
    v_marks := jsonb_build_object(
      'kind', case
        when v_kind < 30 then 'spots' when v_kind < 55 then 'stripes'
        when v_kind < 75 then 'patch' when v_kind < 87 then 'scar'
        when v_kind < 95 then 'flower' else 'stars' end,
      'count', 1 + (public.pokemon_individual_u32(p_id, 'marks-count') % 10)::integer,
      'seed', (public.pokemon_individual_u32(p_id, 'marks-seed') % 2147483648)::integer);
  end if;
  for i in 0..5 loop
    v_offsets := v_offsets || ((public.pokemon_individual_u32(p_id, 'p' || i) % 11)::integer - 5);
  end loop;
  select sum(o) into v_sum from unnest(v_offsets) o;
  return jsonb_build_object(
    'personality', (public.pokemon_individual_u32(p_id, 'personality') % 12)::integer,
    'appearance', jsonb_build_object('v', 2,
      'palette', v_keys[1 + (public.pokemon_individual_u32(p_id, 'palette') % pg_catalog.array_length(v_keys, 1))::integer],
      'shift', v_shift,
      'marks', v_marks),
    'potential', jsonb_build_object('v', 1, 'offsets', to_jsonb(v_offsets),
      'stars', 1 + ((v_sum + 30) * 5) / 61));
end;
$$;
revoke execute on function public.pokemon_individual_traits(uuid, smallint) from public, anon, authenticated;

-- Every individual (and the receipt of the trade that made it) takes the v2
-- appearance its id gives; personality and potential are untouched.
create function public.pokemon_individuals_upgrade_appearance()
returns void language sql security definer set search_path = '' as $$
  update public.pokemon_individuals
    set appearance = public.pokemon_individual_traits(id, pokemon_id)->'appearance'
    where appearance->>'v' is distinct from '2';
  update public.pokemon_card_trades
    set receipt = pg_catalog.jsonb_set(receipt, '{traits,appearance}',
      public.pokemon_individual_traits(individual_id, pokemon_id)->'appearance')
    where receipt ? 'traits' and receipt#>>'{traits,appearance,v}' is distinct from '2';
$$;
revoke execute on function public.pokemon_individuals_upgrade_appearance() from public, anon, authenticated;

select public.pokemon_individuals_upgrade_appearance();
