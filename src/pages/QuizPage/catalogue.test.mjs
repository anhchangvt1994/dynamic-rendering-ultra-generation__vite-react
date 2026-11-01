import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { ITEMS } from './items.mjs'
import { GENERATIONS } from '../HomePage/catalog.mjs'

const MIGRATION = new URL(
  '../../../supabase/migrations/20261101000000_quiz_game.sql',
  import.meta.url
)

test('the database catalogue is the items.mjs catalogue, in its order', () => {
  const sql = readFileSync(MIGRATION, 'utf8')
  const block = sql.match(
    /insert into public\.quiz_items \(id, tier, hard, rank\) values([\s\S]*?);/
  )
  assert.ok(block, 'the migration seeds public.quiz_items')
  const rows = [
    ...block[1].matchAll(/\('([a-z0-9-]+)', (\d), (true|false), (\d+)\)/g),
  ].map(([, id, tier, hard, rank]) => [
    id,
    Number(tier),
    hard === 'true',
    Number(rank),
  ])
  assert.deepEqual(
    rows,
    ITEMS.map((item, rank) => [item.id, item.tier, Boolean(item.hard), rank])
  )
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
