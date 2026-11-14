import test from 'node:test'
import assert from 'node:assert/strict'
import { cellAt, tileStyle } from './board-model.mjs'

test('tileStyle crops a square artwork centred behind a cols x rows frame', () => {
  assert.deepEqual(tileStyle(0, 3, 3), { backgroundSize: '300% 300%', backgroundPosition: '0% 0%' })
  assert.deepEqual(tileStyle(4, 3, 3), { backgroundSize: '300% 300%', backgroundPosition: '50% 50%' })
  assert.deepEqual(tileStyle(8, 3, 3), { backgroundSize: '300% 300%', backgroundPosition: '100% 100%' })
  // 3 cols x 4 rows: art is 4 cells wide, the frame shows the middle 3
  const a = tileStyle(0, 3, 4)
  assert.equal(a.backgroundSize, '400% 400%')
  assert.equal(a.backgroundPosition, `${(0.5 / 3) * 100}% 0%`)
  assert.equal(tileStyle(11, 3, 4).backgroundPosition, `${(2.5 / 3) * 100}% 100%`)
})

test('cellAt maps a point to a frame cell or null outside', () => {
  const rect = { left: 10, top: 20, width: 300, height: 400 }
  assert.equal(cellAt(11, 21, rect, 3, 4), 0)
  assert.equal(cellAt(309, 419, rect, 3, 4), 11)
  assert.equal(cellAt(160, 220, rect, 3, 4), 7) // col 1, row 2
  assert.equal(cellAt(5, 100, rect, 3, 4), null)
  assert.equal(cellAt(100, 421, rect, 3, 4), null)
})
