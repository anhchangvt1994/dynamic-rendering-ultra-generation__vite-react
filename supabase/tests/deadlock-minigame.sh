#!/bin/bash
# Lock order check (Pokémon -> care -> bag -> trainer -> quests). Run by hand against the local stack:
#   bash supabase/tests/deadlock-minigame.sh
# Session A takes the locks the way kitchen/quiz do (bag, then trainer) and holds the bag 2s;
# session B settles a won round meanwhile. A deadlock (40P01) fails the run.
P="docker exec -i supabase_db_pokedex psql -U postgres -v ON_ERROR_STOP=0 -q -t"
U=f1000000-0000-4000-8000-000000000001; I=f2000000-0000-4000-8000-000000000001; R=f3000000-0000-4000-8000-000000000001
OUT=$(mktemp -d)
# a candy round that the 'win' vector (3 moves) finishes: layout from vectors.json
R2=f3000000-0000-4000-8000-000000000002
CANDY=$(node -e "const v=require('./src/pages/MiniGamePage/games/candy/vectors.json').find(x=>x.name==='win');console.log(JSON.stringify({layout:{tape:v.tape,board:v.board0,pos:v.pos0},moves:v.moves}))")
LAYOUT=$(node -e "console.log(JSON.parse(process.argv[1]).layout ? JSON.stringify(JSON.parse(process.argv[1]).layout) : '')" "$CANDY")
MOVES=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]).moves))" "$CANDY")
fail=0
for n in 1 2 3; do
$P >/dev/null <<SQL
delete from public.minigame_rounds where user_id='$U'; delete from public.pokemon_individuals where user_id='$U'; delete from auth.users where id='$U';
insert into auth.users(id,email,aud,role) values ('$U','dl@example.invalid','authenticated','authenticated');
insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values ('$I','$U',1,1,'{"v":2,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[],"stars":1}');
insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection) values ('$I','$U',90,60,60,now(),10);
insert into public.bag(user_id,item_id,count) select '$U', id, 1 from public.quiz_items;
select public.trainer_grant_xp('$U',0);
select public.quest_ensure('$U');
update public.minigame_quests set progress=goal where user_id='$U';
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values ('$R','$U','memory','$I',1,1,'{"cards":[1,1,2,2,3,3,4,4,5,5,6,6]}','{"open":null,"matched":[0,1,2,3,4,5,6,7,8,9,10,11],"flips":12,"doneAt":null,"run":6,"best":6}',now()-interval '100 seconds',now()+interval '200 seconds');
SQL
$P >/dev/null <<SQL
update public.minigame_quests set progress=goal where user_id='$U';
insert into public.minigame_rounds(id,user_id,game,individual_id,difficulty,seed,layout,progress,started_at,deadline) values ('$R2','$U','candy','$I',1,1,'$LAYOUT','{"moves":0,"score":0,"best":0,"movesLeft":20,"doneAt":null}',now()-interval '100 seconds',now()+interval '200 seconds');
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
( $P <<SQL
select set_config('request.jwt.claims','{"sub":"$U","role":"authenticated"}',false);
set role authenticated;
select (public.minigame_quest_claim(1::smallint))->>'xp';
select (public.minigame_quest_claim(2::smallint))->>'xp';
select (public.minigame_quest_claim(3::smallint))->>'xp';
SQL
) > $OUT/c.txt 2>&1 &
( $P <<SQL
select set_config('request.jwt.claims','{"sub":"$U","role":"authenticated"}',false);
set role authenticated;
select public.minigame_finish('$R2','$MOVES'::jsonb)->>'status';
SQL
) > $OUT/d.txt 2>&1 &
wait
if grep -qiE "deadlock|40P01" $OUT/a.txt $OUT/b.txt $OUT/c.txt $OUT/d.txt || ! grep -q won $OUT/d.txt || ! grep -q won $OUT/b.txt || [ "$(grep -cE "^ *[0-9]+$" $OUT/c.txt)" -lt 3 ]; then
  echo "run $n: FAIL"; cat $OUT/a.txt $OUT/b.txt $OUT/c.txt $OUT/d.txt; fail=1
else echo "run $n: ok"; fi
done
$P >/dev/null <<SQL
delete from public.minigame_rounds where user_id='$U'; delete from public.pokemon_individuals where user_id='$U'; delete from auth.users where id='$U';
SQL
exit $fail
