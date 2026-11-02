-- The Pokémon Kitchen (docs/superpowers/specs/2026-11-02-kitchen-design.md)
-- The bag's berries, drinks and sweets cooked into dishes that give only
-- positive stats. 12 recipes are known; 8 secret ones are found in the pot,
-- and their recipe, name and stats never leave the database before that.
-- The seed is the code's (src/pages/QuizPage/items.mjs FLAVORS,
-- src/pages/KitchenPage/recipes.mjs DISHES): recipes.test.mjs checks.

-- what each ingredient tastes of (potencies in tens) and its group
create table public.kitchen_ingredients (
  item_id text primary key references public.quiz_items (id),
  grp text not null check (grp in ('berry', 'drink', 'sweet')),
  spicy smallint not null default 0,
  dry smallint not null default 0,
  sweet smallint not null default 0,
  bitter smallint not null default 0,
  sour smallint not null default 0
);

-- the dishes; ingredients sorted ("C" order): a recipe is a multiset
create table public.kitchen_recipes (
  dish_id text primary key,
  name text not null,
  kind text not null,
  secret boolean not null,
  rarity smallint not null,
  ingredients text[] not null unique check (cardinality(ingredients) between 2 and 4),
  stats jsonb not null,
  -- its 2 strongest stats (the secret dishes' clue)
  top text[] not null
);

-- the player's cooked dishes, the secrets they found, the pots that failed
create table public.kitchen_dishes (
  user_id uuid not null references auth.users (id) on delete cascade,
  dish_id text not null references public.kitchen_recipes (dish_id),
  count integer not null check (count > 0),
  primary key (user_id, dish_id)
);
create table public.kitchen_discoveries (
  user_id uuid not null references auth.users (id) on delete cascade,
  dish_id text not null references public.kitchen_recipes (dish_id),
  found_at timestamptz not null default now(),
  primary key (user_id, dish_id)
);
create table public.kitchen_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  ingredients text[] not null,
  tried_at timestamptz not null default now(),
  primary key (user_id, ingredients)
);

alter table public.kitchen_ingredients enable row level security;
alter table public.kitchen_recipes enable row level security;
alter table public.kitchen_dishes enable row level security;
alter table public.kitchen_discoveries enable row level security;
alter table public.kitchen_attempts enable row level security;

-- flavours are no secret; the recipes, discoveries and attempts are the
-- functions' only
create policy "kitchen_ingredients: read" on public.kitchen_ingredients
  for select using (true);
create policy "kitchen_dishes: read own" on public.kitchen_dishes
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.kitchen_recipes, public.kitchen_discoveries, public.kitchen_attempts
  from anon, authenticated;
