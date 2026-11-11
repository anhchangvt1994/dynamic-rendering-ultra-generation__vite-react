-- v2 review fixes: a finished quest of yesterday stays claimable once today's rows exist;
-- team and avatar pickers no longer award badges (badges are for gym battles, not the mini-game).
create or replace function public.minigame_quest_claim(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_rules jsonb := public.minigame_rules();
  v_today date := (now() at time zone 'utc')::date;
  v_row public.minigame_quests;
  v_prof public.trainer_profiles;
  v_xp integer;
  v_streak integer;
  v_seven boolean;
  v_gift text[];
  v_sgift text[];
  v_before integer;
  v_after integer;
  v_receipt jsonb;
begin
  if p_slot is null or p_slot not between 1 and (v_rules->>'QUEST_SLOTS')::int then
    raise exception 'bad_slot' using errcode = 'P0001';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':mg:quest', 0));
  select * into v_row from public.minigame_quests where user_id = v_user and slot = p_slot
    order by (claimed_at is null and progress >= goal) desc, (day = v_today) desc, day desc limit 1;
  if not found then raise exception 'not_done' using errcode = 'P0001'; end if;
  if v_row.claimed_at is not null then
    return jsonb_build_object('slot', v_row.slot, 'xp', (v_row.gift->>'xp')::int, 'gift', v_row.gift->'items',
      'streak', (v_row.gift->>'streak')::int, 'streakGift', v_row.gift->'streakGift',
      'level', (v_row.gift->>'level')::int, 'levelUp', (v_row.gift->>'levelUp')::boolean);
  end if;
  if v_row.progress < v_row.goal then raise exception 'not_done' using errcode = 'P0001'; end if;
  select (c->>'xp')::int into v_xp from jsonb_array_elements(public.minigame_quest_catalog()) c where c->>'kind' = v_row.kind;
  -- the streak this claim lands on (an unlocked read; claims are serialized above)
  select * into v_prof from public.trainer_profiles where user_id = v_user;
  v_streak := case
    when v_prof.quest_streak_day = v_today then v_prof.quest_streak
    when v_prof.quest_streak_day = v_today - 1 then v_prof.quest_streak + 1
    else 1 end;
  v_seven := v_prof.quest_streak_day is distinct from v_today and v_streak >= (v_rules->>'STREAK_DAYS')::int;
  v_before := coalesce((select public.trainer_level(xp) from public.trainer_profiles where user_id = v_user), 1);
  -- gifts into the bag first (bag before trainer)
  v_gift := public.quiz_chest(1, 0, v_rules->'CHEST_SURE_W', v_rules->'CHEST_REST_W');
  if v_seven then
    v_sgift := public.quiz_chest(2, 1, v_rules->'CHEST_SURE_W', v_rules->'CHEST_REST_W');
  end if;
  insert into public.bag (user_id, item_id, count)
    select v_user, item, count(*) from unnest(v_gift || coalesce(v_sgift, '{}')) item where item is not null group by item
    on conflict (user_id, item_id) do update set count = public.bag.count + excluded.count;
  perform public.trainer_grant_xp(v_user, v_xp);
  update public.trainer_profiles set quest_streak = case when v_seven then 0 else v_streak end, quest_streak_day = v_today
    where user_id = v_user;
  select public.trainer_level(xp) into v_after from public.trainer_profiles where user_id = v_user;
  select * into v_row from public.minigame_quests where user_id = v_user and day = v_row.day and slot = p_slot for update;
  if v_row.claimed_at is not null or v_row.progress < v_row.goal then
    raise exception 'not_done' using errcode = 'P0001';
  end if;
  v_receipt := jsonb_build_object('slot', p_slot, 'xp', v_xp, 'gift', to_jsonb(v_gift), 'streak', v_streak,
    'streakGift', case when v_seven then to_jsonb(v_sgift) else 'null'::jsonb end,
    'level', v_after, 'levelUp', v_after > v_before);
  update public.minigame_quests set claimed_at = now(),
    gift = jsonb_build_object('items', v_receipt->'gift', 'xp', v_xp, 'streak', v_streak,
      'streakGift', v_receipt->'streakGift', 'level', v_after, 'levelUp', v_after > v_before)
    where user_id = v_user and day = v_row.day and slot = p_slot;
  return v_receipt;
end;
$$;


create or replace function public.trainer_set_team(p_team uuid[])
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
  return (select jsonb_build_object('avatar', avatar, 'xp', xp, 'team', to_jsonb(team)) from public.trainer_profiles where user_id = v_user);
end;
$$;


create or replace function public.trainer_set_avatar(p_avatar text)
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

