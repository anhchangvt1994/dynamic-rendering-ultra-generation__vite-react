import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCatalog, renderSeedSql } from './build-catalog.mjs'

const STATS = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
]
const spread = (bst) => {
  const base = Math.floor(bst / 6)
  const out = Array(6).fill(base)
  out[0] += bst - base * 6
  return out
}
const make = (id, o = {}) => {
  const name = o.name ?? `mon-${id}`
  return {
    species: {
      id,
      name,
      capture_rate: o.capture ?? 45,
      is_legendary: o.legendary ?? false,
      is_mythical: o.mythical ?? false,
      varieties: o.varieties ?? [
        {
          is_default: true,
          pokemon: { name, url: `https://pokeapi.co/api/v2/pokemon/${id}/` },
        },
      ],
    },
    pokemon: {
      id,
      name: o.pokemonName ?? name,
      is_default: true,
      species: { name },
      types: o.types ?? [{ slot: 1, type: { name: 'normal' } }],
      stats:
        o.stats ??
        spread(o.bst ?? 300).map((v, i) => ({
          base_stat: v,
          stat: { name: STATS[i] },
        })),
    },
  }
}
const data = (items) => ({
  species: new Map(items.map((i) => [i.species.id, i.species])),
  pokemon: new Map(items.map((i) => [i.pokemon.id, i.pokemon])),
})
const opts = { ids: [1, 2, 3] }
const ok = () => data([make(3), make(1), make(2)])
const fails = (mutate, re = /./) => {
  const d = ok()
  mutate(d)
  assert.throws(() => buildCatalog(d, opts), re)
}

test('builds sorted versioned catalog with ordered stats and power level', () => {
  const c = buildCatalog(ok(), opts)
  assert.equal(c.version, 1)
  assert.deepEqual(
    c.species.map((s) => s.id),
    [1, 2, 3]
  )
  assert.deepEqual(Object.keys(c.species[0]), [
    'id',
    'name',
    'types',
    'captureRate',
    'legendary',
    'mythical',
    'stats',
    'powerLevel',
  ])
  assert.equal(c.species[0].stats.length, 6)
  assert.equal(c.species[0].powerLevel, 2)
})
test('power tier boundaries 199/200, 679/680, 779/780', () => {
  const level = (bst) =>
    buildCatalog(data([make(1, { bst })]), { ids: [1] }).species[0].powerLevel
  assert.deepEqual(
    [199, 200, 679, 680, 779, 780].map(level),
    [0, 1, 7, 8, 8, 9]
  )
})
test('missing, duplicate and mismatched entries reject whole build', () => {
  fails((d) => d.species.delete(2), /species 2/)
  fails((d) => d.pokemon.delete(2), /pokemon 2/)
  fails((d) => d.species.set(2, { ...d.species.get(2), id: 9 }), /id/)
  fails((d) => d.pokemon.set(2, { ...d.pokemon.get(2), id: 7 }), /id/)
  fails(
    (d) => d.pokemon.set(2, { ...d.pokemon.get(2), name: 'other' }),
    /default form/
  )
  fails(
    (d) =>
      (d.species.get(2).varieties = [
        { is_default: false, pokemon: { name: 'mon-2' } },
      ]),
    /default/
  )
  fails((d) => (d.species.get(2).varieties = []), /default/)
  assert.throws(() => buildCatalog(ok(), { ids: [1, 2, 3, 4] }), /species 4/)
  assert.throws(
    () => buildCatalog({ ...ok(), extra: 1 }, { ids: [1, 2] }),
    /unexpected|extra/
  )
})
test('bad capture, flags, stats and types reject', () => {
  for (const capture of [0, 256, 1.5, '45', null])
    fails((d) => (d.species.get(1).capture_rate = capture), /capture/)
  fails((d) => (d.species.get(1).is_legendary = 'no'), /legendary/)
  fails((d) => (d.species.get(1).is_mythical = undefined), /mythical/)
  fails((d) => d.pokemon.get(1).stats.pop(), /stats/)
  fails((d) => (d.pokemon.get(1).stats[0].base_stat = -1), /stat/)
  fails((d) => (d.pokemon.get(1).stats[0].base_stat = 1.5), /stat/)
  fails((d) => d.pokemon.get(1).stats.reverse(), /stat/)
  fails((d) => (d.pokemon.get(1).types = []), /types/)
})
test('generation is deterministic regardless of input order; sql is transactional and escaped', () => {
  const a = buildCatalog(data([make(1), make(2), make(3)]), opts)
  const b = buildCatalog(data([make(3), make(2), make(1)]), opts)
  assert.equal(JSON.stringify(a), JSON.stringify(b))
  const tricky = buildCatalog(data([make(1, { name: "farfetch'd" })]), {
    ids: [1],
  })
  const sql = renderSeedSql(tricky)
  assert.equal(sql, renderSeedSql(tricky))
  assert.match(sql, /^begin;/m)
  assert.match(sql, /commit;\s*$/)
  assert.ok(sql.includes("farfetch''d"))
  assert.match(sql, /insert into public\.pokemon_shard_catalog/)
})