revoke all on public.kitchen_ingredients, public.kitchen_dishes from anon, authenticated;
-- tables get no default privileges here (as the quiz's): reading is granted
grant select on public.kitchen_ingredients to anon, authenticated;
grant select on public.kitchen_dishes to authenticated;

insert into public.kitchen_ingredients (item_id, grp, spicy, dry, sweet, bitter, sour) values
  ('pomeg-berry', 'berry', 10, 0, 10, 10, 0),
  ('kelpsy-berry', 'berry', 0, 10, 0, 10, 10),
  ('qualot-berry', 'berry', 10, 0, 10, 0, 10),
  ('hondew-berry', 'berry', 10, 10, 0, 10, 0),
  ('grepa-berry', 'berry', 0, 10, 10, 0, 10),
  ('tamato-berry', 'berry', 20, 10, 0, 0, 0),
  ('sitrus-berry', 'berry', 0, 10, 10, 10, 10),
  ('lum-berry', 'berry', 10, 10, 10, 10, 0),
  ('leppa-berry', 'berry', 10, 0, 10, 10, 10),
  ('moomoo-milk', 'drink', 0, 0, 10, 0, 0),
  ('rage-candy-bar', 'sweet', 20, 0, 10, 0, 0),
  ('big-malasada', 'sweet', 0, 0, 20, 0, 0),
  ('lava-cookie', 'sweet', 20, 0, 0, 0, 0),
  ('old-gateau', 'sweet', 0, 0, 10, 20, 0),
  ('casteliacone', 'sweet', 0, 10, 10, 0, 0),
  ('lumiose-galette', 'sweet', 0, 20, 0, 0, 0),
  ('shalour-sable', 'sweet', 0, 0, 10, 0, 10),
  ('pewter-crunchies', 'sweet', 0, 10, 0, 10, 0),
  ('lemonade', 'drink', 0, 0, 10, 0, 20),
  ('soda-pop', 'drink', 10, 0, 10, 0, 0),
  ('fresh-water', 'drink', 0, 0, 0, 0, 0),
  ('oran-berry', 'berry', 10, 10, 0, 10, 10),
  ('cheri-berry', 'berry', 10, 0, 0, 0, 0),
  ('chesto-berry', 'berry', 0, 10, 0, 0, 0),
  ('pecha-berry', 'berry', 0, 0, 10, 0, 0),
  ('rawst-berry', 'berry', 0, 0, 0, 10, 0),
  ('aspear-berry', 'berry', 0, 0, 0, 0, 10);

insert into public.kitchen_recipes (dish_id, name, kind, secret, rarity, ingredients, stats, top) values
  ('poffin-pecha', 'Poffin Pecha', 'poffin', false, 1, array['moomoo-milk', 'pecha-berry', 'pecha-berry'], '{"happiness":3,"friendship":3}', array['happiness']),
  ('poffin-cheri', 'Poffin Cheri', 'poffin', false, 2, array['cheri-berry', 'cheri-berry', 'lava-cookie'], '{"power":4,"friendship":3}', array['power']),
  ('tra-da-chesto', 'Trà đá Chesto', 'smoothie', false, 1, array['chesto-berry', 'chesto-berry', 'fresh-water'], '{"beauty":2,"friendship":3}', array['beauty']),
  ('nuoc-chanh-aspear', 'Nước chanh Aspear', 'smoothie', false, 1, array['aspear-berry', 'lemonade'], '{"agility":3,"happiness":1,"friendship":2}', array['agility', 'happiness']),
  ('sup-rawst', 'Súp Rawst', 'soup', false, 1, array['fresh-water', 'oran-berry', 'rawst-berry', 'rawst-berry'], '{"wisdom":3,"beauty":1,"agility":1,"friendship":4}', array['wisdom', 'beauty']),
  ('sinh-to-cau-vong', 'Sinh tố cầu vồng', 'smoothie', false, 1, array['cheri-berry', 'oran-berry', 'pecha-berry', 'soda-pop'], '{"power":3,"happiness":2,"wisdom":1,"friendship":4}', array['power', 'happiness']),
  ('banh-kem-sitrus', 'Bánh kem Sitrus', 'cake', false, 2, array['casteliacone', 'moomoo-milk', 'sitrus-berry'], '{"happiness":3,"beauty":2,"wisdom":1,"friendship":3}', array['happiness', 'beauty']),
  ('keo-deo-leppa', 'Kẹo dẻo Leppa', 'jelly', false, 1, array['leppa-berry', 'soda-pop'], '{"power":2,"happiness":2,"wisdom":1,"friendship":2}', array['power', 'happiness']),
  ('banh-mi-lum', 'Bánh mì kẹp Lum', 'sandwich', false, 2, array['big-malasada', 'cheri-berry', 'lum-berry'], '{"happiness":3,"power":2,"wisdom":1,"friendship":3}', array['happiness', 'power']),
  ('ca-ri-lua', 'Cà ri lửa', 'curry', false, 2, array['cheri-berry', 'lava-cookie', 'rage-candy-bar'], '{"power":5,"happiness":1,"friendship":3}', array['power', 'happiness']),
  ('pudding-lumiose', 'Pudding Lumiose', 'pudding', false, 2, array['chesto-berry', 'lumiose-galette', 'moomoo-milk'], '{"beauty":3,"happiness":1,"friendship":3}', array['beauty', 'happiness']),
  ('banh-quy-pewter', 'Bánh quy Pewter', 'sandwich', false, 2, array['oran-berry', 'pewter-crunchies', 'rawst-berry'], '{"wisdom":3,"beauty":2,"agility":1,"friendship":3}', array['wisdom', 'beauty']),
  ('bi-an-1', 'Poffin Hoàng gia', 'poffin', true, 3, array['moomoo-milk', 'pecha-berry', 'pomeg-berry'], '{"happiness":5,"wisdom":2,"power":2,"friendship":5}', array['happiness', 'wisdom']),
  ('bi-an-2', 'Thạch biển Kelpsy', 'jelly', true, 3, array['aspear-berry', 'fresh-water', 'kelpsy-berry'], '{"agility":3,"wisdom":2,"beauty":2,"friendship":5}', array['agility', 'wisdom']),
  ('bi-an-3', 'Bánh kem Qualot', 'cake', true, 3, array['big-malasada', 'qualot-berry', 'shalour-sable'], '{"happiness":6,"agility":3,"power":2,"friendship":5}', array['happiness', 'agility']),
  ('bi-an-4', 'Cà ri Hondew', 'curry', true, 3, array['hondew-berry', 'lava-cookie', 'rawst-berry'], '{"power":5,"wisdom":3,"beauty":2,"friendship":5}', array['power', 'wisdom']),
  ('bi-an-5', 'Sinh tố Grepa', 'smoothie', true, 3, array['casteliacone', 'grepa-berry', 'lemonade'], '{"agility":5,"happiness":5,"beauty":3,"friendship":5}', array['agility', 'happiness']),
  ('bi-an-6', 'Súp lửa Tamato', 'soup', true, 3, array['cheri-berry', 'cheri-berry', 'tamato-berry'], '{"power":6,"beauty":2,"friendship":5}', array['power', 'beauty']),
  ('bi-an-7', 'Pudding cổ điển', 'pudding', true, 3, array['moomoo-milk', 'old-gateau', 'pomeg-berry'], '{"wisdom":5,"happiness":5,"power":2,"friendship":5}', array['wisdom', 'happiness']),
  ('bi-an-8', 'Đại tiệc cầu vồng', 'cake', true, 4, array['hondew-berry', 'kelpsy-berry', 'pomeg-berry', 'qualot-berry'], '{"wisdom":5,"power":5,"beauty":3,"friendship":6}', array['wisdom', 'power']);

-- how many ingredients two pots share, as multisets
create function public.kitchen_overlap(p_a text[], p_b text[])
returns int
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum(least(a.n, b.n)), 0)::int
  from (select i, count(*) n from unnest(p_a) i group by i) a
  join (select i, count(*) n from unnest(p_b) i group by i) b using (i)
