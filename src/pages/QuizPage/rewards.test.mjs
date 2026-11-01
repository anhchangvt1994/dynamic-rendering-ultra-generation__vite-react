import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seeded } from './quiz.mjs'
import {
  ITEMS,
  SLOT_AT,
  byValue,
  comboGifts,
  isValuable,
  itemById,
  roundGifts,
  slotFor,
  specialGifts,
} from './items.mjs'
import {
  COMBO_AT,
  TURNS,
  WINDOW_MS,
  addToBag,
  addWin,
  badgeCount,
  fullCount,
  bagSize,
  currentTurns,
  giveTurn,
  readCount,
  readJSON,
  recordWin,
  refillAt,
  saveJSON,
  spendTurn,
  turnsLeft,
} from './progress.mjs'

const runs = (fn, n = 300) =>
  Array.from({ length: n }, (_, i) => fn(seeded(i + 1)))

test('every item is complete and listed once', () => {
  const ids = new Set()
  for (const item of ITEMS) {
    assert.ok(!ids.has(item.id), item.id)
    ids.add(item.id)
    assert.ok(item.name && item.effect && item.stats.length, item.id)
    assert.ok([1, 2, 3, 4].includes(item.tier), item.id)
  }
})

test('the catalogue never ranks a lower tier above a higher one', () => {
  for (let i = 1; i < ITEMS.length; i++)
    assert.ok(ITEMS[i - 1].tier >= ITEMS[i].tier, ITEMS[i].id)
})

test('the fuse: earlier means a better gift, nothing once it is out', () => {
  assert.equal(slotFor(1), 0)
  assert.equal(slotFor(0.76), 0)
  assert.equal(slotFor(0.75), 1)
  assert.equal(slotFor(0.3), 2)
  assert.equal(slotFor(0.01), 3)
  assert.equal(slotFor(0), -1)
  assert.equal(SLOT_AT.length, 4)
})

test('a round offers four distinct gifts, most valuable first', () => {
  for (const { gifts, bonus } of runs((r) => roundGifts(r))) {
    assert.equal(gifts.length, 4)
    assert.equal(new Set(gifts).size, 4)
    const items = gifts.map(itemById)
    assert.deepEqual([...items].sort(byValue), items)
    assert.ok(bonus >= -1 && bonus < 4)
  }
})

test('TM and HM only in hard mode, and they do show up there', () => {
  const easy = runs((r) => roundGifts(r).gifts).flat()
  assert.ok(easy.every((id) => !itemById(id).hard))
  const hard = runs((r) => roundGifts(r, { hard: true }).gifts).flat()
  assert.ok(hard.some((id) => itemById(id).hard))
})

test('some rounds hide a bonus turn, most do not', () => {
  const bonuses = runs((r) => roundGifts(r).bonus).filter((b) => b >= 0)
  assert.ok(bonuses.length > 30 && bonuses.length < 130, `${bonuses.length}`)
})

test('chests: a combo is 3–5 gifts with a rare one, the special 10 with 3', () => {
  for (const gifts of runs(comboGifts)) {
    assert.ok(gifts.length >= 3 && gifts.length <= 5)
    assert.ok(gifts.map(itemById).filter(isValuable).length >= 1)
    assert.ok(gifts.every((id) => !itemById(id).hard))
  }
  for (const gifts of runs(specialGifts)) {
    assert.equal(gifts.length, 10)
    assert.ok(gifts.map(itemById).filter(isValuable).length >= 3)
  }
})

test('five turns per window, the window starts with the first round', () => {
  const t0 = 1_000_000
  let turns = currentTurns(undefined, t0)
  assert.equal(turnsLeft(turns), TURNS)
  assert.equal(refillAt(turns), 0)
  for (let i = 0; i < TURNS; i++) turns = spendTurn(turns, t0 + i * 1000)
  assert.equal(turnsLeft(turns), 0)
  assert.equal(refillAt(turns), t0 + WINDOW_MS)
  // nothing to spend: no change
  assert.deepEqual(spendTurn(turns, t0 + 9000), turns)
  // still locked a second before the end, all back at the end
  assert.equal(turnsLeft(currentTurns(turns, t0 + WINDOW_MS - 1000)), 0)
  assert.equal(turnsLeft(currentTurns(turns, t0 + WINDOW_MS)), TURNS)
})

