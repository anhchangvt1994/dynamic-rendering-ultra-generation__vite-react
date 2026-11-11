-- Trainer badges and avatars. avatars.mjs AVATARS, as JSON (sqlParity.test.mjs
-- keeps them equal). minigame_players does not exist yet, so the win badges
-- read it only when it does.
create function public.trainer_avatars()
returns jsonb language sql immutable set search_path = '' as $fn$
  select $avatars$[{"id":"rookie","name":"Tân binh","unlock":{"type":"free"}},{"id":"scout","name":"Trinh sát","unlock":{"type":"free"}},{"id":"camper","name":"Dân cắm trại","unlock":{"type":"free"}},{"id":"hiker","name":"Người leo núi","unlock":{"type":"level","level":5}},{"id":"ranger","name":"Kiểm lâm","unlock":{"type":"level","level":10}},{"id":"breeder","name":"Người nhân giống","unlock":{"type":"level","level":15}},{"id":"ace","name":"Át chủ bài","unlock":{"type":"level","level":20}},{"id":"champion","name":"Nhà vô địch","unlock":{"type":"level","level":30}},{"id":"duelist","name":"Đấu thủ","unlock":{"type":"badge","badge":"first_win"}},{"id":"sage","name":"Hiền giả","unlock":{"type":"badge","badge":"flawless"}},{"id":"collector","name":"Nhà sưu tầm","unlock":{"type":"badge","badge":"owned_20"}},{"id":"captain","name":"Đội trưởng","unlock":{"type":"badge","badge":"full_team"}}]$avatars$::jsonb
$fn$;

-- grants the badges the trainer has earned; returns the new ones
create function public.trainer_award_badges(p_user uuid)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.trainer_profiles;
  v_level integer;
  v_owned integer;
  v_wins integer := 0;
  v_memory integer := 0;
  v_earned text[] := '{}';
  v_id text;
begin
  select * into v_profile from public.trainer_profiles where user_id = p_user;
  if not found then return '{}'; end if;
  v_level := public.trainer_level(v_profile.xp);
  select count(*) into v_owned from public.pokemon_individuals where user_id = p_user;
  if to_regclass('public.minigame_players') is not null then
    execute 'select coalesce(sum(wins),0), coalesce(sum(wins) filter (where game = ''memory''),0) from public.minigame_players where user_id = $1'
      into v_wins, v_memory using p_user;
  end if;
  for v_id in select id from unnest(array[
    case when v_wins >= 1 then 'first_win' end,
    case when v_memory >= 10 then 'wins10_memory' end,
    case when v_owned >= 5 then 'owned_5' end,
    case when v_owned >= 20 then 'owned_20' end,
    case when v_owned >= 50 then 'owned_50' end,
    case when cardinality(v_profile.team) >= 6 then 'full_team' end,
    case when v_level >= 5 then 'level_5' end,
    case when v_level >= 10 then 'level_10' end,
    case when v_level >= 20 then 'level_20' end,
    case when v_level >= 30 then 'level_30' end
  ]) as id where id is not null loop
    insert into public.trainer_badges (user_id, badge) values (p_user, v_id) on conflict do nothing;
    if found then v_earned := v_earned || v_id; end if;
  end loop;
  return v_earned;
end;
$$;

create function public.trainer_set_avatar(p_avatar text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_entry jsonb;
  v_unlock jsonb;
  v_level integer;
  v_ok boolean;
begin
  if v_user is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  select a into v_entry from jsonb_array_elements(public.trainer_avatars()) a where a->>'id' = p_avatar;
  if v_entry is null then raise exception 'bad_avatar' using errcode = 'P0001'; end if;
  perform public.trainer_grant_xp(v_user, 0);
  perform public.trainer_award_badges(v_user);
  v_unlock := v_entry->'unlock';
  v_level := public.trainer_level((select xp from public.trainer_profiles where user_id = v_user));
  v_ok := case v_unlock->>'type'
    when 'free' then true
    when 'level' then v_level >= (v_unlock->>'level')::int
    else exists (select 1 from public.trainer_badges where user_id = v_user and badge = v_unlock->>'badge')
  end;
  if not v_ok then raise exception 'locked' using errcode = 'P0001'; end if;
  update public.trainer_profiles set avatar = p_avatar where user_id = v_user;
  return (select jsonb_build_object('avatar', avatar, 'xp', xp, 'team', team) from public.trainer_profiles where user_id = v_user);
end;
$$;

revoke execute on function public.trainer_avatars(), public.trainer_award_badges(uuid), public.trainer_set_avatar(text) from public, anon, authenticated;
grant execute on function public.trainer_set_avatar(text) to authenticated;
