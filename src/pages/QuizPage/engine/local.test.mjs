import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seeded } from '../quiz.mjs'
import { itemById, isValuable } from '../items.mjs'
import { createLocalEngine } from './local.mjs'
import { createGuestEngine } from './guest.mjs'
import { drawRound, veilElapsed, veilSeed, verdictOf } from './rules.mjs'
import { findGuess } from '../quiz.mjs'

const memory = () => {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  }
}
const clock = (start = 1_000_000) => {
  let t = start
  return { now: () => t, add: (ms) => (t += ms) }
}
const KANTO = { from: 1, to: 151, hard: false }

test("the timing is the server's: 400 ms grace, slots by the veil left", () => {
  assert.equal(
    verdictOf(
      {
        answerId: 25,
        durationMs: 14000,
        gifts: ['a', 'b', 'c', 'd'],
        bonus: -1,
      },
      25,
      0
    ).slot,
    0
  )
  assert.equal(
    verdictOf(
      {
        answerId: 25,
        durationMs: 14000,
        gifts: ['a', 'b', 'c', 'd'],
        bonus: -1,
      },
      25,
      7000
    ).slot,
    1
  )
  assert.equal(
    verdictOf(
      {
        answerId: 25,
        durationMs: 14000,
        gifts: ['a', 'b', 'c', 'd'],
        bonus: -1,
      },
      25,
      9000
    ).slot,
    2
  )
  assert.equal(
    verdictOf(
      {
        answerId: 25,
        durationMs: 14000,
        gifts: ['a', 'b', 'c', 'd'],
        bonus: -1,
      },
      25,
      30000
    ).outcome,
    'time'
  )
  assert.equal(
    verdictOf(
      {
        answerId: 25,
        durationMs: 14000,
        gifts: ['a', 'b', 'c', 'd'],
        bonus: -1,
      },
      4,
      0
    ).outcome,
    'wrong'
  )
  // the page's "time up" (-2) is time, even inside the grace
  assert.equal(
    verdictOf(
      {
        answerId: 25,
        durationMs: 14000,
        gifts: ['a', 'b', 'c', 'd'],
        bonus: -1,
      },
      -2,
      14000
    ).outcome,
    'time'
  )
})

test('a drawn round: 4 options in range, the answer among them, not a recent one', () => {
  const recent = Array.from({ length: 30 }, (_, i) => i + 1)
  const round = drawRound(seeded(3), {
    from: 1,
    to: 40,
    hard: false,
    recent,
    lastVeil: 'warp',
  })
  assert.equal(round.options.length, 4)
  assert.ok(round.options.includes(round.answerId))
  // the last 10 answers are not drawn again: not as the answer, not as options
  assert.ok(round.answerId > 10)
  assert.ok(round.options.every((id) => id > 10))
  assert.ok(round.options.every((id) => id >= 1 && id <= 40))
  assert.notEqual(round.veil, 'warp')
  assert.equal(round.durationMs, 14000)
  assert.equal(round.gifts.length, 4)
})

test('no option is one of the last 10 answers: none of them can be crossed off', () => {
  const recent = Array.from({ length: 10 }, (_, i) => 650 + i)
  for (let seed = 1; seed <= 40; seed++) {
    const round = drawRound(seeded(seed), {
      from: 650,
      to: 721,
      hard: false,
      recent,
    })
    assert.ok(round.options.every((id) => !recent.includes(id)))
  }
})

const mine = (n) => Array.from({ length: n }, (_, i) => i + 1)
// the first draw says "from the collection" (0.1), the rest is seeded
const inside = (seed) => {
  const rest = seeded(seed)
  let first = true
  return () => (first ? ((first = false), 0.1) : rest())
}

test('a round asks about the collection about 70% of the time (10+ species)', () => {
  let hits = 0
  for (let seed = 1; seed <= 400; seed++) {
    const round = drawRound(seeded(seed), {
      from: 1,
      to: 151,
      hard: false,
      collection: mine(10),
    })
    if (round.answerId <= 10) hits++
  }
  assert.ok(hits / 400 > 0.62 && hits / 400 < 0.78, `share ${hits / 400}`)
})

test('the other options never include a last-10 answer, nor the answer twice', () => {
  const recent = mine(10)
  for (let seed = 1; seed <= 60; seed++) {
    const round = drawRound(seeded(seed), {
      from: 1,
      to: 151,
      hard: false,
      recent,
      collection: mine(10),
    })
    const others = round.options.filter((id) => id !== round.answerId)
    assert.equal(new Set(round.options).size, 4)
    assert.ok(round.options.includes(round.answerId))
    assert.ok(others.every((id) => !recent.includes(id)))
  }
})

test('local engine: the answer comes from the browser collection', async () => {
  const storage = memory()
  storage.setItem('pokedex:caught', JSON.stringify([3]))
  const engine = createLocalEngine({
    storage,
    now: clock().now,
    random: inside(1),
  })
  // 1 species: the share is 20%, and 0.1 asks for the collection
  assert.equal((await engine.start(KANTO)).answerId, 3)
})

test('local engine: a collection given by the caller is the one used', async () => {
  const engine = createLocalEngine({
    storage: memory(),
    now: clock().now,
    random: inside(2),
    collection: () => new Set(mine(10)),
  })
  assert.ok((await engine.start(KANTO)).answerId <= 10)
})

test('guest engine: picks from the collection too, with no rewards', async () => {
  const engine = createGuestEngine({
    random: inside(3),
    collection: () => mine(10),
  })
  const round = await engine.start(KANTO)
  assert.ok(round.answerId <= 10)
  assert.equal(engine.rewards, false)
  assert.deepEqual(round.gifts, [])
})

