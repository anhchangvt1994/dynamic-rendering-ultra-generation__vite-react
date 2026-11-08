import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readyAction } from './ready.mjs'

test('waits for status before offering a round', () => {
  assert.equal(readyAction(null, false), 'loading')
})
test('resumes a pending round even with no turns left', () => {
  assert.equal(readyAction({ pending: { id: 'old' }, left: 0 }, true), 'resume')
})
test('rests without a pending round when turns are spent', () => {
  assert.equal(readyAction({ pending: null, left: 0 }, false), 'rest')
  assert.equal(readyAction({ pending: null, left: 5 }, true), 'rest')
})
test('offers a start for available turns and for guests', () => {
  assert.equal(readyAction({ pending: null, left: 5 }, false), 'start')
  assert.equal(readyAction({ pending: null, left: Infinity }, false), 'start')
})
test('unopened chests come first, even out of turns or with a round waiting', () => {
  const chests = [{ kind: 'combo', gifts: [], round: 'r' }]
  assert.equal(readyAction({ pending: null, left: 0, chests }, true), 'chest')
  assert.equal(
    readyAction({ pending: { id: 'p' }, left: 5, chests }, false),
    'chest'
  )
  assert.equal(
    readyAction({ pending: null, left: 5, chests: [] }, false),
    'start'
  )
})
