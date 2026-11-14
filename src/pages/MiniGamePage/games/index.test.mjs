import test from 'node:test'
import assert from 'node:assert/strict'
import { GAMES } from './index.mjs'

test('new arcade games use short, approachable Vietnamese titles', () => {
  const titles = Object.fromEntries(GAMES.map(({ id, title }) => [id, title]))

  assert.equal(titles['tile-safari'], 'Chọn cặp')
  assert.equal(titles['block-lab'], 'Xếp khối Pokémon')
  assert.equal(titles['silhouette-atelier'], 'Ghép Pokémon')
  assert.equal(titles['lucky-spin'], 'Vòng quay may mắn')
})

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

test('block lab shows its line goal and starting level', () => {
  const block = GAMES.find((game) => game.id === 'block-lab')
  assert.equal(block.levelInfo(1), '10 hàng · cấp 1')
  assert.equal(block.levelInfo(3), '30 hàng · cấp 3')
  assert.equal(block.winText({ score: 3420 }), 'Bạn dọn đủ hàng và đạt 3420 điểm!')
})

test('jigsaw registry describes dragging and turning pieces, not guessing', () => {
  const game = GAMES.find((entry) => entry.id === 'silhouette-atelier')
  assert.match(game.blurb, /Kéo/)
  assert.match(game.blurb, /xoay/)
  assert.equal(game.levelInfo(1), '6 mảnh')
  assert.equal(game.levelInfo(2), '9 mảnh')
  assert.equal(game.levelInfo(3), '12 mảnh')
  assert.equal(game.winText({ moves: 27 }), 'Bạn ghép xong tranh sau 27 thao tác.')
})
