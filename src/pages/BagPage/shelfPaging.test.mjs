import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SHELF_STEP,
  SHELF_AUTO_PAGES,
  shelfFilter,
  shelfCounts,
  shelfWindow,
  shelfRenderWindow,
  shelfRowPitch,
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
  assert.equal(
    shelfWindow({ total: 156, pages: SHELF_AUTO_PAGES - 1 }).auto,
    true
  )
  // the bag's footer stays reachable: past the auto pages, one press each
  assert.equal(shelfWindow({ total: 156, pages: SHELF_AUTO_PAGES }).auto, false)
  assert.equal(shelfWindow({ total: 156, pages: SHELF_AUTO_PAGES }).done, false)
})

test('a bad page count never shows less than a page', () => {
  assert.equal(shelfWindow({ total: 156, pages: 0 }).shown, 12)
  assert.equal(shelfWindow({ total: 156, pages: Number.NaN }).shown, 12)
})

test('windowed shelf returns only visible indexes plus overscan and spacer extents', () => {
  assert.deepEqual(
    shelfRenderWindow({
      total: 100,
      columns: 3,
      rowHeight: 420,
      scrollTop: 5000,
      viewportHeight: 800,
      overscan: 1,
    }),
    { start: 30, end: 45, top: 4200, bottom: 7980 }
  )
})

test('windowed shelf overscans farther in the scroll direction', () => {
  assert.deepEqual(
    shelfRenderWindow({
      total: 100,
      columns: 3,
      rowHeight: 454,
      scrollTop: 5000,
      viewportHeight: 800,
      overscan: 1,
      direction: 'down',
      directionalOverscan: 3,
    }),
    { start: 30, end: 51, top: 4540, bottom: 7718 }
  )
  assert.deepEqual(
    shelfRenderWindow({
      total: 100,
      columns: 3,
      rowHeight: 454,
      scrollTop: 5000,
      viewportHeight: 800,
      overscan: 1,
      direction: 'up',
      directionalOverscan: 3,
    }),
    { start: 21, end: 42, top: 3178, bottom: 9080 }
  )
})

test('windowed shelf clamps at both ends and handles empty results', () => {
  assert.deepEqual(
    shelfRenderWindow({
      total: 20,
      columns: 2,
      rowHeight: 300,
      scrollTop: 0,
      viewportHeight: 600,
      overscan: 2,
    }),
    { start: 0, end: 8, top: 0, bottom: 1800 }
  )
  assert.deepEqual(
    shelfRenderWindow({
      total: 0,
      columns: 1,
      rowHeight: 300,
      scrollTop: 0,
      viewportHeight: 600,
    }),
    { start: 0, end: 0, top: 0, bottom: 0 }
  )
})

test('filters: ready to craft, amber stones made', () => {
  assert.deepEqual(
    shelfFilter(rows, 'all').map((r) => r.speciesId),
    [25, 6, 1, 10]
  )
  assert.deepEqual(
    shelfFilter(rows, 'ready').map((r) => r.speciesId),
    [25, 6]
  )
  assert.deepEqual(
    shelfFilter(rows, 'amber').map((r) => r.speciesId),
    [25, 6]
  )
  assert.deepEqual(shelfFilter([row(3, 0, 5, 1)], 'ready'), [])
  assert.deepEqual(shelfFilter(rows, 'nope').length, 4)
})

test('counts per filter and stones in all', () => {
  assert.deepEqual(shelfCounts(rows), { all: 4, ready: 2, amber: 2, stones: 5 })
})

test('row pitch is the measured row height plus the gap, never a guess', () => {
  assert.equal(shelfRowPitch({ heights: [457, 457, 457], gap: 62 }), 519)
  assert.equal(shelfRowPitch({ heights: [457, 480, 457], gap: 62 }), 527)
  assert.equal(shelfRowPitch({ heights: [], gap: 62, fallback: 454 }), 454)
  assert.equal(
    shelfRowPitch({ heights: [0, Number.NaN], gap: 62, fallback: 454 }),
    454
  )
  assert.equal(shelfRowPitch({ heights: [400], gap: Number.NaN }), 400)
})
