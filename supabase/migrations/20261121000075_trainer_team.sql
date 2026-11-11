-- The trainer's team: slots by trainer level, a Pokémon joins when
-- trainerLevel + 2 x bond >= its level (minigame.mjs slotsFor / canJoinTeam).
create function public.trainer_team_slots(p_level integer)
returns integer language sql immutable set search_path = '' as $$
  select least(6, 1 + p_level / 5)
$$;

-- care level 1..10 of an affection total
create function public.trainer_bond(p_affection integer)
returns integer language sql immutable set search_path = '' as $$
  select greatest(1, count(*)::integer)
  from jsonb_array_elements_text(public.pokemon_care_rules() -> 'LEVELS') l
  where l::integer <= p_affection
$$;

create function public.trainer_set_team(p_team uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_team uuid[] := coalesce(p_team, '{}');
  v_level integer;
  v_id uuid;
  v_affection integer;
begin
  if v_user is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  perform public.trainer_grant_xp(v_user, 0);
  perform 1 from public.trainer_profiles where user_id = v_user for update;
  v_level := public.trainer_level((select xp from public.trainer_profiles where user_id = v_user));
  if (select count(distinct x) from unnest(v_team) x) <> cardinality(v_team) then
    raise exception 'duplicate' using errcode = 'P0001';
  end if;
  if cardinality(v_team) > public.trainer_team_slots(v_level) then
    raise exception 'team_full' using errcode = 'P0001';
  end if;
  foreach v_id in array v_team loop
    if not exists (select 1 from public.pokemon_individuals where id = v_id and user_id = v_user) then
      raise exception 'not_found' using errcode = 'P0001';
    end if;
    select coalesce(affection, 0) into v_affection from public.pokemon_care where individual_id = v_id;
    if v_level + 2 * public.trainer_bond(coalesce(v_affection, 0)) < (public.pokemon_build(v_id) ->> 'level')::integer then
      raise exception 'not_eligible' using errcode = 'P0001';
    end if;
  end loop;
  update public.trainer_profiles set team = v_team where user_id = v_user;
  perform public.trainer_award_badges(v_user);
  return (select jsonb_build_object('avatar', avatar, 'xp', xp, 'team', to_jsonb(team)) from public.trainer_profiles where user_id = v_user);
end;
$$;

revoke execute on function public.trainer_team_slots(integer), public.trainer_bond(integer), public.trainer_set_team(uuid[]) from public, anon, authenticated;
grant execute on function public.trainer_set_team(uuid[]) to authenticated;
