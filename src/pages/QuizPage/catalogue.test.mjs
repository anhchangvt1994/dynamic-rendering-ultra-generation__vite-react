import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { ITEMS } from './items.mjs'
import { GENERATIONS } from '../HomePage/catalog.mjs'
import { FREEZE_MS, TIME_CHARGES, TIME_WINDOW_MS } from './engine/rules.mjs'
import { COMBO_AT } from './progress.mjs'

const MIGRATION = new URL(
  '../../../supabase/migrations/20261101000000_quiz_game.sql',
  import.meta.url
)
const TIME_MIGRATION = new URL(
  '../../../supabase/migrations/20261102000000_quiz_time.sql',
  import.meta.url
)

const MIGRATIONS = new URL('../../../supabase/migrations/', import.meta.url)

/** Every quiz_items insert of every migration, in migration order. */
const catalogueRows = () =>
  readdirSync(MIGRATIONS)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .flatMap((file) => {
      const sql = readFileSync(new URL(file, MIGRATIONS), 'utf8')
      return [
        ...sql.matchAll(
          /insert into public\.quiz_items \(id, tier, hard, rank\) values([\s\S]*?);/g
        ),
      ].flatMap((block) =>
        [
          ...block[1].matchAll(
            /\('([a-z0-9-]+)', (\d), (true|false), (\d+)\)/g
          ),
        ].map(([, id, tier, hard, rank]) => [
          id,
          Number(tier),
          hard === 'true',
          Number(rank),
        ])
      )
    })

test('the database catalogue is the items.mjs catalogue, in its order', () => {
  const rows = catalogueRows()
  assert.ok(rows.length > 0, 'the migrations seed public.quiz_items')
  assert.deepEqual(
    rows,
    ITEMS.map((item, rank) => [item.id, item.tier, Boolean(item.hard), rank])
  )
})

test('every item an evolution needs is in the catalogue', () => {
  const sql = readFileSync(
    new URL('../../../supabase/seed/pokemon_evolution_v1.sql', import.meta.url),
    'utf8'
  )
  const needed = new Set(
    [
      ...sql.matchAll(/^  \(\d+, \d+, \d+, '[a-z-]+', [^,]+, '([a-z0-9-]+)'/gm),
    ].map((m) => m[1])
  )
  assert.ok(needed.size > 20, 'the seed has item evolutions')
  const known = new Set(ITEMS.map((item) => item.id))
  for (const id of needed) assert.ok(known.has(id), `${id} is not in ITEMS`)
})

test('the database plays the ranges the page offers: all, or a generation', () => {
  const sql = readFileSync(MIGRATION, 'utf8')
  const block = sql.match(/\(p_from, p_to\) not in \(([\s\S]*?)\) then/)
  assert.ok(block, 'quiz_start checks the range')
  const ranges = [...block[1].matchAll(/\((\d+), (\d+)\)/g)].map(
    ([, from, to]) => [Number(from), Number(to)]
  )
  assert.deepEqual(ranges, [
    [1, 1025],
    ...GENERATIONS.map((gen) => [gen.start, gen.end]),
  ])
})

test('the Roar of Time keeps the numbers of its migration', () => {
  const sql = readFileSync(TIME_MIGRATION, 'utf8')
  assert.match(sql, /least\((\d+), greatest/)
  assert.equal(Number(sql.match(/least\((\d+), greatest/)[1]), FREEZE_MS)
  const hours = [...sql.matchAll(/time_start \+ interval '(\d+) hours'/g)]
  assert.ok(hours.length > 0)
  for (const [, h] of hours) assert.equal(Number(h) * 3600000, TIME_WINDOW_MS)
  for (const [, n] of sql.matchAll(/'time_left', (\d+) - v_player\.time_used/g))
    assert.equal(Number(n), TIME_CHARGES)
  for (const [, n] of sql.matchAll(/v_player\.time_used >= (\d+)/g))
    assert.equal(Number(n), TIME_CHARGES)
})

test("the streak's chest comes at COMBO_AT, as in the latest quiz_answer", () => {
  const sql = readFileSync(TIME_MIGRATION, 'utf8')
  const combo = sql.match(/if v_streak >= (\d+) then/)
  assert.ok(combo, 'the latest quiz_answer pays the streak chest')
  assert.equal(Number(combo[1]), COMBO_AT)
})

test("Palkia's odds and letters are its migration's", async () => {
  const { HINT_ODDS, PALKIA_ODDS } = await import('./engine/rules.mjs')
  const { LETTERS } = await import('./engine/letters.mjs')
  const sql = readFileSync(
    new URL(
      '../../../supabase/migrations/20261103000000_quiz_palkia.sql',
      import.meta.url
    ),
    'utf8'
  )
  assert.equal(
    Number(sql.match(/random\(\) >= ([\d.]+) then null/)[1]),
    PALKIA_ODDS
  )
  assert.equal(
    Number(sql.match(/random\(\) < ([\d.]+) then substr/)[1]),
    HINT_ODDS
  )
  assert.equal(sql.match(/'([A-Z]{1025})'/)[1], LETTERS)
})
