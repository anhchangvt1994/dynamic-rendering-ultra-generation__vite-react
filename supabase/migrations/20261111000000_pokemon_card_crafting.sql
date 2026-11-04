-- Species cards are assets, not owned Pokémon individuals.
create table public.pokemon_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  pokemon_id smallint not null check (pokemon_id between 1 and 1025),
  count integer not null check (count > 0),
  primary key (user_id, pokemon_id)
);
create table public.pokemon_card_crafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  pokemon_id smallint not null check (pokemon_id between 1 and 1025),
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
alter table public.pokemon_cards enable row level security;
alter table public.pokemon_card_crafts enable row level security;
create policy "pokemon_cards: read own" on public.pokemon_cards
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "pokemon_card_crafts: read own" on public.pokemon_card_crafts
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.pokemon_cards, public.pokemon_card_crafts from anon, authenticated;
grant select on public.pokemon_cards, public.pokemon_card_crafts to authenticated;

create function public.pokemon_craft_card(p_operation uuid, p_species smallint)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_prior public.pokemon_card_crafts;
  v_meta jsonb;
  v_required integer;
  v_balance integer;
  v_cards integer;
  v_receipt jsonb;
begin
  if p_operation is null then raise exception 'invalid_operation' using errcode = 'P0001'; end if;
  if p_species is null or p_species not between 1 and 1025 then
    raise exception 'invalid_species' using errcode = 'P0001';
  end if;
  -- Lock even when no receipt exists yet; collisions only serialize extra work.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':' || p_operation::text, 0));
  select * into v_prior from public.pokemon_card_crafts
    where user_id = v_user and operation_id = p_operation;
  if found then
    if v_prior.pokemon_id <> p_species then raise exception 'operation_conflict' using errcode = 'P0001'; end if;
    return v_prior.receipt;
  end if;
  select metadata into v_meta from public.pokemon_shard_catalog where version = 1 and pokemon_id = p_species;
  if v_meta is null then raise exception 'missing_catalog' using errcode = 'P0001'; end if;
  select required into v_required from public.quiz_shard_rule(v_meta);
  select count into v_balance from public.pokemon_shards
    where user_id = v_user and pokemon_id = p_species for update;
  if v_balance is null or v_balance < v_required then
    raise exception 'insufficient_shards' using errcode = 'P0001';
  end if;
  v_balance := v_balance - v_required;
  if v_balance = 0 then
    delete from public.pokemon_shards where user_id = v_user and pokemon_id = p_species;
  else
    update public.pokemon_shards set count = v_balance where user_id = v_user and pokemon_id = p_species;
  end if;
  insert into public.pokemon_cards(user_id, pokemon_id, count) values (v_user, p_species, 1)
    on conflict (user_id, pokemon_id) do update set count = public.pokemon_cards.count + 1
    returning count into v_cards;
  v_receipt := jsonb_build_object('operationId', p_operation, 'speciesId', p_species,
    'spent', v_required, 'shardCount', v_balance, 'cardCount', v_cards);
  insert into public.pokemon_card_crafts(user_id, operation_id, pokemon_id, receipt)
    values (v_user, p_operation, p_species, v_receipt);
  return v_receipt;
end;
$$;
revoke execute on function public.pokemon_craft_card(uuid, smallint) from public, anon, authenticated;
grant execute on function public.pokemon_craft_card(uuid, smallint) to authenticated;
