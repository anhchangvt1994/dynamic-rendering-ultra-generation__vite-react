import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MARK_KINDS,
  MARK_LABELS,
  PALETTES,
  SET_KEYS,
  TIER_KEYS,
  VIBES,
  VIBE_LABELS,
  paletteOf,
} from './palettes.mjs'
import { hexToOklab } from '../../MyPokemonPage/room/canvas/colour.mjs'

test('five vibes, each labelled', () => {
  assert.deepEqual(VIBES, ['cute', 'cool', 'fierce', 'mystic', 'nature'])
  assert.deepEqual(VIBE_LABELS, {
    cute: 'Dễ thương',
    cool: 'Ngầu',
    fierce: 'Dữ dằn',
    mystic: 'Huyền bí',
    nature: 'Thiên nhiên',
  })
})

test('forty-eight palettes with unique keys', () => {
  assert.equal(PALETTES.length, 48)
  assert.equal(new Set(PALETTES.map((p) => p.key)).size, 48)
})

test('tiers hold 1 / 24 / 18 / 5 palettes', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(TIER_KEYS).map(([t, k]) => [t, k.length])
    ),
    { origin: 1, common: 24, rare: 18, 'very-rare': 5 }
  )
  assert.deepEqual(TIER_KEYS.origin, ['origin'])
  assert.deepEqual(TIER_KEYS['very-rare'], [
    'gold',
    'silver',
    'obsidian',
    'invert',
    'pearl',
  ])
  for (const [tier, keys] of Object.entries(TIER_KEYS))
    for (const key of keys) assert.equal(paletteOf(key).tier, tier)
})

test('every vibe and the pool hold 4 common and 3 rare, in table order', () => {
  for (const set of [...VIBES, 'pool']) {
    assert.equal(SET_KEYS[set].common.length, 4, set)
    assert.equal(SET_KEYS[set].rare.length, 3, set)
    for (const tier of ['common', 'rare'])
      for (const key of SET_KEYS[set][tier]) {
        assert.equal(paletteOf(key).tier, tier)
        assert.equal(paletteOf(key).vibe, set === 'pool' ? null : set)
      }
  }
  assert.deepEqual(SET_KEYS.cute.common, [
    'strawberry-milk',
    'mint-cream',
    'banana',
    'lavender',
  ])
  assert.deepEqual(SET_KEYS.fierce.common.at(-1), 'toxic-green')
  assert.deepEqual(SET_KEYS.pool.rare, ['candy', 'twilight', 'glacier'])
})

test('colours are three #rrggbb, except origin and invert', () => {
  for (const p of PALETTES) {
    assert.ok(p.label.length > 0, p.key)
    if (p.key === 'origin' || p.key === 'invert') {
      assert.equal(p.colors, null, p.key)
      continue
    }
    assert.equal(p.colors.length, 3, p.key)
    for (const c of p.colors) assert.match(c, /^#[0-9a-f]{6}$/, p.key)
  }
  assert.equal(paletteOf('invert').effect, 'invert')
  assert.deepEqual(
    PALETTES.filter((p) => p.effect === 'metal').map((p) => p.key),
    ['gold', 'silver', 'pearl']
  )
  assert.deepEqual(paletteOf('toxic-green').colors, [
    '#3f8f2a',
    '#d9f28a',
    '#c23cff',
  ])
  assert.equal(paletteOf('toxic-green').label, 'Lục độc')
})

test('an unknown key falls back to origin', () => {
  assert.equal(paletteOf('nope').key, 'origin')
  assert.equal(paletteOf('ember').key, 'origin')
  assert.equal(paletteOf(undefined).key, 'origin')
})

test('eight mark kinds, snow last, each labelled', () => {
  assert.deepEqual(MARK_KINDS, [
    'spots',
    'stripes',
    'patch',
    'scar',
    'flower',
    'stars',
    'hearts',
    'snow',
  ])
  assert.deepEqual(MARK_LABELS.stripes, { label: 'Lằn', unit: 'vệt' })
  assert.deepEqual(MARK_LABELS.hearts, { label: 'Tim', unit: 'trái' })
  for (const kind of MARK_KINDS) assert.ok(MARK_LABELS[kind].label)
})

test('cute palettes are bright and vivid: no pale or near-white colour', () => {
  const chroma = ([, a, b]) => Math.hypot(a, b)
  const cute = PALETTES.filter((p) => p.vibe === 'cute')
  assert.equal(cute.length, 7)
  for (const p of cute) {
    const [main, second, accent] = p.colors.map(hexToOklab)
    assert.ok(main[0] >= 0.7 && chroma(main) >= 0.14, `${p.key} main`)
    assert.ok(second[0] >= 0.7 && chroma(second) >= 0.11, `${p.key} second`)
    assert.ok(chroma(accent) >= 0.1, `${p.key} accent`)
  }
})
