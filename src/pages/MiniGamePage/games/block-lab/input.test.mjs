import test from 'node:test'
import assert from 'node:assert/strict'
import { createBlockInput, holdTicks } from './input.mjs'

const rig = () => {
  const calls = []
  const input = createBlockInput({
    move: (dx) => calls.push(['move', dx]),
    rotate: (dir) => calls.push(['rotate', dir]),
    hard: () => calls.push(['hard']),
  })
  return { calls, input }
}

test('keyboard maps arrows, x, z; down and space both drop at once', () => {
  const { calls, input } = rig()
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'x', 'z', 'ArrowDown', ' ']) assert.equal(input(key), true)
  assert.deepEqual(calls, [['move', -1], ['move', 1], ['rotate', 1], ['rotate', 1], ['rotate', -1], ['hard'], ['hard']])
})

test('irrelevant and modified shortcuts do nothing', () => {
  const { calls, input } = rig()
  assert.equal(input('ArrowLeft', { altKey: true }), false)
  assert.equal(input('Enter'), false)
  assert.equal(input('z', { ctrlKey: true }), false)
  assert.deepEqual(calls, [])
})

test('a held key repeats after the delay, then at the rate', () => {
  assert.equal(holdTicks(159), 0)
  assert.equal(holdTicks(160), 1)
  assert.equal(holdTicks(260), 3)
  assert.equal(holdTicks(-5), 0)
})
