import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const golden = JSON.parse(
  readFileSync(new URL('./golden.json', import.meta.url), 'utf8')
)
const sql = readFileSync(
  new URL(
    '../../../../supabase/tests/database/pokemon_individuals.test.sql',
    import.meta.url
  ),
  'utf8'
)

// the pgTAP file carries every golden vector verbatim: one fixture, two suites
test('the pgTAP suite checks every golden vector', () => {
  for (const { id, traits } of golden) {
    assert.ok(sql.includes(`'${id}'::uuid`), `id ${id} missing in pgTAP`)
    assert.ok(sql.includes(JSON.stringify(traits)), `traits of ${id} missing`)
  }
  const checked = sql.match(/pokemon_individual_traits\(/g) ?? []
  assert.equal(checked.length, golden.length)
})
