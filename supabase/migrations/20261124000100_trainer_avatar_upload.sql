-- A trainer's own avatar picture. The browser crops it square and shrinks it
-- (256px, webp/jpeg), so it is small enough to live in the row as a data URL:
-- no storage service to run. The profile's avatar is 'custom' while it is used;
-- picking a preset keeps the picture so "custom" can be chosen again.
create table public.trainer_avatar_images (
  user_id uuid primary key references auth.users(id) on delete cascade,
  image text not null check (
    length(image) <= 100000
    and image ~ '^data:image/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$'
  ),
  updated_at timestamptz not null default now()
);
alter table public.trainer_avatar_images enable row level security;
create policy "trainer_avatar_images: read own" on public.trainer_avatar_images
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.trainer_avatar_images from anon, authenticated;
grant select on public.trainer_avatar_images to authenticated;

create function public.trainer_upload_avatar(p_image text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  if p_image is null or length(p_image) > 100000
     or p_image !~ '^data:image/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$' then
    raise exception 'bad_image' using errcode = 'P0001';
  end if;
  perform public.trainer_grant_xp(v_user, 0);
  insert into public.trainer_avatar_images (user_id, image) values (v_user, p_image)
    on conflict (user_id) do update set image = excluded.image, updated_at = now();
  update public.trainer_profiles set avatar = 'custom' where user_id = v_user;
  return (select jsonb_build_object('avatar', avatar, 'xp', xp, 'team', team)
    from public.trainer_profiles where user_id = v_user);
end;
$$;
revoke execute on function public.trainer_upload_avatar(text) from public, anon;
grant execute on function public.trainer_upload_avatar(text) to authenticated;

-- 'custom' is allowed once a picture exists; the presets keep their unlock rules.
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
  if p_avatar = 'custom' then
    if not exists (select 1 from public.trainer_avatar_images where user_id = v_user) then
      raise exception 'bad_avatar' using errcode = 'P0001';
    end if;
    perform public.trainer_grant_xp(v_user, 0);
    update public.trainer_profiles set avatar = 'custom' where user_id = v_user;
    return (select jsonb_build_object('avatar', avatar, 'xp', xp, 'team', team) from public.trainer_profiles where user_id = v_user);
  end if;
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
