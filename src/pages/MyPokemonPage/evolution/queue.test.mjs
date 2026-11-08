import assert from 'node:assert/strict'
import test from 'node:test'
import { dismissEvolution, enqueueEvolution, snoozeKey } from './queue.mjs'

const req = (id, extra = {}) => ({ id, individualId: 'i1', kind: 'prompt', ...extra })

test('enqueue ignores a duplicate id and never mutates', () => {
  const q0 = []
  const q1 = enqueueEvolution(q0, req('a'))
  const q2 = enqueueEvolution(q1, req('b', { kind: 'run', item: 'water-stone' }))
  const q3 = enqueueEvolution(q2, req('a', { kind: 'run' }))
  assert.deepEqual(q0, [])
  assert.deepEqual(q3.map((r) => r.id), ['a', 'b'])
  assert.equal(q3[0].kind, 'prompt')
})

test('dismiss pops the head', () => {
  const q = [req('a'), req('b')]
  assert.deepEqual(dismissEvolution(q).map((r) => r.id), ['b'])
  assert.deepEqual(dismissEvolution([]), [])
  assert.equal(q.length, 2)
})

const opts = (...tos) => ({
  branches: tos.map((to) => ({ to, kind: 'level', eligible: true, alts: [{ alt: 0, kind: 'level', ok: true, reasons: [] }] })),
})

test('snoozeKey is stable for the same set and changes when a branch appears', () => {
  assert.equal(snoozeKey('i1', opts(5)), snoozeKey('i1', opts(5)))
  assert.notEqual(snoozeKey('i1', opts(5)), snoozeKey('i1', opts(5, 6)))
  assert.notEqual(snoozeKey('i1', opts(5)), snoozeKey('i2', opts(5)))
  assert.equal(snoozeKey('i1', opts(6, 5)), snoozeKey('i1', opts(5, 6)))
  assert.equal(snoozeKey('i1', { branches: [] }), 'i1:')
})