test('a bonus turn gives one back, never above five', () => {
  let turns = spendTurn(currentTurns(undefined, 0), 1)
  turns = giveTurn(turns)
  assert.equal(turnsLeft(turns), TURNS)
  assert.equal(turnsLeft(giveTurn(turns)), TURNS)
  turns = spendTurn(spendTurn(turns, 2), 3)
  assert.equal(turnsLeft(giveTurn(turns)), TURNS - 1)
})

test('streak 5 pays a chest and starts over; 10 records pay the special', () => {
  assert.equal(COMBO_AT, 5)
  assert.deepEqual(addWin({ streak: 2, records: 0 }), {
    streak: 3,
    records: 0,
    combo: false,
    special: false,
  })
  assert.deepEqual(addWin({ streak: 4, records: 2 }), {
    streak: 0,
    records: 3,
    combo: true,
    special: false,
  })
  assert.deepEqual(addWin({ streak: 4, records: 9 }), {
    streak: 0,
    records: 0,
    combo: true,
    special: true,
  })
})

test('the bag counts, storage never throws', () => {
  const bag = addToBag(addToBag({}, ['rare-candy']), ['rare-candy', 'protein'])
  assert.deepEqual(bag, { 'rare-candy': 2, protein: 1 })
  assert.equal(bagSize(bag), 3)
  const broken = {
    getItem() {
      throw new Error('denied')
    },
    setItem() {
      throw new Error('denied')
    },
  }
  assert.deepEqual(readJSON('x', {}, broken), {})
  assert.equal(readCount('x', broken), 0)
  saveJSON('x', 1, broken)
  let value = null
  const storage = { getItem: () => value, setItem: (_k, v) => (value = v) }
  saveJSON('x', { a: 1 }, storage)
  assert.deepEqual(readJSON('x', {}, storage), { a: 1 })
})

test('the window keeps what it paid, and starts over with it', () => {
  let turns = spendTurn(currentTurns(undefined, 0), 1)
  turns = recordWin(recordWin(turns, 'rare-candy'), 'protein')
  assert.equal(turns.wins, 2)
  assert.deepEqual(turns.gifts, ['rare-candy', 'protein'])
  const fresh = currentTurns(turns, WINDOW_MS + 1)
  assert.equal(fresh.wins, 0)
  assert.deepEqual(fresh.gifts, [])
})

test('counts stay small on badges and readable in full', () => {
  assert.deepEqual([0, 9, 99, 100, 999, 1000, 12345, -3].map(badgeCount), [
    '0',
    '9',
    '99',
    '100',
    '999',
    '999+',
    '999+',
    '0',
  ])
  assert.equal(fullCount(1234), '1.234')
  assert.equal(fullCount(1000000), '1.000.000')
  assert.equal(fullCount(7), '7')
})

test('legendary is earned: rare in a round, a little less rare in a streak chest, likeliest in the special one', () => {
  const N = 3000
  const share = (lists) => {
    const all = lists.flat().map(itemById)
    return {
      legendary: all.filter((item) => item.tier === 4).length / all.length,
      valuable: all.filter(isValuable).length / all.length,
    }
  }
  const round = share(runs((r) => roundGifts(r).gifts, N))
  const best = share(runs((r) => roundGifts(r).gifts.slice(0, 1), N))
  const combo = share(runs(comboGifts, N))
  const special = share(runs(specialGifts, N))
  // a round's earliest gift: legendary under 1 in 15
  assert.ok(best.legendary < 1 / 15, `best ${best.legendary}`)
  assert.ok(round.legendary < 0.03, `round ${round.legendary}`)
  assert.ok(combo.legendary < 0.06, `combo ${combo.legendary}`)
  assert.ok(
    special.legendary > combo.legendary * 3,
    `special ${special.legendary}`
  )
  assert.ok(special.legendary > best.legendary, 'special beats a round')
  assert.ok(special.valuable > combo.valuable, 'special has more rare items')
})
