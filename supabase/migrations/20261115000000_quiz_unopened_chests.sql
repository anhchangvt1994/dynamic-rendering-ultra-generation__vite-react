-- A chest won stays the account's until it is opened: a reload brings the
-- "Mở quà" button back. Its items were paid into the bag by the answer, so
-- opening pays nothing; it only takes the chest off the list.
create table public.quiz_unopened_chests (
  round_id uuid not null,
  kind text not null check (kind in ('combo', 'special')),
  user_id uuid not null references auth.users (id) on delete cascade,
  gifts text[] not null,
  chest_reward_version smallint,
  created_at timestamptz not null default now(),
  primary key (round_id, kind)
);
create index quiz_unopened_chests_user on public.quiz_unopened_chests (user_id, created_at);
alter table public.quiz_unopened_chests enable row level security;
create policy quiz_unopened_chests_own on public.quiz_unopened_chests
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.quiz_unopened_chests from public, anon, authenticated;
grant select on public.quiz_unopened_chests to authenticated;

create or replace function public.quiz_unopened(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'round', round_id,
    'kind', kind,
    'gifts', to_jsonb(gifts),
    'chest_reward_version', chest_reward_version
  ) order by created_at, round_id, kind = 'special'), '[]')
  from public.quiz_unopened_chests where user_id = p_user;
$$;

