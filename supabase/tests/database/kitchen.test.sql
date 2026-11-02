-- The Pokémon Kitchen: yarn db:test
-- The bag is filled here as postgres (security definer helpers); every cook
-- goes through the functions as a user.
begin;
select plan(33);

insert into auth.users (id, email, aud, role)
values ('11111111-1111-1111-1111-111111111111', 'ash@example.com', 'authenticated', 'authenticated');

create temp table r (k text primary key, v jsonb);
grant all on r to authenticated, anon;

create function pg_temp.give(item text, n int) returns void
language sql security definer as $$
  insert into public.bag (user_id, item_id, count)
  values ('11111111-1111-1111-1111-111111111111', item, n)
  on conflict (user_id, item_id) do update set count = public.bag.count + excluded.count
$$;
create function pg_temp.has(item text) returns int
language sql security definer as $$
  select coalesce((select count from public.bag
    where user_id = '11111111-1111-1111-1111-111111111111' and item_id = item), 0)
$$;
create function pg_temp.dish_count(dish text) returns int
language sql security definer as $$
  select coalesce((select count from public.kitchen_dishes
    where user_id = '11111111-1111-1111-1111-111111111111' and dish_id = dish), 0)
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- the menu
insert into r values ('menu', public.kitchen_menu());
select is((select jsonb_array_length(v->'dishes') from r where k = 'menu'), 20, '20 dishes on the menu');
select is(
  (select d.e->'ingredients' from r, jsonb_array_elements(r.v->'dishes') d(e) where k = 'menu' and d.e->>'id' = 'poffin-pecha'),
  '["moomoo-milk", "pecha-berry", "pecha-berry"]'::jsonb,
  'a known dish shows its recipe'
);
select ok(
  (select bool_and(not (d.e ? 'ingredients') and not (d.e ? 'name') and not (d.e ? 'stats'))
   from r, jsonb_array_elements(r.v->'dishes') d(e) where k = 'menu' and (d.e->>'secret')::boolean),
  'a secret dish shows no recipe, no name, no stats'
);
select is(
  (select d.e - 'id' from r, jsonb_array_elements(r.v->'dishes') d(e) where k = 'menu' and d.e->>'id' = 'bi-an-3'),
  '{"kind": "cake", "secret": true, "known": false, "rarity": 3, "count": 3, "groups": {"berry": 1, "sweet": 2}, "top": ["happiness", "agility"]}'::jsonb,
  'a secret dish shows its kind, its count, its groups and its 2 strongest stats'
);
select is((select v->'found' from r where k = 'menu'), '0'::jsonb, 'nothing found yet');

-- a known dish from the menu
select throws_ok($$ select public.kitchen_cook('poffin-pecha', null) $$, 'P0001', 'missing', 'no ingredients: nothing to cook');
select pg_temp.give('pecha-berry', 3);
select pg_temp.give('moomoo-milk', 2);
insert into r values ('pecha', public.kitchen_cook('poffin-pecha', null));
select is((select v->>'outcome' from r where k = 'pecha'), 'dish', 'a known dish is cooked');
select is((select v->'dish'->>'name' from r where k = 'pecha'), 'Poffin Pecha', 'the dish comes with its name');
select is(pg_temp.has('pecha-berry') || '/' || pg_temp.has('moomoo-milk'), '1/1', 'its ingredients are spent');
select is(pg_temp.dish_count('poffin-pecha'), 1, 'the dish is in the kitchen''s shelf');
select throws_ok($$ select public.kitchen_cook('poffin-pecha', null) $$, 'P0001', 'missing', 'one Pecha left: not enough');
select throws_ok($$ select public.kitchen_cook('bi-an-1', null) $$, 'P0001', 'unknown_dish', 'a secret dish can not be cooked from the menu before it is found');
select throws_ok($$ select public.kitchen_cook('nope', null) $$, 'P0001', 'unknown_dish', 'no such dish');

-- the pot
select throws_ok($$ select public.kitchen_cook(null, array['pecha-berry']) $$, 'P0001', 'bad_pot', 'one ingredient is no pot');
select throws_ok($$ select public.kitchen_cook(null, array['oran-berry', 'oran-berry', 'oran-berry', 'oran-berry', 'oran-berry']) $$, 'P0001', 'bad_pot', 'five is too many');
select pg_temp.give('fire-stone', 1);
select throws_ok($$ select public.kitchen_cook(null, array['fire-stone', 'pecha-berry']) $$, 'P0001', 'not_food', 'a stone is no food');

