import assert from 'node:assert/strict'
import test from 'node:test'
import { TYPE_DATA } from '../../../components/pokemon-page/type-data.mjs'
import { PALETTES, contrast, themeFor } from './roomTheme.mjs'

test('a palette for each of the 18 types', () => {
  assert.deepEqual(Object.keys(PALETTES).sort(), Object.keys(TYPE_DATA).sort())
  assert.equal(Object.keys(PALETTES).length, 18)
})

test('every palette is readable', () => {
  for (const [type, { bg, a1, ink }] of Object.entries(PALETTES)) {
    assert.ok(contrast(a1, bg) >= 3, `${type} a1 on bg`)
    assert.ok(contrast(ink, a1) >= 4.5, `${type} ink on a1`)
  }
})

test('contrast: black on white is 21, a colour on itself is 1', () => {
  assert.equal(Math.round(contrast('#000000', '#ffffff')), 21)
  assert.equal(contrast('#123456', '#123456'), 1)
})

test('a pair of types: the first sets the room, the second the accent', () => {
  const theme = themeFor(['psychic', 'fairy'])
  assert.equal(theme.bg, PALETTES.psychic.bg)
  assert.equal(theme.a1, PALETTES.psychic.a1)
  assert.equal(theme.ink, PALETTES.psychic.ink)
  assert.equal(theme.a2, PALETTES.fairy.a1)
  assert.deepEqual(theme.words, ['SIÊU LINH', 'TIÊN'])
  assert.equal(theme.sticker, 'Siêu linh ✦ Tiên')
})

test('one type keeps its own accent', () => {
  const theme = themeFor(['electric'])
  assert.equal(theme.a2, PALETTES.electric.a2)
  assert.deepEqual(theme.words, ['ĐIỆN'])
  assert.equal(theme.sticker, 'Điện')
})

const hsl = (hex) => {
  const [r, g, b] = [0, 1, 2].map(
    (i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
  )
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
  return { s, l }
}

test('light rooms are coloured, not paper: a saturated wall a step down from white', () => {
  for (const [type, { bg }] of Object.entries(PALETTES)) {
    const { s, l } = hsl(bg)
    if (l < 0.5) continue
    assert.ok(s >= 0.6, `${type} wall saturation ${s.toFixed(2)}`)
    assert.ok(l <= 0.9, `${type} wall lightness ${l.toFixed(2)}`)
  }
})

test('accents are vivid: a1 and a2 are strong colours, not greys', () => {
  for (const [type, { a1, a2 }] of Object.entries(PALETTES))
    for (const c of [a1, a2])
      if (c !== '#ffffff')
        assert.ok(
          hsl(c).s >= 0.55,
          `${type} ${c} saturation ${hsl(c).s.toFixed(2)}`
        )
})
