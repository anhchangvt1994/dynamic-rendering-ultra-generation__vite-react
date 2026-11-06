import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SHELF_STEP,
  SHELF_AUTO_PAGES,
  shelfFilter,
  shelfCounts,
  shelfWindow,
} from './shelfPaging.mjs'

const row = (speciesId, count, required, cardCount = 0) => ({
  speciesId,
  count,
  required,
  cardCount,
})
const rows = [row(25, 14, 7, 3), row(6, 9, 9, 2), row(1, 4, 5), row(10, 1, 3)]

test('a page of 12, then 12 more', () => {
  assert.equal(SHELF_STEP, 12)
  assert.deepEqual(shelfWindow({ total: 156, pages: 1 }), {
    shown: 12,
    next: 12,
    done: false,
    auto: true,
  })
  assert.deepEqual(shelfWindow({ total: 30, pages: 2 }), {
    shown: 24,
    next: 6,
    done: false,
    auto: true,
  })
  assert.deepEqual(shelfWindow({ total: 30, pages: 3 }), {
    shown: 30,
    next: 0,
    done: true,
    auto: false,
  })
  assert.deepEqual(shelfWindow({ total: 0, pages: 1 }), {
    shown: 0,
    next: 0,
    done: true,
    auto: false,
  })
})

test('scrolling loads on its own a few pages, then the button asks', () => {
  assert.equal(shelfWindow({ total: 156, pages: SHELF_AUTO_PAGES - 1 }).auto, true)
  // the bag's footer stays reachable: past the auto pages, one press each
  assert.equal(shelfWindow({ total: 156, pages: SHELF_AUTO_PAGES }).auto, false)
  assert.equal(shelfWindow({ total: 156, pages: SHELF_AUTO_PAGES }).done, false)
})

test('a bad page count never shows less than a page', () => {
  assert.equal(shelfWindow({ total: 156, pages: 0 }).shown, 12)
  assert.equal(shelfWindow({ total: 156, pages: Number.NaN }).shown, 12)
})

test('filters: ready to craft, amber stones made', () => {
  assert.deepEqual(shelfFilter(rows, 'all').map((r) => r.speciesId), [25, 6, 1, 10])
  assert.deepEqual(shelfFilter(rows, 'ready').map((r) => r.speciesId), [25, 6])
  assert.deepEqual(shelfFilter(rows, 'amber').map((r) => r.speciesId), [25, 6])
  assert.deepEqual(shelfFilter([row(3, 0, 5, 1)], 'ready'), [])
  assert.deepEqual(shelfFilter(rows, 'nope').length, 4)
})

test('counts per filter and stones in all', () => {
  assert.deepEqual(shelfCounts(rows), { all: 4, ready: 2, amber: 2, stones: 5 })
})
