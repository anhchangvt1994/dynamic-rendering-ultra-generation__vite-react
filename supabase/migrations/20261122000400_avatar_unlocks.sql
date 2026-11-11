-- Avatars unlock by progress the player can see (level, mini-game wins, Pokémon
-- owned, team size), not by badges: badges are kept for gym battles.
-- avatars.mjs AVATARS, as JSON (sqlParity.test.mjs keeps them equal).
create or replace function public.trainer_avatars()
returns jsonb language sql immutable set search_path = '' as $fn$
  select $avatars$[{"id":"rookie","name":"Tân binh","unlock":{"type":"free"}},{"id":"scout","name":"Trinh sát","unlock":{"type":"free"}},{"id":"camper","name":"Dân cắm trại","unlock":{"type":"free"}},{"id":"hiker","name":"Người leo núi","unlock":{"type":"level","level":5}},{"id":"ranger","name":"Kiểm lâm","unlock":{"type":"level","level":10}},{"id":"breeder","name":"Người nhân giống","unlock":{"type":"level","level":15}},{"id":"ace","name":"Át chủ bài","unlock":{"type":"level","level":20}},{"id":"champion","name":"Nhà vô địch","unlock":{"type":"level","level":30}},{"id":"duelist","name":"Đấu thủ","unlock":{"type":"wins","wins":1}},{"id":"sage","name":"Hiền giả","unlock":{"type":"wins","wins":10}},{"id":"collector","name":"Nhà sưu tầm","unlock":{"type":"owned","owned":20}},{"id":"captain","name":"Đội trưởng","unlock":{"type":"team","size":6}}]$avatars$::jsonb
$fn$;

create or replace function public.trainer_set_avatar(p_avatar text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_entry jsonb;
  v_unlock jsonb;
  v_profile public.trainer_profiles;
  v_level integer;
  v_wins integer := 0;
  v_owned integer;
  v_ok boolean;
begin
  if v_user is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  select a into v_entry from jsonb_array_elements(public.trainer_avatars()) a where a->>'id' = p_avatar;
  if v_entry is null then raise exception 'bad_avatar' using errcode = 'P0001'; end if;
  perform public.trainer_grant_xp(v_user, 0);
  select * into v_profile from public.trainer_profiles where user_id = v_user;
  v_level := public.trainer_level(v_profile.xp);
  select coalesce(sum(wins), 0)::integer into v_wins from public.minigame_players where user_id = v_user;
  select count(*)::integer into v_owned from public.pokemon_individuals where user_id = v_user;
  v_unlock := v_entry->'unlock';
  v_ok := case v_unlock->>'type'
    when 'free' then true
    when 'level' then v_level >= (v_unlock->>'level')::int
    when 'wins' then v_wins >= (v_unlock->>'wins')::int
    when 'owned' then v_owned >= (v_unlock->>'owned')::int
    when 'team' then cardinality(v_profile.team) >= (v_unlock->>'size')::int
    else false
  end;
  if not v_ok then raise exception 'locked' using errcode = 'P0001'; end if;
  update public.trainer_profiles set avatar = p_avatar where user_id = v_user;
  return (select jsonb_build_object('avatar', avatar, 'xp', xp, 'team', team) from public.trainer_profiles where user_id = v_user);
end;
$$;
