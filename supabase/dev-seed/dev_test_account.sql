-- Dev only (yarn dev's CLI stack, supabase db reset): never loaded on the
-- self-hosted stack, see config/utils/Seeds.mjs. abc@gmail.com signs in on
-- /dang-nhap with no code (src/app/supabase/devAccount.mjs). Idempotent:
-- counts are topped up, never lowered; what was tested (cooked, crafted,
-- cared for) stays.
do $$
declare
  v_user constant uuid := '00000000-0000-4000-a000-000000000abc';
  v_ind record;
begin
  -- the account, confirmed, with the password devAccount.mjs signs in with
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
    'abc@gmail.com', extensions.crypt('dev-test-abc-2026', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{"dev_test":true}', now(), now(),
    '', '', '', '', '', '', '', '')
  on conflict (id) do update set
    encrypted_password = extensions.crypt('dev-test-abc-2026', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
    banned_until = null, deleted_at = null;

  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  select v_user::text, v_user,
    jsonb_build_object('sub', v_user::text, 'email', 'abc@gmail.com', 'email_verified', true),
    'email', now(), now()
  where not exists (select 1 from auth.identities where user_id = v_user and provider = 'email');

  insert into public.profiles (id, display_name) values (v_user, 'Dev Tester')
  on conflict (id) do update set display_name = coalesce(public.profiles.display_name, 'Dev Tester');

  -- caught: the first 151 and a few favourites
  insert into public.caught (user_id, pokemon_id)
  select v_user, id from (select generate_series(1, 151) as id
    union values (384), (445), (448), (658), (887)) ids
  on conflict do nothing;

  -- bag: 40 of every item (every ingredient, stone, TM...)
  insert into public.bag (user_id, item_id, count)
  select v_user, id, 40 from public.quiz_items
  on conflict (user_id, item_id) do update set count = greatest(public.bag.count, excluded.count);

  -- kitchen: the common recipes and half the secrets found, 6 of each to
  -- feed; bi-an-5..8 stay to be discovered
  -- (discoveries are the secret dishes only, as kitchen_cook records them)
  insert into public.kitchen_discoveries (user_id, dish_id)
  select v_user, dish_id from public.kitchen_recipes
  where dish_id in ('bi-an-1', 'bi-an-2', 'bi-an-3', 'bi-an-4')
  on conflict do nothing;
  insert into public.kitchen_dishes (user_id, dish_id, count)
  select v_user, dish_id, 6 from public.kitchen_recipes
  where not secret or dish_id in ('bi-an-1', 'bi-an-2', 'bi-an-3', 'bi-an-4')
  on conflict (user_id, dish_id) do update
    set count = greatest(public.kitchen_dishes.count, excluded.count);

  -- amber: shards around each species' requirement (catalog v1): twice it,
  -- exactly it, one short, a few
  insert into public.pokemon_shards (user_id, pokemon_id, count)
  select v_user, c.pokemon_id,
    case
      when c.pokemon_id in (25, 133, 448) then r.required * 2
      when c.pokemon_id in (6, 94, 143, 150) then r.required
      when c.pokemon_id in (1, 4, 7, 149, 151) then r.required - 1
      else 1 + c.pokemon_id % 5
    end
  from public.pokemon_shard_catalog c, lateral public.quiz_shard_rule(c.metadata) r
  where c.version = 1 and (c.pokemon_id between 1 and 151 or c.pokemon_id in (384, 445, 658, 887))
  on conflict (user_id, pokemon_id) do update
    set count = greatest(public.pokemon_shards.count, excluded.count);

  -- finished amber stones, ready to trade for a Pokémon
  insert into public.pokemon_cards (user_id, pokemon_id, count)
  values (v_user, 25, 3), (v_user, 6, 2), (v_user, 133, 2), (v_user, 150, 1),
    (v_user, 448, 1), (v_user, 384, 1)
  on conflict (user_id, pokemon_id) do update
    set count = greatest(public.pokemon_cards.count, excluded.count);

  -- my Pokémon: one per care case
  for v_ind in
    select * from (values
      ('00000000-0000-4000-a000-000000abc001'::uuid, 25::smallint, 'Pika'::text),
      ('00000000-0000-4000-a000-000000abc002', 133, null),
      ('00000000-0000-4000-a000-000000abc003', 6, null),
      ('00000000-0000-4000-a000-000000abc004', 94, 'Bóng'),
      ('00000000-0000-4000-a000-000000abc005', 150, null),
      ('00000000-0000-4000-a000-000000abc006', 143, null)
    ) t(id, species, nickname)
  loop
    insert into public.pokemon_individuals (id, user_id, pokemon_id, nickname, personality, appearance, potential)
    select v_ind.id, v_user, v_ind.species, v_ind.nickname, (t->>'personality')::smallint,
      t->'appearance', t->'potential'
    from public.pokemon_individual_traits(v_ind.id, v_ind.species::smallint) t
    on conflict (id) do nothing;
  end loop;

  -- care: pikachu happy and close, eevee hungry, charizard dirty, gengar
  -- bored, snorlax neglected for days; mewtwo is new (no care row yet)
  insert into public.pokemon_care (individual_id, user_id, hunger, clean, fun, needs_at,
    affection, power, beauty, happiness, agility, wisdom, friendship, last_cared_at)
  values
    ('00000000-0000-4000-a000-000000abc001', v_user, 85, 90, 88, now(), 160, 40, 25, 55, 50, 20, 45, now()),
    ('00000000-0000-4000-a000-000000abc002', v_user, 30, 80, 70, now(), 12, 5, 10, 5, 0, 0, 5, now()),
    ('00000000-0000-4000-a000-000000abc003', v_user, 70, 28, 65, now(), 35, 20, 0, 10, 10, 0, 5, now()),
    ('00000000-0000-4000-a000-000000abc004', v_user, 75, 70, 26, now(), 60, 0, 15, 0, 20, 30, 10, now()),
    ('00000000-0000-4000-a000-000000abc006', v_user, 60, 60, 60, now() - interval '3 days', 5, 0, 0, 0, 0, 0, 0, now() - interval '3 days')
  on conflict (individual_id) do nothing;
end $$;
