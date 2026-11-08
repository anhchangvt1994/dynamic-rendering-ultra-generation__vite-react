-- Pokémon build, write side (2): the four move slots. Until the first change
-- the moves are derived (the latest level-up moves); the first change
-- materialises them (pokemon_growth.moves_custom) and later reads use the rows.

alter table public.pokemon_growth add column moves_custom boolean not null default false;

create table public.pokemon_moveset (
  individual_id uuid not null references public.pokemon_individuals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  slot smallint not null check (slot between 0 and 3),
  move text not null references public.pokemon_moves_ref (move),
  primary key (individual_id, slot),
  unique (individual_id, move)
);
create index pokemon_moveset_owner on public.pokemon_moveset (user_id);
alter table public.pokemon_moveset enable row level security;
create policy "read own moveset" on public.pokemon_moveset for select using (user_id = (select auth.uid()));
revoke all on public.pokemon_moveset from anon, authenticated;
grant select on public.pokemon_moveset to authenticated;

-- always four entries, null for an empty slot
create function public.pokemon_moves_of(p_individual uuid, p_species smallint, p_level integer, p_custom boolean)
returns text[] language sql stable security definer set search_path = '' as $$
  select array(
    select case when p_custom
      then (select m.move from public.pokemon_moveset m where m.individual_id = p_individual and m.slot = s)
      else (public.pokemon_default_moves(p_species, p_level))[s + 1] end
    from pg_catalog.generate_series(0, 3) s order by s)
$$;

do $$
declare
  v_old text := $old$'moves', to_jsonb(public.pokemon_default_moves(i.pokemon_id, v_level))$old$;
  v_def text := pg_get_functiondef('public.pokemon_build(uuid)'::regprocedure);
begin
  if position(v_old in v_def) = 0 then raise exception 'pokemon_build changed shape'; end if;
  execute replace(v_def, v_old, $new$'moves', to_jsonb(public.pokemon_moves_of(i.id, i.pokemon_id, v_level, coalesce(g.moves_custom, false)))$new$);
end $$;

create function public.pokemon_set_move(p_operation uuid, p_individual uuid, p_slot smallint, p_move text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.quiz_user();
  v_replay jsonb := public.pokemon_build_begin(p_operation, p_individual, 'move', p_move, p_slot);
  g public.pokemon_growth;
  v_species smallint;
  v_level integer;
  v_affection integer;
  v_known boolean;
  v_ok boolean;
  v_result jsonb;
begin
  if v_replay is not null then return v_replay; end if;
  if p_slot is null or p_slot not between 0 and 3 then raise exception 'invalid_slot' using errcode = 'P0001'; end if;
  select * into g from public.pokemon_growth where individual_id = p_individual for update;
  select pokemon_id into v_species from public.pokemon_individuals where id = p_individual;
  v_level := (public.pokemon_build(p_individual) ->> 'level')::integer;

  if not g.moves_custom then
    insert into public.pokemon_moveset (individual_id, user_id, slot, move)
      select p_individual, v_user, (o - 1)::smallint, m
        from pg_catalog.unnest(public.pokemon_default_moves(v_species, v_level)) with ordinality t(m, o);
    update public.pokemon_growth set moves_custom = true where individual_id = p_individual;
  end if;

  if p_move is null then
    delete from public.pokemon_moveset where individual_id = p_individual and slot = p_slot;
  else
    select coalesce(max(affection), 0) into v_affection from public.pokemon_care where individual_id = p_individual;
    select count(*) > 0, coalesce(bool_or(
        (l.method = 'level-up' and l.level <= v_level)
        or (l.method = 'machine' and exists (
              select 1 from public.pokemon_machines pm join public.bag b on b.item_id = pm.item_id
               where pm.move = p_move and b.user_id = v_user))
        or (l.method in ('egg', 'tutor') and v_affection >= 150)), false)
      into v_known, v_ok
      from public.pokemon_learnset l where l.species = v_species and l.move = p_move;
    if v_known is not true then raise exception 'not_learnable' using errcode = 'P0001'; end if;
    if not v_ok then raise exception 'locked' using errcode = 'P0001'; end if;
    if exists (select 1 from public.pokemon_moveset where individual_id = p_individual and move = p_move and slot <> p_slot) then
      raise exception 'duplicate' using errcode = 'P0001';
    end if;
    delete from public.pokemon_moveset where individual_id = p_individual and slot = p_slot;
    insert into public.pokemon_moveset (individual_id, user_id, slot, move) values (p_individual, v_user, p_slot, p_move);
  end if;

  v_result := public.pokemon_build(p_individual);
  insert into public.pokemon_build_ops (user_id, operation_id, individual_id, kind, item, stat, result)
    values (v_user, p_operation, p_individual, 'move', p_move, p_slot, v_result);
  return v_result;
end;
$$;

revoke execute on function public.pokemon_moves_of(uuid, smallint, integer, boolean) from public, anon, authenticated;
revoke execute on function public.pokemon_set_move(uuid, uuid, smallint, text) from public, anon;
grant execute on function public.pokemon_set_move(uuid, uuid, smallint, text) to authenticated;