test('the veil starts where the clock is when the artwork shows', () => {
  // the round came 3 s into its clock; the artwork took 1.5 s more to load
  assert.equal(veilElapsed({ elapsedMs: 3000 }, 1000, 2500), 4500)
  assert.equal(veilElapsed({ elapsedMs: 3000 }, 1000, 900), 3000)
})

test('a round seeds its veil without its options (typed rounds have none)', () => {
  const seed = veilSeed({ id: '0b7e2d6a-3c1f', options: [] })
  assert.ok(Number.isInteger(seed) && seed > 0)
  assert.notEqual(seed, veilSeed({ id: '0b7e2d6a-3c1e', options: [] }))
})

test('start spends a turn; starting again resumes the same round', async () => {
  const storage = memory()
  const engine = createLocalEngine({
    storage,
    random: seeded(1),
    now: clock().now,
  })
  assert.equal((await engine.status()).left, 5)
  const round = await engine.start(KANTO)
  assert.equal((await engine.status()).left, 4)
  assert.equal((await engine.start(KANTO)).id, round.id)
  assert.equal((await engine.status()).left, 4)
  assert.equal((await engine.status()).pending.id, round.id)
})

test('right at once: the first gift in the bag; the round can not be answered twice', async () => {
  const storage = memory()
  const engine = createLocalEngine({
    storage,
    random: seeded(2),
    now: clock().now,
  })
  const round = await engine.start(KANTO)
  const verdict = await engine.answer(round, round.answerId)
  assert.equal(verdict.outcome, 'right')
  assert.equal(verdict.slot, 0)
  assert.equal(verdict.gift, round.gifts[0])
  assert.equal(JSON.parse(storage.getItem('pokedex:bag'))[round.gifts[0]], 1)
  assert.equal(verdict.status.streak, 1)
  await assert.rejects(engine.answer(round, round.answerId), /answered/)
})

test('the clock keeps running while away: a right answer 30 s later is too late', async () => {
  const time = clock()
  const engine = createLocalEngine({
    storage: memory(),
    random: seeded(4),
    now: time.now,
  })
  const round = await engine.start(KANTO)
  time.add(30000)
  const verdict = await engine.answer(round, round.answerId)
  assert.equal(verdict.outcome, 'time')
  assert.equal(verdict.gift, null)
})

test('five rounds, then no turns until the window ends', async () => {
  const time = clock()
  const engine = createLocalEngine({
    storage: memory(),
    random: seeded(5),
    now: time.now,
  })
  for (let i = 0; i < 5; i++) await engine.answer(await engine.start(KANTO), -1)
  await assert.rejects(engine.start(KANTO), /no_turns/)
  time.add(3 * 3600_000)
  assert.equal((await engine.status()).left, 5)
})

test('streak 4 and a right answer: a combo chest, the streak starts over', async () => {
  const storage = memory()
  storage.setItem('pokedex:quiz-streak', '4')
  const engine = createLocalEngine({
    storage,
    random: seeded(6),
    now: clock().now,
  })
  const round = await engine.start(KANTO)
  const verdict = await engine.answer(round, round.answerId)
  assert.equal(verdict.chests.length, 1)
  assert.equal(verdict.chests[0].kind, 'combo')
  assert.ok(verdict.chests[0].gifts.map(itemById).some(isValuable))
  assert.equal(verdict.status.streak, 0)
  assert.equal(verdict.status.records, 1)
})

test('a swap keeps the gifts and the bonus turn', async () => {
  const engine = createLocalEngine({
    storage: memory(),
    random: seeded(9),
    now: clock().now,
  })
  const round = await engine.start(KANTO)
  const swapped = await engine.reroll(round)
  assert.deepEqual(swapped.gifts, round.gifts)
  assert.equal(swapped.bonus, round.bonus)
})

test('three free swaps per window, then refused', async () => {
  const engine = createLocalEngine({
    storage: memory(),
    random: seeded(7),
    now: clock().now,
  })
  let round = await engine.start(KANTO)
  for (let i = 0; i < 3; i++) round = await engine.reroll(round)
  assert.equal((await engine.status()).left, 4)
  await assert.rejects(engine.reroll(round), /no_rerolls/)
})

test('the guest plays without rewards and never touches storage', async () => {
  const engine = createGuestEngine({ random: seeded(8), now: clock().now })
  assert.equal(engine.rewards, false)
  const round = await engine.start(KANTO)
  assert.deepEqual(round.gifts, [])
  const verdict = await engine.answer(round, round.answerId)
  assert.equal(verdict.outcome, 'right')
  assert.equal(verdict.gift, null)
  assert.deepEqual(verdict.chests, [])
})

test("the guest's swap is another Pokémon on a fresh clock", async () => {
  const time = clock()
  const engine = createGuestEngine({ random: seeded(10), now: time.now })
  const round = await engine.start(KANTO)
  time.add(5000)
  const swapped = await engine.reroll(round)
  assert.notEqual(swapped.id, round.id)
  assert.notEqual(swapped.answerId, round.answerId)
  const verdict = await engine.answer(swapped, swapped.answerId)
  assert.equal(verdict.outcome, 'right')
  assert.equal(verdict.slot, 0)
})

test('a typed name finds its Pokémon, whatever the punctuation', () => {
  const species = [
    { id: 25, name: 'pikachu' },
    { id: 122, name: 'mr-mime' },
  ]
  assert.equal(findGuess('mr mime', species), 122)
  assert.equal(findGuess('PIKACHU', species), 25)
  assert.equal(findGuess('raichu', species), -1)
})
