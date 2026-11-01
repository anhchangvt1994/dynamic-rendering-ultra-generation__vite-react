// The Roar of Time: a round's clock stopped for 30 s, the 10 charges
// (the same numbers as supabase/tests/database/quiz_time.test.sql)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FREEZE_MS,
  TIME_CHARGES,
  TIME_WINDOW_MS,
  silhouetteLit,
  freezeLeft,
  roundClock,
  spendTime,
  timeLeft,
  timeRefillAt,
  timeState,
  veilScale,
  verdictOf,
} from './rules.mjs'

const ROUND = {
  answerId: 25,
  durationMs: 14000,
  gifts: ['a', 'b', 'c', 'd'],
  bonus: -1,
}

test('the numbers: 30 s stops, 10 charges, full again after 1 hour', () => {
  assert.equal(FREEZE_MS, 30000)
  assert.equal(TIME_CHARGES, 10)
  assert.equal(TIME_WINDOW_MS, 60 * 60 * 1000)
})

test("a round's clock leaves out its 30 s stop", () => {
  assert.equal(roundClock(5000, null), 5000)
  assert.equal(roundClock(10000, 3000), 3000)
  assert.equal(roundClock(33000, 3000), 3000)
  assert.equal(roundClock(40000, 3000), 10000)
  assert.equal(roundClock(2000, 3000), 2000)
})

test('the freeze still to run', () => {
  assert.equal(freezeLeft(10000, 3000), 23000)
  assert.equal(freezeLeft(40000, 3000), 0)
  assert.equal(freezeLeft(5000, null), 0)
  assert.equal(freezeLeft(3000, 3000), FREEZE_MS)
})

test('stopped at 3 s and answered 40 s after the start: the last gift, not too late', () => {
  const stopped = verdictOf(ROUND, 25, roundClock(40000, 3000))
  assert.equal(stopped.outcome, 'right')
  assert.equal(stopped.slot, 3)
  assert.equal(verdictOf(ROUND, 25, roundClock(40000, null)).outcome, 'time')
  assert.equal(verdictOf(ROUND, 25, roundClock(30000, 3000)).slot, 0)
})

test('the veil drops to a fifth over a second once time is stopped', () => {
  assert.equal(veilScale(null), 1)
  assert.equal(veilScale(0), 1)
  assert.equal(veilScale(1000), 0.2)
  assert.equal(veilScale(60000), 0.2)
  const part = veilScale(500)
  assert.ok(part < 1 && part > 0.2)
})

test('the silhouette lights up to 35 % over the same second', () => {
  assert.equal(silhouetteLit(null), 0)
  assert.equal(silhouetteLit(0), 0)
  assert.equal(silhouetteLit(1000), 0.35)
  assert.equal(silhouetteLit(60000), 0.35)
  const part = silhouetteLit(500)
  assert.ok(part > 0 && part < 0.35)
})

test('10 charges; the window starts with the first use and refills 1 hour later', () => {
  let state = timeState({}, 1000)
  assert.equal(timeLeft(state), 10)
  assert.equal(timeRefillAt(state), 0)
  state = spendTime(state, 1000)
  state = spendTime(state, 5000)
  assert.equal(timeLeft(state), 8)
  assert.equal(timeRefillAt(state), 1000 + TIME_WINDOW_MS)
  assert.equal(timeLeft(timeState(state, 1000 + TIME_WINDOW_MS - 1)), 8)
  assert.deepEqual(timeState(state, 1000 + TIME_WINDOW_MS), {
    start: 0,
    used: 0,
  })
})

// --- the engines -------------------------------------------------------------
import { createServerEngine } from './server.ts'
import { createLocalEngine, KEYS } from './local.mjs'
import { createGuestEngine } from './guest.mjs'

const SERVER_ROUND = {
  id: 'r-1',
  options: [25, 4, 7, 1],
  veil: 'torch',
  hard: false,
  gifts: ['protein', 'oran-berry', 'fresh-water', 'cheri-berry'],
  bonus: 2,
  duration_ms: 14000,
  started_at: '2026-11-01T10:00:00.000Z',
  frozen_at: '2026-11-01T10:00:03.000Z',
  now: '2026-11-01T10:00:10.000Z',
}
const SERVER_STATUS = {
  left: 0,
  refill_at: '2026-11-01T13:00:00.000Z',
  used: 5,
  bonus: 0,
  wins: 0,
  window_gifts: [],
  streak: 3,
  records: 1,
  records_total: 2,
  rerolls_left: 3,
  time_left: 4,
  time_refill_at: '2026-11-01T12:00:00.000Z',
  pending: null,
}
const client = (replies) => {
  const calls = []
  return {
    calls,
    rpc: async (name, args) => {
      calls.push([name, args])
      return { data: replies[name], error: null }
    },
  }
}

test("the server's stopped round: its clock without the stop, the stop still to run", async () => {
  const supabase = client({ quiz_time_stop: SERVER_ROUND })
  const round = await createServerEngine(supabase).timeStop({ id: 'r-1' })
  assert.deepEqual(supabase.calls, [['quiz_time_stop', { p_round: 'r-1' }]])
  assert.equal(round.frozenAtMs, 3000)
  assert.equal(round.elapsedMs, 3000)
  assert.equal(round.freezeLeftMs, 23000)
})

