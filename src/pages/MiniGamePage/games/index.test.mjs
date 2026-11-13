import test from 'node:test'
import assert from 'node:assert/strict'
import { GAMES } from './index.mjs'

test('registers six unique arcade games with complete Vietnamese metadata', () => {
  assert.deepEqual(GAMES.map(({ id }) => id), [
    'memory', 'candy', 'tile-safari', 'block-lab', 'silhouette-atelier', 'lucky-spin',
  ])
  assert.equal(new Set(GAMES.map(({ id }) => id)).size, GAMES.length)
  for (const game of GAMES) {
    assert.ok(game.title)
    assert.ok(game.blurb)
    assert.equal(typeof game.levelInfo, 'function')
    assert.equal(typeof game.winText, 'function')
  }
  assert.ok(GAMES.every((game) => ['memory', 'candy'].includes(game.id) || !game.Board))
})
