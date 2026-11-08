import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as display from './display.mjs'
import {
  SIZES,
  marksLabel,
  paletteLabel,
  personalityLine,
  sizeLabel,
  sizeOf,
  starLabel,
} from './display.mjs'
import { PERSONALITIES } from './traits.mjs'

test('paletteLabel: the palette and its tier; origin alone', () => {
  const a = (palette) => ({ v: 3, palette, shift: [], marks: null })
  assert.equal(paletteLabel(a('origin')), 'Nguyên bản')
  assert.equal(paletteLabel(a('amber')), 'Hổ phách · Thường')
  assert.equal(paletteLabel(a('sakura')), 'Anh đào · Hiếm')
  assert.equal(paletteLabel(a('gold')), 'Ánh kim · Rất hiếm')
})
test('marksLabel: null without marks, kind and count with them', () => {
  const a = { v: 2, palette: 'origin', shift: [], marks: null }
  assert.equal(marksLabel(a), null)
  assert.equal(
    marksLabel({ ...a, marks: { kind: 'stripes', count: 6, seed: 1 } }),
    'Lằn · 6 vệt'
  )
  assert.equal(
    marksLabel({ ...a, marks: { kind: 'hearts', count: 5, seed: 1 } }),
    'Tim · 5 trái'
  )
})
test('marksLabel: an old one- or two-star individual shows three stars, as drawn', () => {
  const a = { v: 2, palette: 'origin', shift: [], marks: null }
  const stars = (count) =>
    marksLabel({ ...a, marks: { kind: 'stars', count, seed: 1 } })
  assert.equal(stars(1), 'Sao · 3 ngôi')
  assert.equal(stars(2), 'Sao · 3 ngôi')
  assert.equal(stars(6), 'Sao · 6 ngôi')
  assert.equal(
    marksLabel({ ...a, marks: { kind: 'spots', count: 1, seed: 1 } }),
    'Đốm · 1 chấm'
  )
})
test('the old tints are gone', () => {
  assert.deepEqual(
    Object.keys(display).filter((k) => /tint/i.test(k)),
    []
  )
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
