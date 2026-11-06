import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  SIZES,
  TINTS,
  personalityLine,
  sizeLabel,
  sizeOf,
  starLabel,
  tintFilter,
  tintLabel,
  tintOf,
} from './display.mjs'
import { PERSONALITIES } from './traits.mjs'

test('tintOf: every appearance gets one of the named tints, the same one each time', () => {
  const seen = new Set()
  for (let hue = -10; hue <= 10; hue++)
    for (let sat = -8; sat <= 8; sat++)
      for (let light = -4; light <= 4; light++) {
        const a = { hue, sat, light }
        const t = tintOf(a)
        assert.ok(TINTS.includes(t))
        assert.equal(tintOf(a), t)
        seen.add(t.key)
      }
  assert.equal(seen.size, TINTS.length, 'every tint is reachable')
})
test('tints are many colourways, not lighter or darker: each its own filter', () => {
  assert.ok(TINTS.length >= 9)
  assert.equal(new Set(TINTS.map((t) => t.filter)).size, TINTS.length)
  assert.equal(TINTS[0].filter, '', 'the original first')
  const turns = TINTS.map((t) =>
    Number(/hue-rotate\((-?\d+)deg\)/.exec(t.filter)?.[1] ?? 0)
  )
  assert.ok(
    turns.some((d) => Math.abs(d) >= 150),
    'an opposite hue'
  )
  // warm ones are sepia-based: a pure hue turn sends browns towards olive
  assert.ok(TINTS.filter((t) => t.filter.includes('sepia')).length >= 2)
  assert.ok(
    TINTS.some((t) => t.filter.includes('grayscale')),
    'a silver one'
  )
  for (const t of TINTS) assert.match(t.label, /\S/)
})
test('tintFilter is the tint then a nudge of saturation and light', () => {
  const a = { hue: -7, sat: 8, light: -4 }
  assert.equal(
    tintFilter(a),
    `${tintOf(a).filter} saturate(1.2) brightness(0.92)`.trim()
  )
  const plain = TINTS.findIndex((t) => !t.filter)
  for (let hue = -10; hue <= 10; hue++) {
    const b = { hue, sat: 0, light: 0 }
    if (TINTS.indexOf(tintOf(b)) === plain)
      assert.equal(tintFilter(b), 'saturate(1) brightness(1)')
  }
})
test('tintLabel names the tint', () => {
  const a = { hue: 6, sat: 7, light: -3 }
  assert.equal(tintLabel(a), tintOf(a).label)
})
test('sizeOf: deterministic per id, five sizes from tiny to huge, mostly medium', () => {
  const count = {}
  for (let i = 0; i < 5000; i++) {
    const id = `00000000-0000-4000-a000-${String(i).padStart(12, '0')}`
    const s = sizeOf(id)
    assert.equal(sizeOf(id), s)
    count[s.key] = (count[s.key] ?? 0) + 1
  }
  assert.deepEqual(Object.keys(count).sort(), SIZES.map((s) => s.key).sort())
  assert.ok(count.medium > count.small && count.small > count.tiny)
  assert.ok(count.medium > count.large && count.large > count.huge)
  const scales = SIZES.map((s) => s.scale)
  assert.deepEqual(
    scales,
    [...scales].sort((x, y) => x - y)
  )
  assert.equal(SIZES.find((s) => s.key === 'medium').scale, 1)
})
test('sizeLabel: the size and its percentage of the species', () => {
  const s = sizeOf('00000000-0000-4000-a000-000000abc001')
  assert.equal(sizeLabel(s), `${s.label} · ${Math.round(s.scale * 100)}%`)
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
