import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MARK_KINDS,
  MARK_LABELS,
  PALETTES,
  TIER_KEYS,
  paletteOf,
} from './palettes.mjs'

test('thirty palettes with unique keys', () => {
  assert.equal(PALETTES.length, 30)
  assert.equal(new Set(PALETTES.map((p) => p.key)).size, 30)
})

test('tiers hold 1 / 14 / 10 / 5 palettes, in table order', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(TIER_KEYS).map(([t, k]) => [t, k.length])
    ),
    { origin: 1, common: 14, rare: 10, 'very-rare': 5 }
  )
  assert.deepEqual(TIER_KEYS.origin, ['origin'])
  assert.equal(TIER_KEYS.common[0], 'ember')
  assert.equal(TIER_KEYS.common.at(-1), 'slate')
  assert.equal(TIER_KEYS.rare[0], 'sakura')
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
  assert.deepEqual(paletteOf('ember').colors, ['#e2683c', '#f6d7a7', '#3d7fb8'])
})

test('an unknown key falls back to origin', () => {
  assert.equal(paletteOf('nope').key, 'origin')
  assert.equal(paletteOf(undefined).key, 'origin')
})

test('six mark kinds in weight order, each labelled', () => {
  assert.deepEqual(MARK_KINDS, [
    'spots',
    'stripes',
    'patch',
    'scar',
    'flower',
    'stars',
  ])
  assert.deepEqual(MARK_LABELS.stripes, { label: 'Lằn', unit: 'vệt' })
  for (const kind of MARK_KINDS) assert.ok(MARK_LABELS[kind].label)
})

test('the SQL migration lists the same keys per tier, in order', async () => {
  const { readFileSync } = await import('node:fs')
  const sql = readFileSync(
    new URL(
      '../../../../supabase/migrations/20261116000000_pokemon_appearance_v2.sql',
      import.meta.url
    ),
    'utf8'
  )
  const arrays = [
    ...sql.matchAll(/then array\[([^\]]+)\]|else array\[([^\]]+)\]/g),
  ].map((m) => (m[1] ?? m[2]).split(',').map((k) => k.trim().replace(/'/g, '')))
  assert.deepEqual(arrays, [
    TIER_KEYS.origin,
    TIER_KEYS.common,
    TIER_KEYS.rare,
    TIER_KEYS['very-rare'],
  ])
})
