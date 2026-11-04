#!/usr/bin/env bash
set -euo pipefail
DB_CONTAINER=${DB_CONTAINER:-supabase_db_pokedex}
ROOT=$(git rev-parse --show-toplevel)
OUT="$ROOT/.superpowers/sdd/2026-11-04-pokemon-card-crafting"
mkdir -p "$OUT"
USER_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
OP=$(uuidgen | tr '[:upper:]' '[:lower:]')
ROUND=$(uuidgen | tr '[:upper:]' '[:lower:]')
sql() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atc "$1"; }
cleanup() { sql "delete from auth.users where id='$USER_ID'" >/dev/null; }
trap cleanup EXIT
sql "insert into auth.users(id,email,aud,role) values ('$USER_ID','craft-$USER_ID@example.invalid','authenticated','authenticated'); insert into public.pokemon_shards values ('$USER_ID',10,3)" >/dev/null
claim="set local role authenticated; select set_config('request.jwt.claims','{\"sub\":\"$USER_ID\",\"role\":\"authenticated\"}',true);"
# The first holds the transaction open while the second waits on the same operation.
sql "begin; $claim select public.pokemon_craft_card('$OP',10::smallint); select pg_sleep(1); commit" > "$OUT/concurrent-a.log" &
a=$!
sql "begin; $claim select public.pokemon_craft_card('$OP',10::smallint); commit" > "$OUT/concurrent-b.log" &
b=$!
wait "$a"; wait "$b"
test "$(sql "select count from public.pokemon_cards where user_id='$USER_ID' and pokemon_id=10")" = 1
# Distinct operations race with only enough for one craft.
sql "insert into public.pokemon_shards values ('$USER_ID',10,3)" >/dev/null
op_a=$(uuidgen); op_b=$(uuidgen)
sql "begin; $claim select public.pokemon_craft_card('$op_a',10::smallint); select pg_sleep(1); commit" > "$OUT/distinct-a.log" 2>&1 &
a=$!
sql "begin; $claim select public.pokemon_craft_card('$op_b',10::smallint); commit" > "$OUT/distinct-b.log" 2>&1 &
b=$!
sa=0; sb=0; wait "$a" || sa=$?; wait "$b" || sb=$?
test "$(( (sa == 0) + (sb == 0) ))" = 1
test "$(sql "select count from public.pokemon_cards where user_id='$USER_ID' and pokemon_id=10")" = 2
# An actual shard claim races with a craft using the same balance row.
sql "insert into public.pokemon_shards values ('$USER_ID',10,3); insert into public.quiz_shard_events(round_id,user_id,pokemon_id,rule_version,catalog_version,roll,state) values ('$ROUND','$USER_ID',10,1,1,0,'pending')" >/dev/null
op_a=$(uuidgen)
sql "begin; $claim select public.pokemon_craft_card('$op_a',10::smallint); select pg_sleep(1); commit" > "$OUT/award-craft.log" &
a=$!
sql "begin; $claim select public.quiz_claim_shard('$ROUND'); commit" > "$OUT/award-claim.log" &
b=$!
wait "$a"; wait "$b"
test "$(sql "select count from public.pokemon_shards where user_id='$USER_ID' and pokemon_id=10")" = 1
test "$(sql "select count from public.pokemon_cards where user_id='$USER_ID' and pokemon_id=10")" = 3
printf 'PASS: same operation, competing operations, quiz claim vs craft\n'
