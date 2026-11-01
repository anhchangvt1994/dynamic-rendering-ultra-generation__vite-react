// The Roar of Time: a round's clock stopped for 15 s, the 5 charges
// (the same numbers as supabase/tests/database/quiz_time.test.sql)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FREEZE_MS,
  TIME_WINDOW_MS,
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

test("a round's clock leaves out its 15 s stop", () => {
  assert.equal(roundClock(5000, null), 5000)
  assert.equal(roundClock(10000, 3000), 3000)
  assert.equal(roundClock(15000, 3000), 3000)
  assert.equal(roundClock(25000, 3000), 10000)
  assert.equal(roundClock(2000, 3000), 2000)
})

test('the freeze still to run', () => {
  assert.equal(freezeLeft(10000, 3000), 8000)
  assert.equal(freezeLeft(25000, 3000), 0)
  assert.equal(freezeLeft(5000, null), 0)
  assert.equal(freezeLeft(3000, 3000), FREEZE_MS)
})

test('stopped at 3 s and answered 25 s after the start: the last gift, not too late', () => {
  const stopped = verdictOf(ROUND, 25, roundClock(25000, 3000))
  assert.equal(stopped.outcome, 'right')
  assert.equal(stopped.slot, 3)
  assert.equal(verdictOf(ROUND, 25, roundClock(25000, null)).outcome, 'time')
  assert.equal(verdictOf(ROUND, 25, roundClock(15000, 3000)).slot, 0)
})

test('the veil halves over a second once time is stopped', () => {
  assert.equal(veilScale(null), 1)
  assert.equal(veilScale(0), 1)
  assert.equal(veilScale(1000), 0.5)
  assert.equal(veilScale(60000), 0.5)
  const half = veilScale(500)
  assert.ok(half < 1 && half > 0.5)
})

test('5 charges; the window starts with the first use and refills 2 hours later', () => {
  let state = timeState({}, 1000)
  assert.equal(timeLeft(state), 5)
  assert.equal(timeRefillAt(state), 0)
  state = spendTime(state, 1000)
  state = spendTime(state, 5000)
  assert.equal(timeLeft(state), 3)
  assert.equal(timeRefillAt(state), 1000 + TIME_WINDOW_MS)
  assert.equal(timeLeft(timeState(state, 1000 + TIME_WINDOW_MS - 1)), 3)
  assert.deepEqual(timeState(state, 1000 + TIME_WINDOW_MS), {
    start: 0,
    used: 0,
  })
})
