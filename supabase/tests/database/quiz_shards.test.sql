-- "Who's That Pokémon?": species shards (yarn db:test)
-- A right answer queues one entitlement with one stored roll; a claim settles
-- it once. Rolls are set here as postgres, never left to random().
begin;
select plan(34);

insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ash@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'gary@example.com', 'authenticated', 'authenticated');

-- Caterpie (255, F: 3 shards, always) and Mewtwo (3, SSS: 19 shards, 15%)
insert into public.pokemon_shard_catalog (version, pokemon_id, metadata) values
  (1, 10, '{"name":"caterpie","types":["bug"],"captureRate":255,"legendary":false,"mythical":false,"stats":[45,30,35,20,20,45],"powerLevel":0}'),
  (1, 150, '{"name":"mewtwo","types":["psychic"],"captureRate":3,"legendary":true,"mythical":false,"stats":[106,110,90,154,90,130],"powerLevel":8}')
on conflict (version, pokemon_id) do nothing;

create temp table r (k text primary key, v jsonb);
grant all on r to authenticated, service_role;
create function pg_temp.round_id(name text) returns uuid
language sql as $$ select (v->>'id')::uuid from r where k = name $$;
-- a pending round of the user (the turn count is not under test)
create function pg_temp.mk(p_user uuid, name text) returns void
language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into public.quiz_rounds (user_id, answer_id, options, veil, hard, range_from, range_to,
    gifts, bonus_slot, duration_ms)
  values (p_user, 150, array[150, 1, 2, 3], 'warp', false, 1, 151,
    (select array_fill(id, array[4]) from public.quiz_items where not hard order by id limit 1), -1, 14000)
  returning id into v_id;
  insert into r values (name, jsonb_build_object('id', v_id));
end;
$$;
-- the event of a round, its species and its roll fixed by the test
create function pg_temp.fix(name text, p_species int, p_roll float8) returns void
language sql security definer as $$
  update public.quiz_shard_events set pokemon_id = p_species, roll = p_roll
  where round_id = pg_temp.round_id(name)
$$;
create function pg_temp.event(name text) returns public.quiz_shard_events
language sql security definer as $$
  select e from public.quiz_shard_events e where round_id = pg_temp.round_id(name)
$$;
grant execute on all functions in schema pg_temp to authenticated, service_role;

\set ash '''11111111-1111-1111-1111-111111111111'''
\set gary '''22222222-2222-2222-2222-222222222222'''

select pg_temp.mk(:ash, 'a');
select pg_temp.mk(:gary, 'g');
select is((select shard_rule_version from public.quiz_rounds where id = pg_temp.round_id('a')), 1::smallint, 'a new round carries the shard rule version');
select is((select shard_catalog_version from public.quiz_rounds where id = pg_temp.round_id('a')), 1::smallint, 'a new round pins the catalog version');
select is((select count(*) from public.quiz_shard_events)::int, 0, 'an unanswered round queues nothing');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select public.quiz_answer(pg_temp.round_id('a'), 150::smallint);
reset role;
select is((pg_temp.event('a')).state, 'pending', 'a right answer queues a pending event');
select ok((pg_temp.event('a')).roll >= 0 and (pg_temp.event('a')).roll < 1, 'with one stored roll in [0,1)');
select is((pg_temp.event('a')).pokemon_id, 150::smallint, 'for the answered species');
select is((pg_temp.event('a')).catalog_version, 1::smallint, 'under the pinned catalog version');

-- wrong and time never earn
select pg_temp.mk(:ash, 'w');
set local role authenticated;
select public.quiz_answer(pg_temp.round_id('w'), 1::smallint);
reset role;
select is((pg_temp.event('w')).state, 'ineligible', 'a wrong answer is ineligible');
select ok((pg_temp.event('w')).roll is null, 'and rolls nothing');
select pg_temp.mk(:ash, 't');
set local role authenticated;
select public.quiz_answer(pg_temp.round_id('t'), (-2)::smallint);
reset role;
select is((pg_temp.event('t')).state, 'ineligible', 'time up is ineligible');

-- roll below the drop: awarded once
select pg_temp.fix('a', 150, 0.10);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into r values ('a1', public.quiz_claim_shard(pg_temp.round_id('a')));
select is((select v->>'state' from r where k = 'a1'), 'awarded', 'a roll below the drop is awarded');
select is((select (v->>'count')::int from r where k = 'a1'), 1, 'the receipt counts one shard');
select is((select (v->>'required')::int from r where k = 'a1'), 19, 'Mewtwo needs 19');
select ok((select abs((v->>'drop')::float8 - 0.15) < 0.001 from r where k = 'a1'), 'with a 15% drop');
insert into r values ('a2', public.quiz_claim_shard(pg_temp.round_id('a')));
select is((select v from r where k = 'a2'), (select v from r where k = 'a1'), 'a second claim returns the same receipt');
select is((select count from public.pokemon_shards where pokemon_id = 150), 1, 'and the balance is still one');

