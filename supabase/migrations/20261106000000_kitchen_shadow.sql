-- The secret dishes' flavour shadow
-- (docs/superpowers/specs/2026-11-02-kitchen-flavor-shadow-design.md): a
-- clue adds each flavour's level (0 to 2), never the recipe itself.

drop function public.kitchen_menu();

create function public.kitchen_menu()
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
          )
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

revoke execute on function public.kitchen_menu() from public, anon, authenticated;
grant execute on function public.kitchen_menu() to authenticated;
