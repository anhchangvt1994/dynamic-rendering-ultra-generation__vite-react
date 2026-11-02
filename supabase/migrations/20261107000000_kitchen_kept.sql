-- The right ingredients kept (docs/superpowers/specs/2026-11-03-kitchen-kept-design.md):
-- a failed pot costs nothing (all of it back), names the unfound secret it
-- shares the most with (closest), and each unfound secret's clue lists its
-- right ingredients found so far over every attempt (kept). Same
-- signatures: replaced in place.

create or replace function public.kitchen_cook(p_dish text, p_ingredients text[], p_times int default 1)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_recipe public.kitchen_recipes;
  v_pot text[];
  v_discovered boolean := false;
  v_near int;
  v_closest text;
begin
  -- one cook at a time per player (double taps, two tabs)
  perform pg_advisory_xact_lock(hashtext('kitchen:' || v_user::text));
  -- a batch: 1 to 99 portions, of a menu dish only (the pot discovers)
  if p_times is null or p_times not between 1 and 99
    or (p_times > 1 and p_dish is null) then
    raise exception 'bad_times' using errcode = 'P0001';
  end if;
  if p_dish is not null then
    select r.* into v_recipe from public.kitchen_recipes r
    where r.dish_id = p_dish and (not r.secret or exists (
      select 1 from public.kitchen_discoveries d where d.user_id = v_user and d.dish_id = r.dish_id
    ));
    if v_recipe.dish_id is null then
      raise exception 'unknown_dish' using errcode = 'P0001';
    end if;
    v_pot := v_recipe.ingredients;
  else
    v_pot := array(select i from unnest(p_ingredients) i order by i collate "C");
  end if;
  if coalesce(cardinality(v_pot), 0) not between 2 and 4 then
    raise exception 'bad_pot' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(v_pot) i
    where not exists (select 1 from public.kitchen_ingredients k where k.item_id = i)
  ) then
    raise exception 'not_food' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from (select i, count(*) * p_times n from unnest(v_pot) i group by i) need
    left join public.bag b on b.user_id = v_user and b.item_id = need.i
    where coalesce(b.count, 0) < need.n
  ) then
    raise exception 'missing' using errcode = 'P0001';
  end if;

  -- the pot goes in, once per portion
  delete from public.bag b using (select i, count(*) * p_times n from unnest(v_pot) i group by i) need
  where b.user_id = v_user and b.item_id = need.i and b.count = need.n;
  update public.bag b set count = b.count - need.n
  from (select i, count(*) * p_times n from unnest(v_pot) i group by i) need
  where b.user_id = v_user and b.item_id = need.i;

  if v_recipe.dish_id is null then
    select * into v_recipe from public.kitchen_recipes where ingredients = v_pot;
  end if;

  if v_recipe.dish_id is not null then
    insert into public.kitchen_dishes (user_id, dish_id, count) values (v_user, v_recipe.dish_id, p_times)
    on conflict (user_id, dish_id) do update set count = public.kitchen_dishes.count + p_times;
    if v_recipe.secret then
      insert into public.kitchen_discoveries (user_id, dish_id) values (v_user, v_recipe.dish_id)
      on conflict do nothing;
      v_discovered := found;
    end if;
    return jsonb_build_object('outcome', 'dish', 'dish', public.kitchen_dish(v_recipe), 'discovered', v_discovered, 'count', p_times);
  end if;

  -- a failure costs nothing: all of it back
  insert into public.bag (user_id, item_id, count)
  select v_user, i, count(*) from unnest(v_pot) i group by i
  on conflict (user_id, item_id) do update set count = public.bag.count + excluded.count;
  insert into public.kitchen_attempts (user_id, ingredients) values (v_user, v_pot)
  on conflict (user_id, ingredients) do update set tried_at = now();
  -- the unfound secret sharing the most, in the menu's order on a tie
  select r.dish_id, public.kitchen_overlap(v_pot, r.ingredients) into v_closest, v_near
  from public.kitchen_recipes r
  where r.secret and public.kitchen_overlap(v_pot, r.ingredients) > 0 and not exists (
    select 1 from public.kitchen_discoveries d where d.user_id = v_user and d.dish_id = r.dish_id
  )
  order by public.kitchen_overlap(v_pot, r.ingredients) desc, r.rarity, r.dish_id
  limit 1;
  return jsonb_build_object('outcome', 'failed', 'returned', to_jsonb(v_pot),
    'near', coalesce(v_near, 0), 'closest', v_closest);
end;
$$;

create or replace function public.kitchen_menu()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
begin
  return jsonb_build_object(
    'dishes', (
      select jsonb_agg(
        case when not r.secret or d.dish_id is not null then public.kitchen_dish(r)
        else jsonb_build_object(
          'id', r.dish_id,
          'kind', r.kind,
          'secret', true,
          'known', false,
          'rarity', r.rarity,
          'count', cardinality(r.ingredients),
          'groups', (
            select jsonb_object_agg(g.grp, g.n) from (
              select k.grp, count(*) n from unnest(r.ingredients) i
              join public.kitchen_ingredients k on k.item_id = i group by k.grp
            ) g
          ),
          'top', to_jsonb(r.top),
          -- each flavour's sum in 3 levels, capped at 40 (kitchen.mjs shapeOf)
          'shape', (
            select jsonb_build_object(
              'spicy', least(2, floor(least(sum(k.spicy), 40) * 3 / 40.0))::int,
              'dry', least(2, floor(least(sum(k.dry), 40) * 3 / 40.0))::int,
              'sweet', least(2, floor(least(sum(k.sweet), 40) * 3 / 40.0))::int,
              'bitter', least(2, floor(least(sum(k.bitter), 40) * 3 / 40.0))::int,
              'sour', least(2, floor(least(sum(k.sour), 40) * 3 / 40.0))::int
            )
            from unnest(r.ingredients) i
            join public.kitchen_ingredients k on k.item_id = i
          ),
          -- its right ingredients found so far: each as many as one attempt
          -- held at most, never more than the recipe (rules.mjs keptOf)
          'kept', coalesce((
            select jsonb_agg(x.i order by x.i collate "C")
            from (
              select need.i, generate_series(1, least(need.n, coalesce((
                select max((select count(*) from unnest(a.ingredients) j where j = need.i))
                from public.kitchen_attempts a where a.user_id = v_user
              ), 0)::int))
              from (select i, count(*)::int n from unnest(r.ingredients) i group by i) need
            ) x(i, g)
          ), '[]')
        ) end
        order by r.secret, r.rarity, r.dish_id
      )
      from public.kitchen_recipes r
      left join public.kitchen_discoveries d on d.dish_id = r.dish_id and d.user_id = v_user
    ),
    'found', (select count(*) from public.kitchen_discoveries where user_id = v_user),
    'attempts', coalesce((
      select jsonb_agg(to_jsonb(a.ingredients) order by a.tried_at)
      from public.kitchen_attempts a where a.user_id = v_user
    ), '[]')
  );
end;
$$;
