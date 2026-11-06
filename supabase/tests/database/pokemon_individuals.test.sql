begin;
select no_plan();
insert into auth.users(id,email,aud,role) values
('55555555-5555-4555-8555-555555555555','ind-a@example.invalid','authenticated','authenticated'),
('66666666-6666-4666-8666-666666666666','ind-b@example.invalid','authenticated','authenticated');
-- golden vectors: the same ids and values as src/pages/BagPage/individuals/golden.json
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-00009e3779b1'::uuid,1::smallint),$${"personality":10,"appearance":{"v":2,"palette":"sunflower","shift":[[8,-1,-5],[-1,8,4],[-6,0,4]],"marks":{"kind":"scar","count":4,"seed":2006725191}},"potential":{"v":1,"offsets":[-3,3,3,-3,5,-5],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-00009e3779b1');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-00003c6ef362'::uuid,1::smallint),$${"personality":2,"appearance":{"v":2,"palette":"origin","shift":[[-5,0,-6],[-2,5,-6],[-4,9,-3]],"marks":{"kind":"stripes","count":2,"seed":868363178}},"potential":{"v":1,"offsets":[5,1,1,2,3,-3],"stars":4}}$$::jsonb,'golden 00000000-0000-4000-8000-00003c6ef362');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-0000daa66d13'::uuid,1::smallint),$${"personality":8,"appearance":{"v":2,"palette":"origin","shift":[[2,9,-6],[-2,2,-1],[-2,-7,4]],"marks":null},"potential":{"v":1,"offsets":[2,5,2,5,3,2],"stars":5}}$$::jsonb,'golden 00000000-0000-4000-8000-0000daa66d13');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-000078dde6c4'::uuid,1::smallint),$${"personality":7,"appearance":{"v":2,"palette":"aurora","shift":[[-8,-6,5],[6,3,4],[-7,-7,-5]],"marks":null},"potential":{"v":1,"offsets":[3,1,3,-5,-5,-2],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-000078dde6c4');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-00006a99b44c'::uuid,1::smallint),$${"personality":2,"appearance":{"v":2,"palette":"sakura","shift":[[-2,-4,-1],[-2,-9,-1],[2,5,6]],"marks":null},"potential":{"v":1,"offsets":[-5,1,0,-3,-2,-1],"stars":2}}$$::jsonb,'golden 00000000-0000-4000-8000-00006a99b44c');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-000081af14c1'::uuid,1::smallint),$${"personality":7,"appearance":{"v":2,"palette":"mint","shift":[[-3,-9,-1],[-6,-4,-4],[-8,-2,-6]],"marks":{"kind":"stripes","count":10,"seed":228245361}},"potential":{"v":1,"offsets":[5,-3,5,2,-4,-3],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-000081af14c1');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-00003ba366f2'::uuid,1::smallint),$${"personality":2,"appearance":{"v":2,"palette":"pearl","shift":[[7,-5,-3],[6,1,3],[3,2,0]],"marks":null},"potential":{"v":1,"offsets":[-3,-1,-3,-5,-2,-4],"stars":1}}$$::jsonb,'golden 00000000-0000-4000-8000-00003ba366f2');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-000017156075'::uuid,1::smallint),$${"personality":7,"appearance":{"v":2,"palette":"sakura","shift":[[6,-5,-1],[4,-10,2],[-5,-5,6]],"marks":null},"potential":{"v":1,"offsets":[-4,-3,1,2,5,-4],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-000017156075');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-0000b54cda26'::uuid,1::smallint),$${"personality":9,"appearance":{"v":2,"palette":"sunset","shift":[[-4,0,3],[-5,-10,2],[-3,-4,3]],"marks":null},"potential":{"v":1,"offsets":[-4,5,-1,-4,4,0],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-0000b54cda26');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-0000538453d7'::uuid,1::smallint),$${"personality":2,"appearance":{"v":2,"palette":"amethyst","shift":[[-6,-9,-5],[-8,8,3],[-6,3,-5]],"marks":{"kind":"spots","count":1,"seed":504830083}},"potential":{"v":1,"offsets":[-4,4,5,1,-4,-2],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-0000538453d7');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-0000f1bbcd88'::uuid,1::smallint),$${"personality":2,"appearance":{"v":2,"palette":"ocean","shift":[[-7,-7,6],[-4,0,4],[-3,-1,3]],"marks":{"kind":"scar","count":1,"seed":894911317}},"potential":{"v":1,"offsets":[0,-4,1,4,-5,4],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-0000f1bbcd88');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-00008ff34739'::uuid,1::smallint),$${"personality":7,"appearance":{"v":2,"palette":"sakura","shift":[[4,-1,4],[-5,8,4],[1,9,-2]],"marks":null},"potential":{"v":1,"offsets":[0,1,0,1,-4,4],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-00008ff34739');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-00002e2ac0ea'::uuid,1::smallint),$${"personality":1,"appearance":{"v":2,"palette":"aurora","shift":[[-1,7,4],[3,10,-3],[-6,5,6]],"marks":null},"potential":{"v":1,"offsets":[0,-3,5,-3,3,-4],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-00002e2ac0ea');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-0000cc623a9b'::uuid,1::smallint),$${"personality":1,"appearance":{"v":2,"palette":"moss","shift":[[-2,-3,4],[6,-4,6],[-7,-3,4]],"marks":{"kind":"stripes","count":7,"seed":370725110}},"potential":{"v":1,"offsets":[1,-1,0,1,-1,3],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-0000cc623a9b');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-000008d12dfd'::uuid,1::smallint),$${"personality":4,"appearance":{"v":2,"palette":"slate","shift":[[-4,10,1],[8,9,5],[0,-2,-4]],"marks":null},"potential":{"v":1,"offsets":[4,-1,-3,3,-3,-1],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-000008d12dfd');
select is(public.pokemon_individual_traits('00000000-0000-4000-8000-0000a708a7ae'::uuid,1::smallint),$${"personality":4,"appearance":{"v":2,"palette":"origin","shift":[[-8,3,-6],[6,-5,0],[-5,-4,-4]],"marks":{"kind":"flower","count":10,"seed":836671705}},"potential":{"v":1,"offsets":[0,3,0,-2,-4,3],"stars":3}}$$::jsonb,'golden 00000000-0000-4000-8000-0000a708a7ae');
insert into public.pokemon_cards values ('55555555-5555-4555-8555-555555555555',25,2),('55555555-5555-4555-8555-555555555555',10,1);
create temp table receipts(k text primary key,v jsonb);
grant all on receipts to authenticated;
select is((select count(*)::int from pg_proc where proname in ('pokemon_individual_u32','pokemon_individual_traits') and has_function_privilege('authenticated', oid, 'execute')),0,'trait helpers are not callable by players');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
select throws_ok($$select public.pokemon_trade_card(null,25::smallint)$$,'P0001','invalid_operation');
select throws_ok($$select public.pokemon_trade_card(gen_random_uuid(),0::smallint)$$,'P0001','invalid_species');
select throws_ok($$select public.pokemon_trade_card(gen_random_uuid(),150::smallint)$$,'P0001','insufficient_cards','no card, no individual');
select is((select count(*)::int from public.pokemon_individuals),0,'a refused trade creates nothing');
insert into receipts values ('first',public.pokemon_trade_card('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',25::smallint));
select is((select count from public.pokemon_cards where pokemon_id=25),1,'one card spent');
select is((select count(*)::int from public.pokemon_individuals where pokemon_id=25),1,'one individual');
select is((select v->>'individualId' from receipts where k='first')::uuid,(select id from public.pokemon_individuals where pokemon_id=25),'receipt names the individual');
select is((select v->'traits' from receipts where k='first'),(select jsonb_build_object('personality',personality,'appearance',appearance,'potential',potential) from public.pokemon_individuals where pokemon_id=25),'receipt traits are the stored traits');
select is((select v from receipts where k='first')::jsonb ? 'nickname',false,'receipt carries no nickname');
select is(public.pokemon_trade_card('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',25::smallint),(select v from receipts where k='first'),'replay returns the original receipt');
select is((select count(*)::int from public.pokemon_individuals where pokemon_id=25),1,'replay creates no second individual');
select is((select count from public.pokemon_cards where pokemon_id=25),1,'replay spends no second card');
select throws_ok($$select public.pokemon_trade_card('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',10::smallint)$$,'P0001','operation_conflict','same id cannot change species');
select public.pokemon_trade_card('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',25::smallint);
select is((select count(*)::int from public.pokemon_cards where pokemon_id=25),0,'last card removes the row');
select is((select count(distinct id)::int from public.pokemon_individuals where pokemon_id=25),2,'two individuals of one species have different ids');
select throws_ok($$select public.pokemon_trade_card('cccccccc-cccc-4ccc-8ccc-cccccccccccc',25::smallint)$$,'P0001','insufficient_cards','spent out');
-- direct writes are denied
select throws_ok($$update public.pokemon_individuals set personality=1$$,'42501',null,'no direct individual writes');
select throws_ok($$insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values (gen_random_uuid(),'55555555-5555-4555-8555-555555555555',1,1,'{}','{}')$$,'42501',null,'no direct inserts');
select throws_ok($$delete from public.pokemon_card_trades$$,'42501',null,'no direct receipt writes');
-- naming
create temp table mine as select id from public.pokemon_individuals where pokemon_id=25 order by created_at, id limit 1;
grant select on mine to authenticated;
select is(public.pokemon_name_individual((select id from mine),'  Pika   Chu  ')->>'nickname','Pika Chu','trim and collapse spaces');
select is((select nickname from public.pokemon_individuals where id=(select id from mine)),'Pika Chu','stored');
select is(public.pokemon_name_individual((select id from mine),'Pika Chu')->>'nickname','Pika Chu','same value is idempotent');
select is(public.pokemon_name_individual((select id from mine),U&'Ne\0301')->>'nickname',U&'N\00E9','NFC normalised');
select is(public.pokemon_name_individual((select id from mine),'Nguyễn Văn-A.')->>'nickname','Nguyễn Văn-A.','Vietnamese, hyphen, dot');
select is(public.pokemon_name_individual((select id from mine),'1234567890123456')->>'nickname','1234567890123456','16 characters');
select throws_ok($$select public.pokemon_name_individual((select id from mine),'12345678901234567')$$,'P0001','invalid_nickname','17 characters');
select throws_ok($$select public.pokemon_name_individual((select id from mine),U&'a\200Bb')$$,'P0001','invalid_nickname','zero-width space');
select throws_ok($$select public.pokemon_name_individual((select id from mine),U&'a\202Eb')$$,'P0001','invalid_nickname','right-to-left override');
select throws_ok($$select public.pokemon_name_individual((select id from mine),U&'a\200Db')$$,'P0001','invalid_nickname','zero-width joiner');
select throws_ok($$select public.pokemon_name_individual((select id from mine),E'a\u0007b')$$,'P0001','invalid_nickname','control character');
select throws_ok($$select public.pokemon_name_individual((select id from mine),'a<b>')$$,'P0001','invalid_nickname','markup characters');
select is((select nickname from public.pokemon_individuals where id=(select id from mine)),'1234567890123456','a refused name changes nothing');
select is(public.pokemon_name_individual((select id from mine),'   ')->'nickname','null'::jsonb,'only spaces clears');
select is((select nickname from public.pokemon_individuals where id=(select id from mine)),null,'cleared');
select throws_ok($$select public.pokemon_name_individual(gen_random_uuid(),'x')$$,'P0001','not_found','unknown individual');
-- another owner sees and touches nothing
select set_config('request.jwt.claims','{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',true);
select is((select count(*)::int from public.pokemon_individuals),0,'other owner cannot read individuals');
select is((select count(*)::int from public.pokemon_card_trades),0,'other owner cannot read receipts');
select throws_ok($$select public.pokemon_name_individual((select id from mine),'Mine')$$,'P0001','not_found','a stranger gets not_found');
select throws_ok($$select public.pokemon_trade_card('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',25::smallint)$$,'P0001','insufficient_cards','other owner cannot use the first owner''s operation or cards');
reset role;
select is((select nickname from public.pokemon_individuals where id=(select id from mine)),null,'stranger did not rename');
-- anon cannot call
set local role anon;
select throws_ok($$select public.pokemon_trade_card(gen_random_uuid(),25::smallint)$$,'42501',null,'anon cannot trade');
select throws_ok($$select public.pokemon_name_individual(gen_random_uuid(),'x')$$,'42501',null,'anon cannot name');
reset role;
-- older assets unchanged: the untouched card row of the first owner
select is((select count from public.pokemon_cards where user_id='55555555-5555-4555-8555-555555555555' and pokemon_id=10),1,'other species cards unchanged');
select * from finish();
rollback;
