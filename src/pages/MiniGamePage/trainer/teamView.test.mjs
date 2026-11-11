import assert from 'node:assert/strict'
import test from 'node:test'
import { teamCandidates } from './teamView.mjs'

const mon = (id) => ({ id })
const view = (builds, trainerLevel, ids = ['a']) =>
  teamCandidates({ individuals: ids.map(mon), builds, trainerLevel })

test('a Pokémon above the trainer asks for a trainer level', () => {
  const [row] = view({ a: { level: 17, bond: 3 } }, 10)
  assert.equal(row.ok, false)
  assert.equal(row.reason, 'Cần trainer level 11')
})

test('a need beyond the level cap asks for a closer bond', () => {
  const [row] = view({ a: { level: 90, bond: 1 } }, 30)
  assert.equal(row.ok, false)
  assert.equal(row.reason, 'Cần thân thiết hơn')
})

test('an eligible Pokémon has no reason', () => {
  const [row] = view({ a: { level: 16, bond: 3 } }, 10)
  assert.deepEqual([row.ok, row.reason], [true, null])
})

test('the input order is kept and the individual is returned as is', () => {
  const rows = view({}, 5, ['c', 'a', 'b'])
  assert.deepEqual(rows.map((r) => r.individual.id), ['c', 'a', 'b'])
})