test("the server's refill and charges", async () => {
  const supabase = client({
    quiz_time_refill: { ...SERVER_STATUS, left: 5 },
    quiz_status: {
      ...SERVER_STATUS,
      time_left: undefined,
      time_refill_at: null,
    },
  })
  const engine = createServerEngine(supabase)
  const status = await engine.timeRefill()
  assert.equal(status.left, 5)
  assert.equal(status.timeLeft, 4)
  assert.equal(status.timeRefillAt, Date.parse('2026-11-01T12:00:00.000Z'))
  const plain = await engine.status()
  assert.equal(plain.timeLeft, 0)
  assert.equal(plain.timeRefillAt, 0)
})

test('a server verdict carries the charges', async () => {
  const supabase = client({
    quiz_answer: { ...SERVER_STATUS, outcome: 'right', answer_id: 25, slot: 0 },
  })
  const verdict = await createServerEngine(supabase).answer({ id: 'r-1' }, 25)
  assert.equal(verdict.status.timeLeft, 4)
})

const memory = () => {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  }
}
const KANTO = { from: 1, to: 151, hard: false }
const local = (storage, t) =>
  createLocalEngine({ storage, now: () => t.now, random: Math.random })
const noLuck = (storage) => {
  const round = JSON.parse(storage.getItem(KEYS.round))
  storage.setItem(KEYS.round, JSON.stringify({ ...round, bonus: -1 }))
}

test('local: 10 stops, then none until 1 hour after the first', async () => {
  const storage = memory()
  const t = { now: 1_000_000 }
  const engine = local(storage, t)
  for (let i = 0; i < 10; i++) {
    storage.setItem(KEYS.turns, '{}')
    const round = await engine.start(KANTO)
    await engine.timeStop(round)
    noLuck(storage)
    await engine.answer(round, round.answerId)
    t.now += 1000
  }
  assert.equal((await engine.status()).timeLeft, 0)
  assert.equal((await engine.status()).timeRefillAt, 1_000_000 + TIME_WINDOW_MS)
  storage.setItem(KEYS.turns, '{}')
  const round = await engine.start(KANTO)
  await assert.rejects(engine.timeStop(round), /no_time/)
  t.now = 1_000_000 + TIME_WINDOW_MS
  assert.equal((await engine.status()).timeLeft, 10)
})

test('local: one stop per round, none once the round is over', async () => {
  const t = { now: 1_000_000 }
  const engine = local(memory(), t)
  const round = await engine.start(KANTO)
  await engine.timeStop(round)
  await assert.rejects(engine.timeStop(round), /time_used/)
  await engine.answer(round, round.answerId)
  const late = await engine.start(KANTO)
  t.now += 14000
  await assert.rejects(engine.timeStop(late), /time_over/)
  await assert.rejects(engine.timeStop({ id: 'nope' }), /no_round/)
})

test('local: stopped at 3 s, answered 40 s after the start: the last gift', async () => {
  const t = { now: 1_000_000 }
  const engine = local(memory(), t)
  const round = await engine.start(KANTO)
  t.now += 3000
  const stopped = await engine.timeStop(round)
  assert.equal(stopped.frozenAtMs, 3000)
  assert.equal(stopped.freezeLeftMs, FREEZE_MS)
  t.now += 37000
  const verdict = await engine.answer(stopped, round.answerId)
  assert.equal(verdict.outcome, 'right')
  assert.equal(verdict.slot, 3)
})

test('local: a reload in the middle of the stop resumes it', async () => {
  const storage = memory()
  const t = { now: 1_000_000 }
  const round = await local(storage, t).start(KANTO)
  t.now += 3000
  await local(storage, t).timeStop(round)
  t.now += 4000
  const status = await local(storage, t).status()
  assert.equal(status.pending.frozenAtMs, 3000)
  assert.equal(status.pending.freezeLeftMs, 26000)
  assert.equal(status.pending.elapsedMs, 3000)
})

test('local: out of turns, a charge opens a new window; the streak stays', async () => {
  const storage = memory()
  const t = { now: 1_000_000 }
  const engine = local(storage, t)
  await assert.rejects(engine.timeRefill(), /has_turns/)
  storage.setItem(KEYS.streak, '4')
  storage.setItem(KEYS.turns, JSON.stringify({ start: t.now, used: 5 }))
  const status = await engine.timeRefill()
  assert.equal(status.left, 5)
  assert.equal(status.timeLeft, 9)
  assert.equal(status.streak, 4)
})

test('guests have no charges', async () => {
  const guest = createGuestEngine()
  assert.equal((await guest.status()).timeLeft, 0)
  const round = await guest.start(KANTO)
  await assert.rejects(guest.timeStop(round), /no_time/)
  await assert.rejects(guest.timeRefill(), /no_time/)
})

test('the artwork loading while time is stopped does not move the veil', async () => {
  const { veilElapsed } = await import('./rules.mjs')
  const round = { elapsedMs: 3000 }
  assert.equal(veilElapsed(round, 1000, 6000), 8000)
  assert.equal(veilElapsed(round, 1000, 6000, null), 8000)
  assert.equal(veilElapsed(round, 1000, 6000, { at: 0, until: 15000 }), 3000)
  assert.equal(veilElapsed(round, 1000, 6000, { at: 2000, until: 4000 }), 6000)
})