create or replace function public.quiz_open_chests(p_round uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.quiz_unopened_chests
  where round_id = p_round and user_id = public.quiz_user();
$$;

create or replace function public.quiz_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_player public.quiz_players := public.quiz_time_window(v_user);
  v_pending public.quiz_rounds;
begin
  select * into v_pending from public.quiz_rounds where user_id = v_user and answered_at is null;
  return jsonb_build_object(
    'left', public.quiz_left(v_player),
    'refill_at', v_player.window_start + interval '3 hours',
    'now', now(),
    'used', v_player.used,
    'bonus', v_player.bonus,
    'wins', v_player.wins,
    'window_gifts', to_jsonb(v_player.window_gifts),
    'streak', v_player.streak,
    'records', v_player.records,
    'records_total', v_player.records_total,
    'rerolls_left', greatest(0, 3 - v_player.rerolls),
    'time_left', 10 - v_player.time_used,
    'time_refill_at', v_player.time_start + interval '1 hours',
    'pending', case when v_pending.id is null then null else public.quiz_public(v_pending) end,
    'chests', public.quiz_unopened(v_user)
  );
end;
$$;

create or replace function public.quiz_answer(p_round uuid, p_choice smallint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_round public.quiz_rounds;
  v_player public.quiz_players;
  v_elapsed numeric;
  v_t numeric;
  v_k numeric;
  v_slot smallint := -1;
  v_outcome text;
  v_gift text;
  v_missed text;
  v_lucky boolean := false;
  v_chests jsonb := '[]';
  v_gifts text[];
  v_streak int;
  v_records int;
begin
  select * into v_round from public.quiz_rounds
  where id = p_round and user_id = v_user for update;
  if v_round.id is null then
    raise exception 'no_round' using errcode = 'P0001';
  end if;
  if v_round.answered_at is not null then
    raise exception 'answered' using errcode = 'P0001';
  end if;
  v_player := public.quiz_time_window(v_user);

  v_elapsed := public.quiz_clock(v_round);
  v_t := least(1, greatest(0, v_elapsed - 400) / v_round.duration_ms);
  v_k := 1 - v_t * v_t * (3 - 2 * v_t);
  v_slot := case when v_k > 0.75 then 0 when v_k > 0.5 then 1 when v_k > 0.25 then 2 when v_k > 0 then 3 else -1 end;
  v_outcome := case
    -- -2: the page saw the veil run out (its clock has no grace)
    when p_choice = -2 or v_elapsed >= v_round.duration_ms + 400 or v_slot < 0 then 'time'
    when p_choice = v_round.answer_id then 'right'
    else 'wrong'
  end;

  if v_outcome = 'right' then
    v_gift := v_round.gifts[v_slot + 1];
    v_lucky := v_round.bonus_slot = v_slot;
    v_gifts := array[v_gift];
    v_streak := v_player.streak + 1;
    v_records := v_player.records;
    -- 5 in a row pays the chest (10 in the first migration): COMBO_AT
    if v_streak >= 5 then
      v_streak := 0;
      v_records := v_records + 1;
      v_chests := v_chests || jsonb_build_array(jsonb_build_object(
        'kind', 'combo',
        'gifts', to_jsonb(public.quiz_chest(3 + floor(random() * 3)::int, 1,
          '{"4": 8, "3": 92}', '{"4": 2, "3": 10, "2": 48, "1": 40}'))
      ));
      if v_records >= 10 then
        v_records := 0;
        v_chests := v_chests || jsonb_build_array(jsonb_build_object(
          'kind', 'special',
          'gifts', to_jsonb(public.quiz_chest(10, 3,
            '{"4": 50, "3": 50}', '{"4": 12, "3": 28, "2": 40, "1": 20}'))
        ));
      end if;
    end if;
    if v_round.chest_reward_version = 1 then
      insert into public.quiz_chest_shard_events(round_id,kind,user_id,entropy)
        select v_round.id, chest->>'kind', v_user, public.quiz_chest_entropy()
        from jsonb_array_elements(v_chests) chest
        on conflict(round_id,kind) do nothing;
    end if;
    insert into public.quiz_unopened_chests(round_id, kind, user_id, gifts, chest_reward_version)
      select v_round.id, chest->>'kind', v_user,
        array(select jsonb_array_elements_text(chest->'gifts')), v_round.chest_reward_version
      from jsonb_array_elements(v_chests) chest
      on conflict (round_id, kind) do nothing;
    v_gifts := v_gifts || array(
      select jsonb_array_elements_text(chest->'gifts') from jsonb_array_elements(v_chests) chest
    );
    insert into public.bag (user_id, item_id, count)
    select v_user, item, count(*) from unnest(v_gifts) item where item is not null group by item
    on conflict (user_id, item_id) do update set count = public.bag.count + excluded.count;

    update public.quiz_players set
      streak = v_streak,
      records = v_records,
      -- one chest of a streak at most per answer: one record more
      records_total = records_total + case when jsonb_array_length(v_chests) > 0 then 1 else 0 end,
      wins = wins + 1,
      window_gifts = (window_gifts || v_gift)[greatest(1, cardinality(window_gifts) + 1 - 11):],
      bonus = case when v_lucky and public.quiz_left(v_player) < 10 then bonus + 1 else bonus end
    where user_id = v_user
    returning * into v_player;
  else
    if v_outcome = 'wrong' then
      v_missed := v_round.gifts[v_slot + 1];
    end if;
    update public.quiz_players set streak = 0 where user_id = v_user returning * into v_player;
  end if;

  update public.quiz_rounds set
    answered_at = now(),
    choice = p_choice,
    outcome = v_outcome,
    slot = case when v_outcome = 'time' then null else v_slot end,
    won_item = v_gift
  where id = v_round.id;

  return jsonb_build_object(
    'outcome', v_outcome,
    'answer_id', v_round.answer_id,
    'slot', case when v_outcome = 'time' then null else v_slot end,
    'gift', v_gift,
    'lucky', v_lucky,
    'missed', v_missed,
    'chests', v_chests,
    'chest_reward_version', v_round.chest_reward_version,
    'streak', v_player.streak,
    'records', v_player.records,
    'records_total', v_player.records_total,
    'left', public.quiz_left(v_player),
    'refill_at', v_player.window_start + interval '3 hours',
    'wins', v_player.wins,
    'window_gifts', to_jsonb(v_player.window_gifts),
    'used', v_player.used,
    'bonus', v_player.bonus,
    'rerolls_left', greatest(0, 3 - v_player.rerolls),
    'time_left', 10 - v_player.time_used,
    'time_refill_at', v_player.time_start + interval '1 hours'
  );
end;
$$;

revoke execute on function public.quiz_unopened(uuid) from public, anon, authenticated;
revoke execute on function public.quiz_open_chests(uuid) from public, anon;
grant execute on function public.quiz_open_chests(uuid) to authenticated;
