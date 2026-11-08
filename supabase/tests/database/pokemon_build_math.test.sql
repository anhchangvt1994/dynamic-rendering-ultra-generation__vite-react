-- Pokémon build math: stats, natures, growth curves, genes, EV, level cap and
-- the owner-only read RPC
begin;
select plan(33);

insert into auth.users(id,email,aud,role) values
('99999999-9999-4999-8999-999999999991','build-a@example.invalid','authenticated','authenticated'),
('99999999-9999-4999-8999-999999999992','build-b@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values
('b0000000-0000-4000-8000-000000000001','99999999-9999-4999-8999-999999999991',25,2,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}'),
('b0000000-0000-4000-8000-000000000002','99999999-9999-4999-8999-999999999991',25,2,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[5,5,5,5,5,5],"stars":5}');

-- stat formula
select is(public.pokemon_stat_value(108,31,0,100,true,1),357,'HP: base 108, IV 31, level 100');
select is(public.pokemon_stat_value(130,31,0,100,false,1),296,'Atk: neutral nature');
select is(public.pokemon_stat_value(130,31,252,100,false,1.1),394,'Atk: 252 EV and a raising nature');
select is(public.pokemon_stat_value(35,15,0,60,true,1),121,'HP at level 60');

-- natures: Adamant (3) raises atk, lowers spa; index 0 is neutral
select is(public.pokemon_nature_mult(3::smallint,1::smallint),1.1,'Adamant raises Atk');
select is(public.pokemon_nature_mult(3::smallint,3::smallint),0.9,'Adamant lowers Sp.Atk');
select is(public.pokemon_nature_mult(3::smallint,5::smallint),1::numeric,'Adamant leaves Spe alone');
select is(public.pokemon_nature_mult(3::smallint,0::smallint),1::numeric,'HP is never touched');
select is((select count(*)::int from generate_series(0,24) n, generate_series(1,5) s where public.pokemon_nature_mult(n::smallint,s::smallint) = 1.1::numeric),20,'20 natures raise a stat, 5 are neutral');

-- growth curves
select is(public.pokemon_level_exp('medium',100),4000,'medium: level 100');
select is(public.pokemon_level_exp('medium',50),500,'medium: level 50');
select is(public.pokemon_level_exp('medium',1),0,'level 1 needs nothing');
select is(public.pokemon_level_exp('medium',2),1,'level 2 needs 1 exp');
select is(
  (select count(*)::int from unnest(array['slow','medium-slow','medium','fast','erratic','fluctuating']) g, generate_series(2,100) l
    where public.pokemon_level_exp(g,l) <= public.pokemon_level_exp(g,l-1)),
  0,
  'every curve rises with every level');
select is(public.pokemon_level_from_exp('medium',4000,100),100,'exp 4000 is level 100');
select is(public.pokemon_level_from_exp('medium',4000,70),70,'the cap holds the level');
select is(public.pokemon_level_from_exp('medium',0,100),1,'no exp is level 1');

-- stars
select is(public.pokemon_iv_stars(array[31,31,31,31,31,31]::smallint[]),5,'perfect IVs: 5 stars');
select is(public.pokemon_iv_stars(array[0,0,0,0,0,0]::smallint[]),1,'zero IVs: 1 star');
select is(public.pokemon_birth_iv('{"offsets":[5,-5,0]}'),array[31,0,15,15,15,15]::smallint[],'birth IV from offsets, missing ones neutral');

-- genes
select is(
  public.pokemon_build_genes('00000000-0000-4000-8000-00009e3779b1'::uuid,25::smallint),
  '{"size":105,"shiny":false,"gender":"male","nature":10,"ability":{"name":"static","slot":1,"hidden":false}}'::jsonb,
  'genes of a fixed id are pinned');
select is(public.pokemon_build_genes('00000000-0000-4000-8000-00009e3779b1'::uuid,81::smallint)->>'gender','none','a genderless species has no gender');
select ok(
  not exists (
    select 1 from generate_series(1,400) n,
      (select min(species)::smallint s from public.pokemon_species_base where not abilities @> '[{"hidden":true}]') p
     where (public.pokemon_build_genes(md5(n::text)::uuid, p.s)->'ability'->>'hidden')::boolean),
  'a species without a hidden ability never rolls one');
select ok(
  (select count(*) filter (where (g->'ability'->>'hidden')::boolean) between 100 and 300
     from (select public.pokemon_build_genes(md5(n::text)::uuid,227::smallint) g from generate_series(1,2000) n) t),
  'about 10 % of Skarmory roll the hidden ability');
select ok(
  (select count(*) filter (where (g->>'shiny')::boolean) between 0 and 8
     from (select public.pokemon_build_genes(md5(n::text)::uuid,25::smallint) g from generate_series(1,2000) n) t),
  'shiny is about 1 in 1024');
select ok(
  (select bool_and((g->>'size')::int between 90 and 110 and (g->>'nature')::int between 0 and 24)
     from (select public.pokemon_build_genes(md5(n::text)::uuid,25::smallint) g from generate_series(1,500) n) t),
  'size 90..110 and nature 0..24');

-- EV from care: stars 1 -> cap 80
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection,power,beauty,happiness,agility,wisdom,friendship) values
('b0000000-0000-4000-8000-000000000001','99999999-9999-4999-8999-999999999991',60,60,60,now(),4000,40,0,0,0,0,0);
select is(public.pokemon_build_ev('b0000000-0000-4000-8000-000000000001'::uuid),array[0,126,0,0,0,0]::smallint[],'power 40 of 80 is 126 EV in Atk');
update public.pokemon_care set power=80,beauty=80,happiness=80,agility=80,wisdom=80,friendship=80 where individual_id='b0000000-0000-4000-8000-000000000001';
select is(public.pokemon_build_ev('b0000000-0000-4000-8000-000000000001'::uuid),array[85,85,85,85,85,85]::smallint[],'the 510 total shrinks every EV evenly');

-- the read RPC
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999991","role":"authenticated"}',true);
select is((public.pokemon_build('b0000000-0000-4000-8000-000000000001'::uuid)->>'level')::int,60,'exp 4000 is held to level 60 by 1 star');
select is((public.pokemon_build('b0000000-0000-4000-8000-000000000001'::uuid)->>'capped')::boolean,true,'a capped level says so');
select is(jsonb_array_length(public.pokemon_build('b0000000-0000-4000-8000-000000000002'::uuid)->'stats'),6,'six final stats');
select is((public.pokemon_build('b0000000-0000-4000-8000-000000000002'::uuid)->>'cap')::int,100,'5 stars: level cap 100');
select set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999992","role":"authenticated"}',true);
select throws_ok($$select public.pokemon_build('b0000000-0000-4000-8000-000000000001'::uuid)$$,'42501',null,'only the owner reads the build');
reset role;

select * from finish();
rollback;
