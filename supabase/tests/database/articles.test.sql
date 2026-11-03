-- The Field Notes blog: yarn db:test
-- Studio writes as postgres; the API only reads published articles. The member
-- policies and grants of the open path are exercised here with the grants the
-- migration keeps commented (rolled back with the transaction).
begin;
select plan(41);

-- rows a statement touched, run as the caller
create function pg_temp.affected(statement text) returns int
language plpgsql as $f$
declare n int;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end;
$f$;

insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ash@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'gary@example.com', 'authenticated', 'authenticated');
update public.profiles set display_name = 'Ash' where id = '11111111-1111-1111-1111-111111111111';

insert into public.articles (slug, title, status, published_at, author_id)
values
  ('nhap-1', 'Nháp', 'draft', null, null),
  ('cho-duyet', 'Chờ duyệt', 'pending', null, null),
  ('bi-tu-choi', 'Bị từ chối', 'rejected', null, null),
  ('hen-gio', 'Hẹn giờ', 'published', now() + interval '1 day', null),
  ('da-dang', 'Đã đăng', 'published', now() - interval '1 hour', null),
  ('bai-cua-gary', 'Của Gary', 'pending', null, '22222222-2222-2222-2222-222222222222'),
  ('ash-da-dang', 'Ash đã đăng', 'published', now() - interval '1 hour', '11111111-1111-1111-1111-111111111111');

-- the database owns what a write derives ------------------------------------
select throws_ok(
  $$ insert into public.articles (slug, title) values ('Bad Slug', 'x') $$,
  '23514', null, 'the slug check rejects Bad Slug'
);
select throws_ok(
  $$ insert into public.articles (slug, title) values ('a--b', 'x') $$,
  '23514', null, 'the slug check rejects a double dash'
);
select throws_ok(
  $$ insert into public.articles (slug, title, cover_color) values ('mau-sai', 'x', 'red') $$,
  '23514', null, 'cover_color is #rrggbb'
);
select throws_ok(
  $$ insert into public.articles (slug, title) values ('trong', '   ') $$,
  '23514', null, 'a title is not blank'
);
insert into public.articles (slug, title, body)
values ('muoi-chu', 'x', repeat('word ', 10)), ('hai-tram-le-mot', 'x', repeat('word ', 201));
select is(
  (select read_minutes from public.articles where slug = 'muoi-chu'),
  1, 'ten words read in a minute'
);
select is(
  (select read_minutes from public.articles where slug = 'hai-tram-le-mot'),
  2, '201 words read in two minutes (200 a minute)'
);
insert into public.articles (slug, title, status) values ('tu-dang', 'x', 'published');
select isnt(
  (select published_at from public.articles where slug = 'tu-dang'),
  null, 'publishing dates the article'
);

-- anon -----------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from public.articles
   where slug in ('nhap-1', 'cho-duyet', 'bi-tu-choi', 'hen-gio', 'bai-cua-gary')),
  0, 'a draft, a pending, a rejected and a future article are invisible'
);
select is(
  (select count(*)::int from public.articles
   where status <> 'published' or published_at > now()),
  0, 'nothing but published, already dated articles is readable'
);
select is(
  (select count(*)::int from public.articles
   where slug in ('pikachu-mouse-dien', 'eevee-tien-hoa', 'mewtwo-bi-an-phong-thi-nghiem',
     'huong-dan-nuoi-pokemon-moi', 'bep-pokemon-nau-gi-truoc', 'hanh-trinh-bat-pokemon-dau-tien',
     'da-dang')),
  7, 'the six seed articles and a published one are readable'
);
select throws_ok($$ insert into public.articles (slug, title) values ('x', 'x') $$, '42501', null, 'anon can not insert');
select throws_ok($$ update public.articles set title = 'x' $$, '42501', null, 'anon can not update');
select throws_ok($$ delete from public.articles $$, '42501', null, 'anon can not delete');
select throws_ok($$ select public.article_like(gen_random_uuid(), true) $$, '42501', null, 'anon can not like');
reset role;

-- the writing grants of the open path -----------------------------------------
grant insert (slug, title, excerpt, body, cover_url, cover_alt, cover_color, tags, status, author_id),
      update (slug, title, excerpt, body, cover_url, cover_alt, cover_color, tags, status),
      delete
  on public.articles to authenticated;

