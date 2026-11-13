import test from 'node:test'
import assert from 'node:assert/strict'
import { createPuzzle, answer } from './rules.mjs'

test('serializes Pokémon puzzle and validates answer without mutating input', () => {
  const puzzle = createPuzzle(25, 4)
  assert.equal(puzzle.speciesId, 25)
  assert.equal(puzzle.pieces.length, 4)
  assert.equal(answer(puzzle, 1), false)
  assert.equal(answer(puzzle, 25), true)
  assert.equal(puzzle.solved, false)
})
