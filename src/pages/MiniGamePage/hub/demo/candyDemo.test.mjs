import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { trySwap } from '../../games/candy/engine.mjs'
import { candyFrames } from './candyDemo.mjs'

const vectors = JSON.parse(readFileSync(new URL('../../games/candy/vectors.json', import.meta.url), 'utf8'))
const v = vectors.find((x) => x.name === 'win')
const input = { board: v.board0, tape: v.tape, pos: v.pos0, moves: v.moves, kinds: v.kinds }

test('frame 0 is the start board and there is one frame per move', () => {
  const f = candyFrames(input)
  assert.equal(f.length, v.moves.length + 1)
  assert.deepEqual(f[0], { board: v.board0, swap: null, score: 0 })
})
test('every move is legal on the engine', () => {
  let st = { board: v.board0, pos: v.pos0, score: 0 }
  for (const [a, b] of v.moves) {
    const r = trySwap(st, v.tape, v.kinds, a, b)
    assert.ok(r, `move ${a},${b}`)
    st = r.state
  }
  const f = candyFrames(input)
  f.slice(1).forEach((fr, i) => assert.deepEqual(fr.swap, v.moves[i]))
})
test('score never decreases and ends above zero', () => {
  const f = candyFrames(input)
  for (let i = 1; i < f.length; i += 1) assert.ok(f[i].score >= f[i - 1].score)
  assert.ok(f.at(-1).score > 0)
  assert.equal(f.at(-1).score, v.score)
})
test('is deterministic and does not mutate its input', () => {
  const copy = JSON.parse(JSON.stringify(input))
  assert.deepEqual(candyFrames(input), candyFrames(input))
  assert.deepEqual(input, copy)
})
test('an illegal move throws instead of showing a stale board', () => {
  assert.throws(() => candyFrames({ ...input, moves: [[0, 5]] }))
})
