#!/bin/bash
# Lock order check (Pokémon -> care -> bag -> trainer -> quests). Run by hand against the local stack:
#   bash supabase/tests/deadlock-minigame.sh
# Session A takes the locks the way kitchen/quiz do (bag, then trainer) and holds the bag 2s;
# session B settles a won round meanwhile. A deadlock (40P01) fails the run.
P="docker exec -i supabase_db_pokedex psql -U postgres -v ON_ERROR_STOP=0 -q -t"
U=f1000000-0000-4000-8000-000000000001; I=f2000000-0000-4000-8000-000000000001; R=f3000000-0000-4000-8000-000000000001
OUT=$(mktemp -d)
fail=0
for n in 1 2 3; do
$P >/dev/null <<SQL
delete from public.minigame_rounds where user_id='$U'; delete from public.pokemon_individuals where user_id='$U'; delete from auth.users where id='$U';
insert into auth.users(id,email,aud,role) values ('$U','dl@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values ('$I','$U',1,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection) values ('$I','$U',90,60,60,now(),10);
insert into public.bag(user_id,item_id,count) select '$U', id, 1 from public.quiz_items;
select public.trainer_grant_xp('$U',0);
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values ('$R','$U','memory','$I',1,1,'{"cards":[1,1,2,2,3,3,4,4,5,5,6,6]}','{"open":null,"matched":[0,1,2,3,4,5,6,7,8,9,10,11],"flips":12,"doneAt":null,"run":6,"best":6}',now()-interval '100 seconds',now()+interval '200 seconds');
SQL
( $P <<SQL
begin; select 1 from public.bag where user_id='$U' for update; select pg_sleep(2); select 1 from public.trainer_profiles where user_id='$U' for update; commit;
SQL
) > $OUT/a.txt 2>&1 &
sleep 0.7
( $P <<SQL
select public.minigame_settle('$R','won')->>'status';
SQL
) > $OUT/b.txt 2>&1 &
wait
if grep -qiE "deadlock|40P01" $OUT/a.txt $OUT/b.txt || ! grep -q won $OUT/b.txt; then
  echo "run $n: FAIL"; cat $OUT/a.txt $OUT/b.txt; fail=1
else echo "run $n: ok"; fi
done
$P >/dev/null <<SQL
delete from public.minigame_rounds where user_id='$U'; delete from public.pokemon_individuals where user_id='$U'; delete from auth.users where id='$U';
SQL
exit $fail
