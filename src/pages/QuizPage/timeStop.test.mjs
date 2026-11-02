import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLatest, refusalNote, spendCharge } from './timeStop.mjs'
import { TIME_CHARGES, TIME_WINDOW_MS } from './engine/rules.mjs'

test('a status asked before another write never lands over it', () => {
  const latest = createLatest()
  const stop = latest.ticket() // the stop's status, asked first
  const answer = latest.ticket() // the verdict's, asked after
  assert.equal(latest.accept(answer), true)
  assert.equal(latest.accept(stop), false, 'the older one comes back last')
  assert.equal(latest.accept(latest.ticket()), true, 'a newer one lands')
})

test('each refusal of the Roar of Time says what happened', () => {
  assert.equal(refusalNote('no_time'), 'Hết lượt Gầm Thời Gian')
  assert.match(refusalNote('time_used'), /dừng/)
  assert.match(refusalNote('time_over'), /hết giờ/i)
  assert.match(refusalNote('answered'), /kết thúc/)
  assert.match(refusalNote('no_round'), /kết thúc/)
  const other = refusalNote('Failed to fetch')
  assert.notEqual(other, refusalNote('no_time'), 'the network is no lack of charges')
  assert.match(other, /thử lại/)
})

test('a stop spends a charge where the page is, its other numbers kept', () => {
  const now = 1_000_000
  const status = { left: 3, streak: 4, timeLeft: 7, timeRefillAt: now + 5000 }
  assert.deepEqual(spendCharge(status, now), { ...status, timeLeft: 6 })
  // the first of the window starts its hour
  assert.deepEqual(spendCharge({ ...status, timeLeft: TIME_CHARGES, timeRefillAt: 0 }, now), {
    ...status,
    timeLeft: TIME_CHARGES - 1,
    timeRefillAt: now + TIME_WINDOW_MS,
  })
  // a window already over: full again, then one spent
  assert.deepEqual(spendCharge({ ...status, timeLeft: 0, timeRefillAt: now - 1 }, now), {
    ...status,
    timeLeft: TIME_CHARGES - 1,
    timeRefillAt: now + TIME_WINDOW_MS,
  })
  assert.equal(spendCharge(null, now), null)
  assert.equal(spendCharge({ ...status, timeLeft: 0 }, now).timeLeft, 0)
})
