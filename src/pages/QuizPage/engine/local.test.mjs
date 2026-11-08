import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seeded } from '../quiz.mjs'
import { itemById, isValuable } from '../items.mjs'
import { createLocalEngine, KEYS } from './local.mjs'
import { createGuestEngine } from './guest.mjs'
import { drawRound, veilElapsed, veilSeed, verdictOf } from './rules.mjs'
import { findGuess } from '../quiz.mjs'
import { createShardJournal, SHARD_KEY } from '../shards/local.mjs'

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
  assert.equal((await engine.status()).left, 10)
  const round = await engine.start(KANTO)
  assert.equal((await engine.status()).left, 9)
  assert.equal((await engine.start(KANTO)).id, round.id)
  assert.equal((await engine.status()).left, 9)
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

test('ten rounds, then no turns until the window ends', async () => {
  const time = clock()
  const engine = createLocalEngine({
    storage: memory(),
    random: seeded(5),
    now: time.now,
  })
  for (let i = 0; i < 10; i++)
    await engine.answer(await engine.start(KANTO), -1)
  await assert.rejects(engine.start(KANTO), /no_turns/)
  time.add(3 * 3600_000)
  assert.equal((await engine.status()).left, 10)
})

test('chest journal persistence failure keeps the pending round for retry', async () => {
  const storage = memory()
  storage.setItem(KEYS.streak, '4')
  const engine = createLocalEngine({
    storage,
    random: seeded(6),
    now: clock().now,
    shards: {
      recordLocalOutcome: async () => ({}),
      recordLocalChestRewards: async () => {
        throw Error('quota')
      },
    },
  })
  const round = await engine.start(KANTO)
  await assert.rejects(engine.answer(round, round.answerId), /quota/)
  assert.equal(JSON.parse(storage.getItem(KEYS.round)).id, round.id)
})

