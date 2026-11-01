import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServerEngine } from './server.ts'

const ROUND = {
  id: 'r-1',
  options: [25, 4, 7, 1],
  veil: 'torch',
  hard: false,
  gifts: ['protein', 'oran-berry', 'fresh-water', 'cheri-berry'],
  bonus: 2,
  duration_ms: 14000,
  started_at: '2026-11-01T10:00:00.000Z',
  now: '2026-11-01T10:00:03.000Z',
}
const STATUS = {
  left: 4,
  refill_at: '2026-11-01T13:00:00.000Z',
  now: ROUND.now,
  used: 1,
  bonus: 0,
  wins: 0,
  window_gifts: [],
  streak: 3,
  records: 1,
  records_total: 2,
  rerolls_left: 3,
  pending: ROUND,
}
const client = (replies) => {
  const calls = []
  return {
    calls,
    rpc: async (name, args) => {
      calls.push([name, args])
      const reply = replies[name]
      return typeof reply === 'function' ? reply(args) : reply
    },
  }
}

test('a round from the server: no answer, its clock where the server has it', async () => {
  const supabase = client({ quiz_start: { data: ROUND, error: null } })
  const engine = createServerEngine(supabase)
  const round = await engine.start({ from: 1, to: 151, hard: false })
  assert.deepEqual(supabase.calls[0], [
    'quiz_start',
    { p_from: 1, p_to: 151, p_hard: false },
  ])
  assert.equal(round.id, 'r-1')
  assert.equal(round.durationMs, 14000)
  assert.equal(round.elapsedMs, 3000)
  assert.equal(round.answerId, undefined)
  assert.equal(engine.art(round), '/api/quiz-art/r-1')
  assert.equal(engine.cry(round), '/api/quiz-cry/r-1')
  assert.equal(engine.rewards, true)
})

test("the status maps to the page's names, the pending round included", async () => {
  const engine = createServerEngine(
    client({ quiz_status: { data: STATUS, error: null } })
  )
  const status = await engine.status()
  assert.equal(status.left, 4)
  assert.equal(status.refillAt, Date.parse('2026-11-01T13:00:00.000Z'))
  assert.equal(status.recordsTotal, 2)
  assert.equal(status.rerollsLeft, 3)
  assert.equal(status.pending.id, 'r-1')
})

test('a verdict carries the answer, the chests and the new status', async () => {
  const supabase = client({
    quiz_answer: {
      data: {
        outcome: 'right',
        answer_id: 25,
        slot: 0,
        gift: 'protein',
        lucky: false,
        missed: null,
        chests: [{ kind: 'combo', gifts: ['hp-up', 'oran-berry', 'lemonade'] }],
        streak: 0,
        records: 2,
        records_total: 3,
        left: 4,
        refill_at: STATUS.refill_at,
        wins: 1,
        window_gifts: ['protein'],
        used: 1,
        bonus: 0,
        rerolls_left: 3,
      },
      error: null,
    },
  })
  const engine = createServerEngine(supabase)
  const verdict = await engine.answer({ id: 'r-1' }, 25)
  assert.deepEqual(supabase.calls[0], [
    'quiz_answer',
    { p_round: 'r-1', p_choice: 25 },
  ])
  assert.equal(verdict.answerId, 25)
  assert.equal(verdict.chests[0].kind, 'combo')
  assert.equal(verdict.status.records, 2)
  assert.deepEqual(verdict.status.windowGifts, ['protein'])
  assert.equal(verdict.status.pending, null)
})

test('the server refuses: the reason comes through as the error', async () => {
  const engine = createServerEngine(
    client({
      quiz_start: { data: null, error: { message: 'no_turns', code: 'P0001' } },
    })
  )
  await assert.rejects(
    engine.start({ from: 1, to: 151, hard: false }),
    /no_turns/
  )
})

test('a typed round comes without options: the page has none to show', async () => {
  const engine = createServerEngine(
    client({
      quiz_start: {
        data: { ...ROUND, hard: true, options: null },
        error: null,
      },
    })
  )
  const round = await engine.start({ from: 1, to: 151, hard: true })
  assert.deepEqual(round.options, [])
})