-- a failure: half back (rounded up), the attempt kept, how near a secret
select pg_temp.give('pomeg-berry', 2);
select pg_temp.give('aspear-berry', 1);
select pg_temp.give('pecha-berry', 1);
insert into r values ('fail', public.kitchen_cook(null, array['pomeg-berry', 'aspear-berry', 'pecha-berry']));
select is((select v->>'outcome' from r where k = 'fail'), 'failed', 'no recipe: it fails');
select is((select v->'returned' from r where k = 'fail'), '["aspear-berry", "pecha-berry"]'::jsonb, 'half comes back (2 of 3), the first ones sorted');
select is(pg_temp.has('aspear-berry') || '/' || pg_temp.has('pecha-berry') || '/' || pg_temp.has('pomeg-berry'), '1/2/1', 'the bag keeps what came back');
select is((select (v->>'near')::int from r where k = 'fail'), 2, '2 of them are in a secret recipe (Poffin Hoàng gia)');
select ok((select not (v ? 'dish') from r where k = 'fail'), 'a failure names no dish');
select is(
  (select v->'attempts' from (select public.kitchen_menu() v) m),
  '[["aspear-berry", "pecha-berry", "pomeg-berry"]]'::jsonb,
  'the menu lists the failed pot'
);

-- a secret found in the pot, in any order
insert into r values ('found', public.kitchen_cook(null, array['moomoo-milk', 'pomeg-berry', 'pecha-berry']));
select is((select v->>'outcome' || '/' || (v->>'discovered') from r where k = 'found'), 'dish/true', 'a secret dish is found');
select is((select v->'dish'->>'id' from r where k = 'found'), 'bi-an-1', 'the right one');
insert into r values ('menu2', public.kitchen_menu());
select ok(
  (select d.e ? 'ingredients' and d.e ? 'name' and (d.e->>'known')::boolean
   from r, jsonb_array_elements(r.v->'dishes') d(e) where k = 'menu2' and d.e->>'id' = 'bi-an-1'),
  'once found, the menu shows its recipe'
);
select is((select v->'found' from r where k = 'menu2'), '1'::jsonb, 'one found');

-- near ignores what was found already: Poffin Hoàng gia no longer counts
select pg_temp.give('pomeg-berry', 1);
select pg_temp.give('pecha-berry', 1);
select pg_temp.give('aspear-berry', 1);
insert into r values ('fail2', public.kitchen_cook(null, array['pomeg-berry', 'pecha-berry', 'aspear-berry']));
select is((select (v->>'near')::int from r where k = 'fail2'), 1, 'a found secret no longer counts as near');

-- a known recipe in the pot is a dish, not a discovery
select pg_temp.give('cheri-berry', 2);
select pg_temp.give('lava-cookie', 1);
insert into r values ('known', public.kitchen_cook(null, array['lava-cookie', 'cheri-berry', 'cheri-berry']));
select is((select v->>'outcome' || '/' || (v->>'discovered') from r where k = 'known'), 'dish/false', 'a known recipe in the pot: a dish, no discovery');

-- the player reads their own shelf (the bag's "Món ăn" pocket), nobody else's
select is(
  (select jsonb_object_agg(dish_id, count) from public.kitchen_dishes),
  '{"poffin-cheri": 1, "poffin-pecha": 1, "bi-an-1": 1}'::jsonb,
  'the player reads their own dishes'
);

-- nobody writes the kitchen's tables
select throws_ok($$ insert into public.kitchen_dishes (user_id, dish_id, count) values ('11111111-1111-1111-1111-111111111111', 'ca-ri-lua', 9) $$, '42501', null, 'nobody fills their own shelf');
select throws_ok($$ select * from public.kitchen_recipes $$, '42501', null, 'nobody reads the recipes');

reset role;
set local role anon;
select throws_ok($$ select public.kitchen_menu() $$, '42501', null, 'guests can not open the kitchen''s menu');
select throws_ok($$ select public.kitchen_cook('poffin-pecha', null) $$, '42501', null, 'guests can not cook');

reset role;
select * from finish();
rollback;
