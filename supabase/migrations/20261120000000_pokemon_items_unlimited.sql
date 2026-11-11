-- Items no longer have a use limit per individual (was 3). The Gold Bottle Cap
-- stays a single use per Pokémon (all IVs end at 31, so it is refused as
-- iv_maxed afterwards) and is not counted in item_uses.

alter table public.pokemon_growth drop constraint if exists pokemon_growth_item_uses_check;
alter table public.pokemon_growth alter column item_uses type integer;

create or replace function public.pokemon_use_item(p_operation uuid, p_individual uuid, p_item text, p_stat smallint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_replay jsonb := public.pokemon_build_begin(p_operation, p_individual, 'item', p_item, p_stat);
  g public.pokemon_growth;
  v_count integer;
  v_build jsonb;
  v_result jsonb;
begin
  if v_replay is not null then return v_replay; end if;
  select * into g from public.pokemon_growth where individual_id = p_individual for update;
  select count into v_count from public.bag where user_id = v_user and item_id = p_item for update;
  if not found then raise exception 'no_item' using errcode = 'P0001'; end if;

  if p_item = 'bottle-cap' then
    if p_stat is null or p_stat not between 0 and 5 then raise exception 'invalid_stat' using errcode = 'P0001'; end if;
    if g.iv[p_stat + 1] >= 31 then raise exception 'iv_maxed' using errcode = 'P0001'; end if;
    g.iv[p_stat + 1] := 31;
  elsif p_item = 'gold-bottle-cap' then
    if g.iv = array[31, 31, 31, 31, 31, 31]::smallint[] then raise exception 'iv_maxed' using errcode = 'P0001'; end if;
    -- one use per Pokémon (it leaves every IV at 31, so a second use is iv_maxed) and not counted
    g.iv := array[31, 31, 31, 31, 31, 31]::smallint[];
  elsif p_item = 'rare-candy' then
    v_build := public.pokemon_build(p_individual);
    if (v_build ->> 'capped')::boolean then raise exception 'level_capped' using errcode = 'P0001'; end if;
    g.bonus_exp := g.bonus_exp + ((v_build ->> 'expNext')::integer - (v_build ->> 'exp')::integer);
  else
    raise exception 'invalid_item' using errcode = 'P0001';
  end if;

  if v_count = 1 then
    delete from public.bag where user_id = v_user and item_id = p_item;
  else
    update public.bag set count = count - 1 where user_id = v_user and item_id = p_item;
  end if;
  update public.pokemon_growth set iv = g.iv, bonus_exp = g.bonus_exp, item_uses = g.item_uses + case when p_item = 'gold-bottle-cap' then 0 else 1 end
    where individual_id = p_individual;
  v_result := public.pokemon_build(p_individual);
  insert into public.pokemon_build_ops (user_id, operation_id, individual_id, kind, item, stat, result)
    values (v_user, p_operation, p_individual, 'item', p_item, p_stat, v_result);
  return v_result;
end;
$$;

revoke execute on function public.pokemon_use_item(uuid, uuid, text, smallint) from public, anon;
grant execute on function public.pokemon_use_item(uuid, uuid, text, smallint) to authenticated;