-- Ash ------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.articles (slug, title, status, author_id)
     values ('bai-cua-ash', 'Bài của Ash', 'pending', '11111111-1111-1111-1111-111111111111') $$,
  'a member submits an article under their own id'
);
select throws_ok(
  $$ insert into public.articles (slug, title, status, author_id)
     values ('mao-danh', 'x', 'pending', '22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'a member can not write as someone else'
);
select throws_ok(
  $$ insert into public.articles (slug, title, status, author_id)
     values ('tu-xuat-ban', 'x', 'published', '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'a member can not publish'
);
select is(
  (select author_name from public.articles where slug = 'bai-cua-ash'),
  'Ash', 'the author''s public name is filled from their profile'
);
select is(
  (select count(*)::int from public.articles where slug = 'bai-cua-ash'),
  1, 'an author reads their own pending article'
);
select is(
  (select count(*)::int from public.articles where slug = 'bai-cua-gary'),
  0, 'and not someone else''s'
);
select lives_ok(
  $$ update public.articles set title = 'Sửa', status = 'draft' where slug = 'bai-cua-ash' $$,
  'an author edits their own unpublished article'
);
select throws_ok(
  $$ update public.articles set status = 'published' where slug = 'bai-cua-ash' $$,
  '42501', null, 'but can not publish it'
);
select throws_ok(
  $$ update public.articles set like_count = 99 where slug = 'bai-cua-ash' $$,
  '42501', null, 'nor write the like counter'
);
select throws_ok(
  $$ update public.articles set published_at = now() where slug = 'bai-cua-ash' $$,
  '42501', null, 'nor the publication date'
);
select is(
  pg_temp.affected($$ update public.articles set title = 'Cướp' where slug = 'bai-cua-gary' $$),
  0, 'a member can not edit someone else''s article'
);
select is(
  pg_temp.affected($$ update public.articles set title = 'Sửa' where slug = 'ash-da-dang' $$),
  0, 'a published article is no longer editable by its author'
);
select is(
  pg_temp.affected($$ delete from public.articles where slug = 'ash-da-dang' $$),
  0, 'nor deletable'
);
select is(
  pg_temp.affected($$ delete from public.articles where slug = 'bai-cua-ash' $$),
  1, 'an unpublished one is deletable by its author'
);

-- likes ------------------------------------------------------------------------
select is(
  public.article_like((select id from public.articles where slug = 'pikachu-mouse-dien'), true),
  1, 'a like counts'
);
select is(
  public.article_like((select id from public.articles where slug = 'pikachu-mouse-dien'), true),
  1, 'a second like from the same member does not'
);
select throws_ok(
  $$ select public.article_like((select id from public.articles where slug = 'ash-da-dang'), true) $$,
  'P0001', 'own_article', 'a like on one''s own article is refused'
);
select throws_ok(
  $$ select public.article_like((select id from public.articles where slug = 'nhap-1'), true) $$,
  'P0001', 'article_not_found', 'a draft can not be liked (and is not even visible)'
);
select throws_ok(
  $$ select public.article_like('00000000-0000-0000-0000-000000000000', true) $$,
  'P0001', 'article_not_found', 'an unknown article can not be liked'
);
select throws_ok(
  $$ insert into public.article_likes (article_id, user_id)
     values ((select id from public.articles where slug = 'eevee-tien-hoa'), '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'likes are written by the function only'
);

-- Gary -------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is(
  public.article_like((select id from public.articles where slug = 'pikachu-mouse-dien'), true),
  2, 'another member''s like adds up'
);
select is(
  (select count(*)::int from public.article_likes),
  1, 'a member sees only their own like rows'
);
select throws_ok(
  $$ select public.article_like((select id from public.articles where slug = 'hen-gio'), true) $$,
  'P0001', 'article_not_found', 'a future article can not be liked'
);

-- Ash again ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(
  public.article_like((select id from public.articles where slug = 'pikachu-mouse-dien'), false),
  1, 'an unlike takes the like back'
);
select is(
  public.article_like((select id from public.articles where slug = 'pikachu-mouse-dien'), false),
  1, 'and again changes nothing'
);

-- no session -----------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok(
  $$ select public.article_like((select id from public.articles where slug = 'pikachu-mouse-dien'), true) $$,
  'P0001', 'not_signed_in', 'no session, no like'
);

reset role;
select is(
  (select updated_at from public.articles where slug = 'pikachu-mouse-dien'),
  (select created_at from public.articles where slug = 'pikachu-mouse-dien'),
  'a like is not an edit: updated_at stays'
);
select * from finish();
rollback;
