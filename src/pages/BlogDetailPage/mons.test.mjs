import test from 'node:test'
import assert from 'node:assert/strict'
import { pickMon, fitMon, PIXEL_MAX, MODEL_MAX } from './mons.mjs'

test('pickMon: both sources, ids in range, full range reachable', () => {
  const pixel = pickMon(() => 0)
  assert.equal(pixel.pixel, true)
  assert.equal(pixel.id, 1)
  assert.match(pixel.src, /black-white\/animated\/1\.gif$/)
  const last = pickMon(() => 0.9999999)
  assert.equal(last.pixel, false)
  assert.equal(last.id, MODEL_MAX)
  assert.match(last.src, /other\/showdown\/1010\.gif$/)
  const seq = [0.2, 0.9999999]
  const topPixel = pickMon(() => seq.shift())
  assert.equal(topPixel.id, PIXEL_MAX)
  for (let i = 0; i < 500; i++) {
    const m = pickMon()
    assert.ok(m.id >= 1 && m.id <= (m.pixel ? PIXEL_MAX : MODEL_MAX))
  }
})

test('fitMon: pixel art scales by whole numbers, big art shrinks to fit', () => {
  assert.deepEqual(fitMon(30, 20, true), { width: 60, height: 40 })
  assert.deepEqual(fitMon(40, 54, true), { width: 40, height: 54 })
  assert.deepEqual(fitMon(100, 200, false), { width: 27, height: 54 })
  assert.deepEqual(fitMon(30, 20, false), { width: 30, height: 20 })
  assert.deepEqual(fitMon(0, 0, true), { width: 54, height: 54 })
})
