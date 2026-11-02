-- Batch cooking (docs/superpowers/specs/2026-11-02-kitchen-batch-cook-design.md):
-- a menu dish cooks 1 to 99 portions in one call, all of them or none.
-- Without p_times it cooks one, as before. The old signature goes, so the
-- API resolves a single kitchen_cook.

drop function public.kitchen_cook(text, text[]);

create function public.kitchen_cook(p_dish text, p_ingredients text[], p_times int default 1)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_recipe public.kitchen_recipes;
  v_pot text[];
  v_back text[];
  v_discovered boolean := false;
  v_near int;
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

  v_back := v_pot[1:ceil(cardinality(v_pot) / 2.0)::int];
  insert into public.bag (user_id, item_id, count)
  select v_user, i, count(*) from unnest(v_back) i group by i
  on conflict (user_id, item_id) do update set count = public.bag.count + excluded.count;
  insert into public.kitchen_attempts (user_id, ingredients) values (v_user, v_pot)
  on conflict (user_id, ingredients) do update set tried_at = now();
  select coalesce(max(public.kitchen_overlap(v_pot, r.ingredients)), 0) into v_near
  from public.kitchen_recipes r
  where r.secret and not exists (
    select 1 from public.kitchen_discoveries d where d.user_id = v_user and d.dish_id = r.dish_id
  );
  return jsonb_build_object('outcome', 'failed', 'returned', to_jsonb(v_back), 'near', v_near);
end;
$$;

revoke execute on function public.kitchen_cook(text, text[], int)
from public, anon, authenticated;
grant execute on function public.kitchen_cook(text, text[], int) to authenticated;
