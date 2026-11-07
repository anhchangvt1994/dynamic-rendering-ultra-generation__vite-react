import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SET_KEYS, TIER_KEYS, VIBES } from './palettes.mjs'

const golden = JSON.parse(
  readFileSync(new URL('./golden.json', import.meta.url), 'utf8')
)
const read = (path) =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf8')
const sql = read('supabase/tests/database/pokemon_individuals.test.sql')
const migration = read(
  'supabase/migrations/20261117000000_pokemon_vibe_palettes.sql'
)
const array = (keys) => `array[${keys.map((k) => `'${k}'`).join(',')}]`

// the pgTAP file carries every golden vector verbatim: one fixture, two suites
test('the pgTAP suite checks every golden vector', () => {
  for (const { id, vibe, traits } of golden) {
    const call = `pokemon_individual_traits_v('${id}'::uuid,${vibe ? `'${vibe}'` : 'null'})`
    assert.ok(sql.includes(call), `${call} missing in pgTAP`)
    assert.ok(sql.includes(JSON.stringify(traits)), `traits of ${id} missing`)
  }
  const checked =
    sql.match(/select is\(public\.pokemon_individual_traits_v\(/g) ?? []
  assert.equal(checked.length, golden.length)
})

test('the SQL palette arrays match palettes.mjs', () => {
  for (const set of [...VIBES, 'pool'])
    for (const tier of ['common', 'rare'])
      assert.ok(
        migration.includes(array(SET_KEYS[set][tier])),
        `${set} ${tier}: ${array(SET_KEYS[set][tier])}`
      )
  assert.ok(migration.includes(array(TIER_KEYS['very-rare'])), 'very-rare')
})
