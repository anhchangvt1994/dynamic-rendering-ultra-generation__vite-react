#!/usr/bin/env bash
set -euo pipefail
DB_CONTAINER=${DB_CONTAINER:-supabase_db_pokedex}
ROOT=$(git rev-parse --show-toplevel)
OUT="$ROOT/.superpowers/sdd/2026-11-04-pokemon-individuals"
mkdir -p "$OUT"
USER_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
sql() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atc "$1"; }
cleanup() { sql "delete from auth.users where id='$USER_ID'" >/dev/null; }
trap cleanup EXIT
sql "insert into auth.users(id,email,aud,role) values ('$USER_ID','ind-$USER_ID@example.invalid','authenticated','authenticated'); insert into public.pokemon_cards values ('$USER_ID',25,1)" >/dev/null
claim="set local role authenticated; select set_config('request.jwt.claims','{\"sub\":\"$USER_ID\",\"role\":\"authenticated\"}',true);"
count() { sql "select count(*) from public.pokemon_individuals where user_id='$USER_ID'"; }
# Same operation, two connections: one individual, one card spent.
OP=$(uuidgen)
sql "begin; $claim select public.pokemon_trade_card('$OP',25::smallint); select pg_sleep(1); commit" > "$OUT/same-a.log" &
a=$!
sql "begin; $claim select public.pokemon_trade_card('$OP',25::smallint); commit" > "$OUT/same-b.log" &
b=$!
wait "$a"; wait "$b"
test "$(count)" = 1
test "$(sql "select count(*) from public.pokemon_cards where user_id='$USER_ID'")" = 0
# Different operations, one card: exactly one succeeds.
sql "insert into public.pokemon_cards values ('$USER_ID',25,1)" >/dev/null
op_a=$(uuidgen); op_b=$(uuidgen)
sql "begin; $claim select public.pokemon_trade_card('$op_a',25::smallint); select pg_sleep(1); commit" > "$OUT/distinct-a.log" 2>&1 &
a=$!
sql "begin; $claim select public.pokemon_trade_card('$op_b',25::smallint); commit" > "$OUT/distinct-b.log" 2>&1 &
b=$!
sa=0; sb=0; wait "$a" || sa=$?; wait "$b" || sb=$?
test "$(( (sa == 0) + (sb == 0) ))" = 1
test "$(count)" = 2
printf 'PASS: same operation, competing operations on the last card\n'