-- roll above the drop: not awarded
reset role;
select pg_temp.mk(:ash, 'b');
set local role authenticated;
select public.quiz_answer(pg_temp.round_id('b'), 150::smallint);
reset role;
select pg_temp.fix('b', 150, 0.90);
set local role authenticated;
select is((public.quiz_claim_shard(pg_temp.round_id('b')))->>'state', 'not_awarded', 'a roll above the drop is not awarded');
select is((select count from public.pokemon_shards where pokemon_id = 150), 1, 'and adds nothing');

-- a catalog that is not there yet: pending, the roll kept, no error
reset role;
select pg_temp.mk(:ash, 'c');
set local role authenticated;
select public.quiz_answer(pg_temp.round_id('c'), 150::smallint);
reset role;
select pg_temp.fix('c', 150, 0.10);
update public.quiz_shard_events set catalog_version = 99 where round_id = pg_temp.round_id('c');
set local role authenticated;
select is((public.quiz_claim_shard(pg_temp.round_id('c')))->>'state', 'pending', 'a missing catalog leaves the event pending');
reset role;
select is((pg_temp.event('c')).roll, 0.10::float8, 'with its roll kept');
insert into public.pokemon_shard_catalog (version, pokemon_id, metadata)
select 99, pokemon_id, metadata from public.pokemon_shard_catalog where version = 1 and pokemon_id = 150;
set local role authenticated;
select is((public.quiz_claim_shard(pg_temp.round_id('c')))->>'state', 'awarded', 'once the catalog is complete the claim settles');
select is((select count from public.pokemon_shards where pokemon_id = 150), 2, 'one shard more');

-- a round from before the feature is never eligible
reset role;
insert into public.quiz_rounds (id, user_id, answer_id, options, veil, hard, range_from, range_to,
  gifts, bonus_slot, duration_ms, answered_at)
values ('aaaaaaaa-0000-0000-0000-000000000001', :ash, 150, array[150, 1, 2, 3], 'warp', false, 1, 151, '{}', -1, 14000, now());
update public.quiz_rounds set shard_rule_version = null, shard_catalog_version = null where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.quiz_rounds set outcome = 'right' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select count(*) from public.quiz_shard_events where round_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 0, 'a round from before the feature queues nothing');
set local role authenticated;
select is((public.quiz_claim_shard('aaaaaaaa-0000-0000-0000-000000000001'))->>'state', 'ineligible', 'and its claim is ineligible');

-- another trainer's round, and the closed doors
select throws_ok($$ select public.quiz_claim_shard(pg_temp.round_id('g')) $$, 'P0001', 'no_round', 'a round that is not yours (or not answered) has nothing to claim');
select throws_ok($$ select public.quiz_claim_shard(gen_random_uuid()) $$, 'P0001', 'no_round', 'an unknown round has nothing to claim');
select throws_ok($$ insert into public.pokemon_shards values ('11111111-1111-1111-1111-111111111111', 10, 99) $$, '42501', null, 'a player can not write a balance');
select throws_ok($$ select public.quiz_shard_settle(null) $$, '42501', null, 'the settle helper is not callable by a player');
select throws_ok($$ insert into public.pokemon_shard_catalog values (1, 11, '{}') $$, '42501', null, 'a player can not write the catalog');
reset role;
select throws_ok($$ update public.pokemon_shard_catalog set metadata = '{}' where version = 1 and pokemon_id = 150 $$, 'P0001', null, 'a catalog row never changes');
set local role anon;
select throws_ok($$ select public.quiz_claim_shard(gen_random_uuid()) $$, '42501', null, 'a guest can not claim');
reset role;

-- reconcile: the caller's pending events only
select pg_temp.mk(:ash, 'd');
set local role authenticated;
select public.quiz_answer(pg_temp.round_id('d'), 150::smallint);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select public.quiz_answer(pg_temp.round_id('g'), 150::smallint);
reset role;
select pg_temp.fix('d', 150, 0.10);
select pg_temp.fix('g', 150, 0.10);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into r values ('rec', public.quiz_reconcile_shards(0));
select is((select jsonb_array_length(v) from r where k = 'rec'), 1, 'reconcile settles at least one and only the caller''s pending events');
select is((select v->0->>'state' from r where k = 'rec'), 'awarded', 'and settles it');
reset role;
select is((pg_temp.event('g')).state, 'pending', 'another trainer''s pending event is left alone');

select * from finish();
rollback;
