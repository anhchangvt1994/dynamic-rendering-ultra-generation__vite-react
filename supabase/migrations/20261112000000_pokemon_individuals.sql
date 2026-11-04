-- A card traded for a Pokémon individual: its own id, personality, tint,
-- optional mark and potential, all fixed at birth from (id, version 1).
create table public.pokemon_individuals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pokemon_id smallint not null check (pokemon_id between 1 and 1025),
  nickname text check (nickname is null or char_length(nickname) between 1 and 16),
  personality smallint not null check (personality between 0 and 11),
  appearance jsonb not null,
  potential jsonb not null,
  created_at timestamptz not null default now()
);
create index pokemon_individuals_owner_species on public.pokemon_individuals (user_id, pokemon_id);
create table public.pokemon_card_trades (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  pokemon_id smallint not null check (pokemon_id between 1 and 1025),
  individual_id uuid not null,
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
alter table public.pokemon_individuals enable row level security;
alter table public.pokemon_card_trades enable row level security;
create policy "pokemon_individuals: read own" on public.pokemon_individuals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "pokemon_card_trades: read own" on public.pokemon_card_trades
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.pokemon_individuals, public.pokemon_card_trades from anon, authenticated;
grant select on public.pokemon_individuals, public.pokemon_card_trades to authenticated;

-- u32(label): first four bytes, big-endian, of sha256('<id>:<label>'). Modulo
-- bias is ignored. Mirrors src/pages/BagPage/individuals/traits.mjs; the golden
-- vectors in both test suites keep them identical.
create function public.pokemon_individual_u32(p_id uuid, p_label text)
returns bigint language sql immutable set search_path = '' as $$
  select ('x' || pg_catalog.encode(pg_catalog.substr(
    pg_catalog.sha256(pg_catalog.convert_to(p_id::text || ':' || p_label, 'UTF8')), 1, 4), 'hex'))::bit(32)::bigint
$$;

create function public.pokemon_individual_traits(p_id uuid, p_species smallint)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_hue integer;
  v_mark jsonb := null;
  v_offsets integer[] := '{}';
  v_sum integer;
  i integer;
begin
  v_hue := case when public.pokemon_individual_u32(p_id, 'hue-sign') % 2 = 0 then -1 else 1 end
    * (4 + (public.pokemon_individual_u32(p_id, 'hue-mag') % 7)::integer);
  if public.pokemon_individual_u32(p_id, 'mark') % 100 < 35 then
    v_mark := jsonb_build_object(
      'kind', (array['freckle','stripe','patch','scar','star'])[1 + (public.pokemon_individual_u32(p_id, 'mark-kind') % 5)::integer],
      'x', 30 + (public.pokemon_individual_u32(p_id, 'mark-x') % 41)::integer,
      'y', 30 + (public.pokemon_individual_u32(p_id, 'mark-y') % 41)::integer,
      'size', 12 + (public.pokemon_individual_u32(p_id, 'mark-size') % 13)::integer,
      'rot', (public.pokemon_individual_u32(p_id, 'mark-rot') % 360)::integer);
  end if;
  for i in 0..5 loop
    v_offsets := v_offsets || ((public.pokemon_individual_u32(p_id, 'p' || i) % 11)::integer - 5);
  end loop;
  select sum(o) into v_sum from unnest(v_offsets) o;
  return jsonb_build_object(
    'personality', (public.pokemon_individual_u32(p_id, 'personality') % 12)::integer,
    'appearance', jsonb_build_object('v', 1, 'hue', v_hue,
      'sat', (public.pokemon_individual_u32(p_id, 'sat') % 17)::integer - 8,
      'light', (public.pokemon_individual_u32(p_id, 'light') % 9)::integer - 4,
      'mark', v_mark),
    'potential', jsonb_build_object('v', 1, 'offsets', to_jsonb(v_offsets),
      'stars', 1 + ((v_sum + 30) * 5) / 61));
end;
$$;
revoke execute on function public.pokemon_individual_u32(uuid, text), public.pokemon_individual_traits(uuid, smallint) from public, anon, authenticated;

create function public.pokemon_trade_card(p_operation uuid, p_species smallint)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_prior public.pokemon_card_trades;
  v_cards integer;
  v_id uuid := gen_random_uuid();
  v_traits jsonb;
  v_receipt jsonb;
begin
  if p_operation is null then raise exception 'invalid_operation' using errcode = 'P0001'; end if;
  if p_species is null or p_species not between 1 and 1025 then
    raise exception 'invalid_species' using errcode = 'P0001';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':trade:' || p_operation::text, 0));
  select * into v_prior from public.pokemon_card_trades
    where user_id = v_user and operation_id = p_operation;
  if found then
    if v_prior.pokemon_id <> p_species then raise exception 'operation_conflict' using errcode = 'P0001'; end if;
    return v_prior.receipt;
  end if;
  select count into v_cards from public.pokemon_cards
    where user_id = v_user and pokemon_id = p_species for update;
  if v_cards is null then raise exception 'insufficient_cards' using errcode = 'P0001'; end if;
  v_cards := v_cards - 1;
  if v_cards = 0 then
    delete from public.pokemon_cards where user_id = v_user and pokemon_id = p_species;
  else
    update public.pokemon_cards set count = v_cards where user_id = v_user and pokemon_id = p_species;
  end if;
  v_traits := public.pokemon_individual_traits(v_id, p_species);
  insert into public.pokemon_individuals(id, user_id, pokemon_id, personality, appearance, potential)
    values (v_id, v_user, p_species, (v_traits->>'personality')::smallint, v_traits->'appearance', v_traits->'potential');
  v_receipt := jsonb_build_object('operationId', p_operation, 'speciesId', p_species,
    'individualId', v_id, 'cardCount', v_cards, 'traits', v_traits);
  insert into public.pokemon_card_trades(user_id, operation_id, pokemon_id, individual_id, receipt)
    values (v_user, p_operation, p_species, v_id, v_receipt);
  return v_receipt;
end;
$$;

-- Nickname: NFC, trimmed, spaces collapsed; empty clears; 1-16 characters of
-- letters, digits, space, - ' . only.
create function public.pokemon_name_individual(p_individual uuid, p_nickname text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_name text;
begin
  if p_individual is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  v_name := pg_catalog.btrim(pg_catalog.regexp_replace(normalize(coalesce(p_nickname, ''), NFC), '[[:space:]]+', ' ', 'g'));
  if v_name = '' then
    v_name := null;
  elsif pg_catalog.char_length(v_name) > 16 or v_name !~ '^([[:alnum:]]|[ ''.-])+$' then
    raise exception 'invalid_nickname' using errcode = 'P0001';
  end if;
  update public.pokemon_individuals set nickname = v_name
    where id = p_individual and user_id = v_user;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  return jsonb_build_object('individualId', p_individual, 'nickname', v_name);
end;
$$;
revoke execute on function public.pokemon_trade_card(uuid, smallint), public.pokemon_name_individual(uuid, text) from public, anon, authenticated;
grant execute on function public.pokemon_trade_card(uuid, smallint), public.pokemon_name_individual(uuid, text) to authenticated;
