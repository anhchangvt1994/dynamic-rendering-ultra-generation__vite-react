import assert from 'node:assert/strict'
import test from 'node:test'
import { remainingMs, ringProgress } from './countdown.mjs'

test('remainingMs follows the server clock: a device 30 s slow still agrees', () => {
  const serverNow = Date.parse('2026-11-11T10:00:00Z')
  const deviceNow = serverNow - 30_000
  assert.equal(
    remainingMs({
      deadline: '2026-11-11T10:02:00Z',
      now: deviceNow,
      offsetMs: 30_000,
    }),
    120_000
  )
})

test('remainingMs is never negative', () => {
  assert.equal(
    remainingMs({ deadline: Date.parse('2026-11-11T10:00:00Z'), now: Date.parse('2026-11-11T11:00:00Z'), offsetMs: 0 }),
    0
  )
})

test('ringProgress runs from 1 to 0 and stays inside', () => {
  assert.equal(ringProgress(300_000, 300_000), 1)
  assert.equal(ringProgress(0, 300_000), 0)
  assert.equal(ringProgress(150_000, 300_000), 0.5)
  assert.equal(ringProgress(400_000, 300_000), 1)
  assert.equal(ringProgress(-5, 300_000), 0)
})

test('boardComplete is true once every card is matched, so a resumed full board can be claimed', async () => {
  const { boardComplete } = await import('./countdown.mjs')
  assert.equal(boardComplete({ cards: 12, matched: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }), true)
  assert.equal(boardComplete({ cards: 12, matched: [0, 1] }), false)
  assert.equal(boardComplete({ cards: 0, matched: [] }), false)
})