test('streak 4 and a right answer: a combo chest, the streak starts over', async () => {
  const storage = memory()
  storage.setItem('pokedex:quiz-streak', '4')
  const engine = createLocalEngine({
    storage,
    random: seeded(6),
    shards: createShardJournal({ storage, lock: (_, fn) => fn() }),
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
  assert.equal((await engine.status()).left, 9)
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

const lockless = () => {
  let tail = Promise.resolve()
  return (name, fn) => {
    const run = tail.then(fn)
    tail = run.catch(() => {})
    return run
  }
}
const shardedEngine = (storage, shardRandom, extra = {}) =>
  createLocalEngine({
    storage,
    random: seeded(2),
    now: clock().now,
    shardRandom,
    shards: createShardJournal({
      storage,
      lock: lockless(),
      catalog: async () => undefined,
    }),
    ...extra,
  })

test('shards: a round carries the feature versions and a roll from its own RNG', async () => {
  const storage = memory()
  const round = await shardedEngine(storage, () => 0.37).start(KANTO)
  const stored = JSON.parse(storage.getItem('pokedex:quiz-round'))
  assert.equal(stored.shardRuleVersion, 2)
  assert.equal(stored.shardCatalogVersion, 1)
  assert.equal(stored.shardRoll, 0.37)
  assert.equal(round.id, stored.id)
})
test('shards: the shard roll never changes the draw, the gifts or the bag', async () => {
  const run = async (roll) => {
    const storage = memory()
    const engine = shardedEngine(storage, () => roll)
    const round = await engine.start(KANTO)
    const verdict = await engine.answer(round, round.answerId)
    return {
      round: { ...round, id: 0, shardRoll: 0, chestEntropy: [] },
      gift: verdict.gift,
      chests: verdict.chests,
      bag: storage.getItem('pokedex:bag'),
    }
  }
  assert.deepEqual(await run(0.01), await run(0.99))
})
test('shards: a right answer is journaled pending before the round is dropped; wrong is ineligible', async () => {
  const storage = memory()
  const engine = shardedEngine(storage, () => 0.2)
  const round = await engine.start(KANTO)
  const verdict = await engine.answer(round, round.answerId)
  assert.equal(verdict.shard.state, 'pending')
  assert.equal(
    JSON.parse(storage.getItem(SHARD_KEY)).events[round.id].roll,
    0.2
  )
  const other = shardedEngine(memory(), () => 0.2)
  const second = await other.start(KANTO)
  const wrong = await other.answer(
    second,
    second.options.find((o) => o !== second.answerId)
  )
  assert.equal(wrong.shard.state, 'ineligible')
})
test('shards: the journal is written while the round is still stored', async () => {
  const storage = memory()
  let seen
  const engine = shardedEngine(storage, () => 0.2, {
    shards: {
      recordLocalOutcome: async (round) => {
        seen = storage.getItem('pokedex:quiz-round')
        return { roundId: round.id, state: 'pending' }
      },
    },
  })
  const round = await engine.start(KANTO)
  await engine.answer(round, round.answerId)
  assert.ok(seen && JSON.parse(seen).id === round.id)
})
test('shards: a journal that fails never takes the original gift away', async () => {
  const storage = memory()
  const engine = shardedEngine(storage, () => 0.2, {
    shards: {
      recordLocalOutcome: async () => {
        throw new Error('full')
      },
    },
  })
  const round = await engine.start(KANTO)
  const verdict = await engine.answer(round, round.answerId)
  assert.equal(verdict.outcome, 'right')
  assert.equal(JSON.parse(storage.getItem('pokedex:bag'))[verdict.gift], 1)
  assert.equal(verdict.shard.state, 'unavailable')
})
test("shards: a swap keeps the round's roll; the guest never writes the journal", async () => {
  const storage = memory()
  const engine = shardedEngine(
    storage,
    (() => {
      let n = 0
      return () => [0.11, 0.99][n++ % 2]
    })()
  )
  const round = await engine.start(KANTO)
  const again = await engine.reroll(round)
  assert.equal(
    JSON.parse(storage.getItem('pokedex:quiz-round')).shardRoll,
    0.11
  )
  assert.ok(again.id)
  const guestStorage = memory()
  const guest = createGuestEngine({ random: seeded(3), collection: () => [] })
  const g = await guest.start(KANTO)
  await guest.answer(g, g.answerId)
  assert.equal(guestStorage.getItem(SHARD_KEY), null)
  assert.equal(storage.getItem('pokedex:quiz-shards-v1'), null)
})

test('shards: two answers in flight reward once', async () => {
  const storage = memory()
  const engine = shardedEngine(storage, () => 0.2)
  const round = await engine.start(KANTO)
  const results = await Promise.allSettled([
    engine.answer(round, round.answerId),
    engine.answer(round, round.answerId),
  ])
  assert.deepEqual(results.map((r) => r.status).sort(), [
    'fulfilled',
    'rejected',
  ])
  assert.equal(
    Object.values(JSON.parse(storage.getItem('pokedex:bag'))).reduce(
      (a, b) => a + b,
      0
    ),
    1
  )
})

test('chests: two answers in flight on a combo round award the chest once', async () => {
  const storage = memory()
  storage.setItem(KEYS.streak, '4')
  const engine = shardedEngine(storage, () => 0.2)
  const round = await engine.start(KANTO)
  const results = await Promise.allSettled([
    engine.answer(round, round.answerId),
    engine.answer(round, round.answerId),
  ])
  assert.deepEqual(results.map((r) => r.status).sort(), [
    'fulfilled',
    'rejected',
  ])
  const won = results.find((r) => r.status === 'fulfilled').value
  const total = Object.values(
    JSON.parse(storage.getItem('pokedex:bag'))
  ).reduce((a, b) => a + b, 0)
  assert.equal(total, 1 + won.chests[0].gifts.length)
  assert.equal(Number(storage.getItem(KEYS.records)), 1)
})

test('unopened chests survive a reload until opened', async () => {
  const storage = memory()
  storage.setItem(KEYS.streak, '4')
  storage.setItem(KEYS.records, '9')
  const options = () => ({
    storage,
    random: seeded(6),
    shards: createShardJournal({ storage, lock: (_, fn) => fn() }),
    now: clock().now,
  })
  const engine = createLocalEngine(options())
  const round = await engine.start(KANTO)
  const verdict = await engine.answer(round, round.answerId)
  const bag = storage.getItem(KEYS.bag)
  // a reload: a new engine on the same storage
  const again = createLocalEngine(options())
  const { chests } = await again.status()
  assert.deepEqual(
    chests.map((chest) => [chest.kind, chest.round, chest.roundId]),
    [
      ['combo', round.id, round.id],
      ['special', round.id, round.id],
    ]
  )
  assert.deepEqual(
    chests.map((chest) => chest.gifts),
    verdict.chests.map((chest) => chest.gifts)
  )
  await again.openChests(round.id)
  assert.deepEqual((await again.status()).chests, [])
  await again.openChests(round.id)
  assert.equal(storage.getItem(KEYS.bag), bag, 'opening pays nothing twice')
})

test('a wrong answer leaves no chest to open', async () => {
  const storage = memory()
  const engine = createLocalEngine({
    storage,
    random: seeded(6),
    now: clock().now,
  })
  const round = await engine.start(KANTO)
  const wrong = round.options.find((id) => id !== round.answerId)
  await engine.answer(round, wrong)
  assert.deepEqual((await engine.status()).chests, [])
})

test('guest engine: never a chest to open', async () => {
  const engine = createGuestEngine({ random: seeded(1), collection: () => [] })
  assert.deepEqual((await engine.status()).chests, [])
  await engine.openChests('any')
})
