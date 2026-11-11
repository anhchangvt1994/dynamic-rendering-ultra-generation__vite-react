begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('b1000000-0000-4000-8000-000000000001','badge-a@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential)
select gen_random_uuid(),'b1000000-0000-4000-8000-000000000001',n,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}' from generate_series(1,4) n;
select public.trainer_grant_xp('b1000000-0000-4000-8000-000000000001',0);

select is(public.trainer_award_badges('b1000000-0000-4000-8000-000000000001'),'{}'::text[],'4 Pokémon, level 1: nothing yet');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential)
values (gen_random_uuid(),'b1000000-0000-4000-8000-000000000001',5,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');
select is(public.trainer_award_badges('b1000000-0000-4000-8000-000000000001'),array['owned_5'],'5 Pokémon earn owned_5');
select is(public.trainer_award_badges('b1000000-0000-4000-8000-000000000001'),'{}'::text[],'awarded once');
select public.trainer_grant_xp('b1000000-0000-4000-8000-000000000001',public.trainer_xp_for(5));
select is(public.trainer_award_badges('b1000000-0000-4000-8000-000000000001'),array['level_5'],'level 5 badge');
select is((select count(*)::int from public.trainer_badges where user_id='b1000000-0000-4000-8000-000000000001'),2,'two stored');
select is(public.trainer_avatars()->0->>'id','rookie','avatar list starts with rookie');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.trainer_set_avatar('nobody')$$,'P0001','bad_avatar');
select throws_ok($$select public.trainer_set_avatar('champion')$$,'P0001','locked');
select is((public.trainer_set_avatar('scout'))->>'avatar','scout','a free avatar can be set');
select is((select avatar from public.trainer_profiles),'scout','and is stored');
select is((public.trainer_set_avatar('hiker'))->>'avatar','hiker','level 5 unlocks hiker');
select * from finish();
rollback;
