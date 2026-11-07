-- Appearance v3, rule 2: a cute species' marks are hearts, stars, flowers or
-- spots (never stripes, patches or scars), and every kind comes at least
-- three (patches and scars two). The shape of the appearance is unchanged
-- (still v 3), so the stored rows are re-derived once below.
-- Mirrors src/pages/BagPage/individuals/traits.mjs (APPEARANCE_RULE 2); the
-- palette arrays mirror SET_KEYS / TIER_KEYS in palettes.mjs (a JS test reads
-- the arrays below). The golden vectors in both test suites keep the two
-- identical.

-- The pure rule: traits of an id under a vibe (null or unknown → pool).
create or replace function public.pokemon_individual_traits_v(p_id uuid, p_vibe text)
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
    -- cumulative weights — cute: hearts 45, stars 25, flower 20, spots 10;
    -- every other vibe: spots 30, stripes 25, patch 20, scar 12, flower 8, stars 5
    v_kind := (public.pokemon_individual_u32(p_id, 'marks-kind') % 100)::integer;
    v_kind_name := case
      when p_vibe = 'cute' then case
        when v_kind < 45 then 'hearts' when v_kind < 70 then 'stars'
        when v_kind < 90 then 'flower' else 'spots' end
      when v_kind < 30 then 'spots' when v_kind < 55 then 'stripes'
      when v_kind < 75 then 'patch' when v_kind < 87 then 'scar'
      when v_kind < 95 then 'flower' else 'stars' end;
    -- at least three marks (two patches or scars), spread over the body
    v_marks := jsonb_build_object(
      'kind', v_kind_name,
      'count', case
        when v_kind_name = 'stars'
          then 3 + (public.pokemon_individual_u32(p_id, 'marks-count') % 5)::integer
        when v_kind_name in ('patch', 'scar')
          then 2 + (public.pokemon_individual_u32(p_id, 'marks-count') % 4)::integer
        else 3 + (public.pokemon_individual_u32(p_id, 'marks-count') % 8)::integer end,
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

select public.pokemon_individuals_upgrade_appearance();
