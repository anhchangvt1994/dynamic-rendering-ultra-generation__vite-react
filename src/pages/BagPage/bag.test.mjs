import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ITEMS } from '../QuizPage/items.mjs'
import { POCKETS, bagRows, bagStats, pocketOf, rowCount } from './bag.mjs'

const bag = {
  'oran-berry': 5,
  'rare-candy': 2,
  protein: 1500,
  'tm-fire': 1,
  junk: 9,
  'fire-stone': 0,
}

test('a pocket lists what it holds, most valuable first', () => {
  const rows = bagRows(bag)
  assert.deepEqual(
    rows.map((r) => r.item.id),
    ['rare-candy', 'tm-fire', 'protein', 'oran-berry']
  )
  assert.deepEqual(
    bagRows(bag, { pocket: 'heal' }).map((r) => r.item.id),
    ['oran-berry']
  )
  assert.deepEqual(bagRows(bag, { pocket: 'evo' }), [])
})

test('sorting by count and by name', () => {
  assert.deepEqual(
    bagRows(bag, { sort: 'count' }).map((r) => r.count),
    [1500, 5, 2, 1]
  )
  const names = bagRows(bag, { sort: 'name' }).map((r) => r.item.name)
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b, 'en'))
  )
})

test('the full catalogue shows the missing ones too', () => {
  assert.equal(bagRows(bag, { missing: true }).length, ITEMS.length)
  assert.equal(
    bagRows({}, { missing: true, pocket: 'move' }).every((r) => r.count === 0),
    true
  )
})

test('the numbers: units, kinds, tiers, pockets; junk ignored', () => {
  const stats = bagStats(bag)
  assert.equal(stats.total, 1508)
  assert.equal(stats.kinds, 4)
  assert.equal(stats.catalogue, ITEMS.length)
  assert.equal(stats.tiers[4], 3)
  assert.equal(stats.valuable, 1503)
  assert.equal(stats.pockets.all, 1508)
  assert.equal(stats.pockets.stat, 1502)
  assert.equal(stats.pockets.move, 1)
  assert.deepEqual(bagStats(null).total, 0)
})

test('row counts stay readable and bounded', () => {
  assert.deepEqual([0, 7, 1500, 99999, 100000, 1e7].map(rowCount), [
    '0',
    '7',
    '1.500',
    '99.999',
    '99.999+',
    '99.999+',
  ])
  assert.equal(pocketOf('nope'), POCKETS[0])
})