$$;

-- a dish as the page shows it once known
create function public.kitchen_dish(p_recipe public.kitchen_recipes)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_recipe.dish_id,
    'name', p_recipe.name,
    'kind', p_recipe.kind,
    'secret', p_recipe.secret,
    'known', true,
    'rarity', p_recipe.rarity,
    'ingredients', to_jsonb(p_recipe.ingredients),
    'stats', p_recipe.stats,
    'top', to_jsonb(p_recipe.top)
  )
$$;

-- the menu: known dishes and found secrets in full; the other secrets as a
-- clue (kind, count, groups, 2 strongest stats); the pots that failed
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
          'top', to_jsonb(r.top)
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

-- cook: a dish of the menu (p_dish) or a pot of 2 to 4 ingredients. A match
-- spends them and gives the dish (a secret one is found); no match gives
-- half of the pot back (rounded up, the first ones sorted), keeps the
-- attempt, and tells how many of its ingredients one secret recipe shares
create function public.kitchen_cook(p_dish text, p_ingredients text[])
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
    select 1 from (select i, count(*) n from unnest(v_pot) i group by i) need
    left join public.bag b on b.user_id = v_user and b.item_id = need.i
    where coalesce(b.count, 0) < need.n
  ) then
    raise exception 'missing' using errcode = 'P0001';
  end if;

  -- the pot goes in
  delete from public.bag b using (select i, count(*) n from unnest(v_pot) i group by i) need
  where b.user_id = v_user and b.item_id = need.i and b.count = need.n;
  update public.bag b set count = b.count - need.n
  from (select i, count(*) n from unnest(v_pot) i group by i) need
  where b.user_id = v_user and b.item_id = need.i;

  if v_recipe.dish_id is null then
    select * into v_recipe from public.kitchen_recipes where ingredients = v_pot;
  end if;

  if v_recipe.dish_id is not null then
    insert into public.kitchen_dishes (user_id, dish_id, count) values (v_user, v_recipe.dish_id, 1)
    on conflict (user_id, dish_id) do update set count = public.kitchen_dishes.count + 1;
    if v_recipe.secret then
      insert into public.kitchen_discoveries (user_id, dish_id) values (v_user, v_recipe.dish_id)
      on conflict do nothing;
      v_discovered := found;
    end if;
    return jsonb_build_object('outcome', 'dish', 'dish', public.kitchen_dish(v_recipe), 'discovered', v_discovered);
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

revoke execute on function
  public.kitchen_overlap(text[], text[]),
  public.kitchen_dish(public.kitchen_recipes),
  public.kitchen_menu(),
  public.kitchen_cook(text, text[])
from public, anon, authenticated;
grant execute on function public.kitchen_menu(), public.kitchen_cook(text, text[]) to authenticated;
