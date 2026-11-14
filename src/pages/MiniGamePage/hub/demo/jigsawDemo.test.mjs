import assert from 'node:assert/strict'
import test from 'node:test'
import { jigsawFrames, JIGSAW_DEMO, isSolved } from './jigsawDemo.mjs'

test('every demo action is legal, starts in the tray, ends solved', () => {
  const frames = jigsawFrames()
  assert.equal(frames.length, JIGSAW_DEMO.steps.length + 1)
  assert.ok(frames.every((f) => f.state))
  assert.equal(frames[0].state.at.every((c) => c === -1), true)
  assert.equal(isSolved(frames.at(-1).state), true)
  assert.equal(isSolved(frames.at(-2).state), false)
})
