import assert from 'node:assert/strict'
import test from 'node:test'
import { createPractice } from './practice.mjs'
import { findLines, hasMove } from './games/candy/engine.mjs'

const seeded = (seed) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

test('difficulty 3 deals 20 cards in 10 pairs, all face down', () => {
  const game = createPractice({ difficulty: 3, random: seeded(1) })
  assert.equal(game.view.cards, 20)
  assert.equal(game.view.cols, 5)
  assert.deepEqual(game.view.matched, [])
  assert.deepEqual(game.view.faces, {})
})

test('the same random gives the same board', async () => {
  const a = createPractice({ difficulty: 2, random: seeded(7) })
  const b = createPractice({ difficulty: 2, random: seeded(7) })
  const faces = async (g) => {
    const out = []
    for (let i = 0; i < 16; i += 2) {
      out.push((await g.flip(i)).face)
      await g.flip(i + 1)
    }
    return out
  }
  assert.deepEqual(await faces(a), await faces(b))
})

test('flipping two cards of a pair matches; a miss closes both', async () => {
  const game = createPractice({ difficulty: 1, random: seeded(3) })
  const first = await game.flip(0)
  assert.equal(first.match, null)
  let partner = -1
  for (let i = 1; i < 12 && partner < 0; i += 1) {
    const probe = createPractice({ difficulty: 1, random: seeded(3) })
    await probe.flip(0)
    if ((await probe.flip(i)).match) partner = i
  }
  assert.ok(partner > 0)
  const second = await game.flip(partner)
  assert.equal(second.match, true)
  assert.deepEqual(second.matched, [0, partner])
})

test('clearing the board is done, and it works without a network', async () => {
  const game = createPractice({ difficulty: 1, random: seeded(5) })
  let result
  const seen = {}
  for (let i = 0; i < 12; i += 1) {
    const r = await game.flip(i)
    seen[r.face] = [...(seen[r.face] ?? []), i]
  }
  const fresh = createPractice({ difficulty: 1, random: seeded(5) })
  for (const pair of Object.values(seen)) {
    await fresh.flip(pair[0])
    result = await fresh.flip(pair[1])
  }
  assert.equal(result.done, true)
})

test('it has a deadline 5 minutes ahead', () => {
  const before = Date.now()
  const game = createPractice({ difficulty: 1 })
  assert.ok(game.deadline >= before + 299_000 && game.deadline <= Date.now() + 300_000)
})

test('a candy practice deals a legal board and a 1000-value tape', () => {
  for (const [difficulty, kinds] of [[1, 4], [2, 5], [3, 6]]) {
    const game = createPractice({ game: 'candy', difficulty, random: seeded(difficulty) })
    const v = game.view
    assert.equal(v.kind, 'candy')
    assert.equal(v.board.length, 42)
    assert.equal(v.tape.length, 1000)
    assert.equal(v.kinds, kinds)
    assert.ok(v.board.every((c) => c >= 0 && c < kinds))
    assert.deepEqual(findLines(v.board), [])
    assert.ok(hasMove(v.board))
    assert.equal(game.flip, undefined)
  }
})

test('a candy practice is the same for the same random, with the rules of the level', () => {
  const a = createPractice({ game: 'candy', difficulty: 2, random: seeded(9) })
  const b = createPractice({ game: 'candy', difficulty: 2, random: seeded(9) })
  assert.deepEqual(a.view, b.view)
  assert.equal(a.view.movesMax, 18)
  assert.equal(a.view.target, 3000)
  assert.ok(a.deadline > Date.now())
})

test('a practice without a game is the memory game', () => {
  assert.equal(createPractice({ difficulty: 1, random: seeded(2) }).view.cards, 12)
})
