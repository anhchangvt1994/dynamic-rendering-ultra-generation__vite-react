import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  markLabel,
  markSpots,
  personalityLine,
  starLabel,
  tintFilter,
} from './display.mjs'
import { MARK_KINDS, PERSONALITIES } from './traits.mjs'

test('tintFilter writes hue, saturate and brightness', () => {
  assert.equal(
    tintFilter({ hue: -7, sat: 4, light: -3 }),
    'hue-rotate(-7deg) saturate(1.04) brightness(0.97)'
  )
  assert.equal(
    tintFilter({ hue: 10, sat: -8, light: 4 }),
    'hue-rotate(10deg) saturate(0.92) brightness(1.04)'
  )
})
test('markSpots: null gives none; spots are deterministic, 3-6, inside the frame', () => {
  assert.deepEqual(markSpots(null), [])
  for (const kind of MARK_KINDS)
    for (const [x, y] of [
      [30, 30],
      [70, 70],
      [50, 50],
      [30, 70],
    ]) {
      const mark = { kind, x, y, size: 24, rot: 359 }
      const a = markSpots(mark)
      assert.deepEqual(a, markSpots(mark))
      assert.ok(a.length >= 3 && a.length <= 6, `${a.length}`)
      for (const s of a) {
        assert.ok(s.cx >= 0 && s.cx <= 100 && s.cy >= 0 && s.cy <= 100)
        assert.ok(s.r > 0 && s.r <= 24)
        assert.equal(s.kind, kind)
        assert.ok(s.rot >= 0 && s.rot < 360)
      }
    }
})
test('spots spread within 18% of the centre', () => {
  for (const s of markSpots({
    kind: 'patch',
    x: 50,
    y: 50,
    size: 12,
    rot: 0,
  })) {
    assert.ok(Math.abs(s.cx - 50) <= 18 && Math.abs(s.cy - 50) <= 18)
  }
})
test('every mark kind has a Vietnamese label; unknown is empty-safe', () => {
  assert.deepEqual(MARK_KINDS.map(markLabel), [
    'tàn nhang',
    'vằn',
    'mảng màu',
    'sẹo',
    'vết sao',
  ])
  assert.equal(markLabel('nope'), '')
})
test('personalityLine covers 0..11 with distinct names and rejects the rest', () => {
  const names = new Set()
  for (let i = 0; i < 12; i++) {
    const p = personalityLine(i)
    assert.equal(p.name, PERSONALITIES[i])
    assert.ok(p.line.length > 10)
    names.add(p.name)
  }
  assert.equal(names.size, 12)
  for (const bad of [12, -1, 1.5, NaN, '3'])
    assert.throws(() => personalityLine(bad), /personality/)
})
test('starLabel', () => {
  assert.equal(starLabel(1), '1 sao')
  assert.equal(starLabel(5), '5 sao')
  assert.throws(() => starLabel(0))
  assert.throws(() => starLabel(6))
})
