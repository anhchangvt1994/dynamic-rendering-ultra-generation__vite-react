-- Pokémon evolution data: tables, access, backfill
begin;
select plan(10);

insert into auth.users(id,email,aud,role) values
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','evo-data-a@example.invalid','authenticated','authenticated'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','evo-data-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values
('e1000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',4,1,
  '{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');

select has_table('public','pokemon_evolutions','evolutions table');
select has_table('public','pokemon_dex','dex table');
select has_table('public','pokemon_evolution_log','log table');

-- the backfill statement of the migration
insert into public.pokemon_dex (user_id, pokemon_id, via)
select distinct user_id, pokemon_id, 'owned' from public.pokemon_individuals
on conflict do nothing;
select is((select count(*)::int from public.pokemon_dex where user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' and pokemon_id=4),1,'owned species are in the dex');

insert into public.pokemon_evolutions(from_species,to_species,alt,trigger,item) values (133,134,0,'use-item','water-stone')
on conflict do nothing;
insert into public.pokemon_dex(user_id,pokemon_id,via) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',25,'owned');

set local role anon;
select is((select count(*)::int from public.pokemon_evolutions where from_species=133 and item='water-stone'),1,'anon reads the evolutions');
select throws_ok($$select 1 from public.pokemon_dex$$,'42501',null,'anon reads no dex');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1","role":"authenticated"}',true);
select is((select count(*)::int from public.pokemon_dex),1,'a user reads only their own dex');
select throws_ok($$insert into public.pokemon_evolutions(from_species,to_species,alt,trigger) values (1,2,9,'level-up')$$,'42501',null,'no writes to evolutions');
select throws_ok($$insert into public.pokemon_dex(user_id,pokemon_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',1)$$,'42501',null,'no writes to the dex');
select throws_ok($$insert into public.pokemon_evolution_log(user_id,operation_id,individual_id,branch,receipt) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',gen_random_uuid(),'e1000000-0000-4000-8000-000000000001',5,'{}')$$,'42501',null,'no writes to the log');

select * from finish();
rollback;
