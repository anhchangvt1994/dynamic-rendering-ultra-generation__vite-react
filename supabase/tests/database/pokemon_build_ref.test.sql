-- Species, learnset, move and TM reference data behind the Pokémon build
begin;
select plan(8);

select ok(
  (select abilities @> '[{"name":"keen-eye","hidden":false},{"name":"sturdy","hidden":false},{"name":"weak-armor","hidden":true}]'::jsonb
     from public.pokemon_species_base where species = 227),
  'Skarmory: Keen Eye / Sturdy, hidden Weak Armor'
);
select is(
  (select array[hp, atk, def, spa, spd, spe]::int[] from public.pokemon_species_base where species = 25),
  array[35, 55, 40, 50, 50, 90],
  'Pikachu base stats'
);
select is((select growth from public.pokemon_species_base where species = 25), 'medium', 'Pikachu growth rate');
select is((select gender_rate from public.pokemon_species_base where species = 81), (-1)::smallint, 'Magnemite is genderless');
select is((select count(*)::int from public.pokemon_species_base), 1025, 'every species is seeded');
select ok(
  exists (select 1 from public.pokemon_learnset where species = 1 and method = 'level-up' and level > 0),
  'Bulbasaur learns moves by level'
);
select is(
  (select move from public.pokemon_machines where item_id = 'tm-fire'),
  'flamethrower',
  'TM Fire teaches Flamethrower'
);
select throws_ok(
  $$ set local role anon; insert into public.pokemon_species_base (species, hp, atk, def, spa, spd, spe, growth, gender_rate, abilities) values (1, 1, 1, 1, 1, 1, 1, 'medium', 0, '[]') $$,
  '42501',
  null,
  'nobody writes species data from the client'
);

select * from finish();
rollback;
