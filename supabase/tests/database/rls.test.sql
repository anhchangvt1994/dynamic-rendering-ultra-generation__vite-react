-- Row level security of profiles and caught: yarn supabase test db
begin;
select plan(13);

insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ash@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'gary@example.com', 'authenticated', 'authenticated');

select is(
  (select count(*)::int from public.profiles
   where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2,
  'every new account gets a profile'
);

-- Ash ----------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.caught (pokemon_id) values (25), (6) $$,
  'a trainer adds to their own collection (user_id defaults to auth.uid())'
);
select throws_ok(
  $$ insert into public.caught (user_id, pokemon_id) values ('22222222-2222-2222-2222-222222222222', 1) $$,
  '42501',
  null,
  'a trainer can not add to someone else''s collection'
);
select throws_ok(
  $$ insert into public.caught (pokemon_id) values (1026) $$,
  '23514',
  null,
  'only national dex numbers 1..1025'
);
select is(
  (select count(*)::int from public.profiles),
  1,
  'a trainer sees only their own profile'
);
select lives_ok(
  $$ update public.profiles set display_name = 'Ash' $$,
  'a trainer names their profile'
);
select throws_ok(
  $$ update public.profiles set created_at = now() $$,
  '42501',
  null,
  'only display_name can be changed'
);
select throws_ok(
  $$ insert into public.profiles (id) values ('11111111-1111-1111-1111-111111111111') $$,
  '42501',
  null,
  'profiles are created by the database, not by users'
);

-- Gary ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.caught),
  0,
  'a trainer does not see another trainer''s collection'
);
delete from public.caught where pokemon_id = 25;
update public.profiles set display_name = 'Gary';

reset role;
select is(
  (select count(*)::int from public.caught where user_id = '11111111-1111-1111-1111-111111111111'),
  2,
  'a trainer can not remove from another trainer''s collection'
);
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Ash',
  'a trainer can not rename another trainer'
);

-- no session -----------------------------------------------------------------
set local role anon;
select throws_ok(
  $$ select * from public.caught $$,
  '42501',
  null,
  'anon can not read collections'
);
select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  null,
  'anon can not read profiles'
);

select * from finish();
rollback;
