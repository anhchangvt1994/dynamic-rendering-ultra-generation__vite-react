-- Up to ten named teams per trainer. trainer_profiles.team stays the ACTIVE team
-- (what the mini games read); trainer_teams holds every team, active_team says which.
-- Rules mirror src/pages/MiniGamePage/trainer/teams.mjs.
alter table public.trainer_profiles add column active_team smallint not null default 1 check (active_team between 1 and 10);

create table public.trainer_teams (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 10),
  name text not null check (char_length(name) between 1 and 20),
  members uuid[] not null default '{}' check (cardinality(members) <= 6),
  primary key (user_id, slot)
);
alter table public.trainer_teams enable row level security;
create policy "trainer_teams: read own" on public.trainer_teams
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.trainer_teams from anon, authenticated;
grant select on public.trainer_teams to authenticated;

-- p_teams: [{slot, name, members:[uuid|null]}], 1..10 of them; p_active: the slot in use.
-- members is positional (index = slot in the team, null = an empty slot); trainer_profiles.team
-- gets the active team's Pokémon without the holes.
create function public.trainer_save_teams(p_teams jsonb, p_active integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_level integer;
  v_slots integer;
  v_team jsonb;
  v_slot integer;
  v_name text;
  v_members uuid[];
  v_id uuid;
  v_affection integer;
  v_active uuid[];
begin
  if v_user is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_teams) is distinct from 'array' or jsonb_array_length(p_teams) not between 1 and 10 then
    raise exception 'bad_teams' using errcode = 'P0001';
  end if;
  perform public.trainer_grant_xp(v_user, 0);
  perform 1 from public.trainer_profiles where user_id = v_user for update;
  v_level := public.trainer_level((select xp from public.trainer_profiles where user_id = v_user));
  v_slots := public.trainer_team_slots(v_level);
  if (select count(distinct (t->>'slot')) from jsonb_array_elements(p_teams) t) <> jsonb_array_length(p_teams) then
    raise exception 'bad_teams' using errcode = 'P0001';
  end if;
  for v_team in select * from jsonb_array_elements(p_teams) loop
    v_slot := (v_team->>'slot')::integer;
    if v_slot is null or v_slot not between 1 and 10 then raise exception 'bad_teams' using errcode = 'P0001'; end if;
    v_name := left(btrim(regexp_replace(coalesce(v_team->>'name', ''), '\s+', ' ', 'g')), 20);
    if v_name = '' then v_name := 'Đội ' || v_slot; end if;
    select coalesce(array_agg(x::uuid order by ord), '{}') into v_members
      from jsonb_array_elements_text(coalesce(v_team->'members', '[]'::jsonb)) with ordinality as e(x, ord);
    if (select count(distinct m) from unnest(v_members) m) <> cardinality(array_remove(v_members, null)) then
      raise exception 'duplicate' using errcode = 'P0001';
    end if;
    if cardinality(v_members) > v_slots then raise exception 'team_full' using errcode = 'P0001'; end if;
    foreach v_id in array v_members loop
      continue when v_id is null;
      if not exists (select 1 from public.pokemon_individuals where id = v_id and user_id = v_user) then
        raise exception 'not_found' using errcode = 'P0001';
      end if;
      select coalesce(affection, 0) into v_affection from public.pokemon_care where individual_id = v_id;
      if v_level + 2 * public.trainer_bond(coalesce(v_affection, 0)) < (public.pokemon_build(v_id) ->> 'level')::integer then
        raise exception 'not_eligible' using errcode = 'P0001';
      end if;
    end loop;
    if v_slot = p_active then v_active := array_remove(v_members, null); end if;
  end loop;
  if v_active is null then raise exception 'bad_teams' using errcode = 'P0001'; end if;

  delete from public.trainer_teams where user_id = v_user;
  insert into public.trainer_teams (user_id, slot, name, members)
  select v_user, (t->>'slot')::smallint,
    coalesce(nullif(left(btrim(regexp_replace(coalesce(t->>'name', ''), '\s+', ' ', 'g')), 20), ''), 'Đội ' || (t->>'slot')),
    coalesce((select array_agg(x::uuid order by ord) from jsonb_array_elements_text(coalesce(t->'members', '[]'::jsonb)) with ordinality as e(x, ord)), '{}')
  from jsonb_array_elements(p_teams) t;
  update public.trainer_profiles set team = v_active, active_team = p_active where user_id = v_user;
  return (select jsonb_build_object('avatar', avatar, 'xp', xp, 'team', to_jsonb(team), 'active', active_team)
    from public.trainer_profiles where user_id = v_user);
end;
$$;

-- fast switch: only the active team changes
create function public.trainer_switch_team(p_slot integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_members uuid[];
begin
  if v_user is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  perform 1 from public.trainer_profiles where user_id = v_user for update;
  select members into v_members from public.trainer_teams where user_id = v_user and slot = p_slot;
  if not found then raise exception 'bad_teams' using errcode = 'P0001'; end if;
  update public.trainer_profiles set team = array_remove(v_members, null), active_team = p_slot where user_id = v_user;
  return (select jsonb_build_object('avatar', avatar, 'xp', xp, 'team', to_jsonb(team), 'active', active_team)
    from public.trainer_profiles where user_id = v_user);
end;
$$;

revoke execute on function public.trainer_save_teams(jsonb, integer), public.trainer_switch_team(integer) from public, anon;
grant execute on function public.trainer_save_teams(jsonb, integer), public.trainer_switch_team(integer) to authenticated;
