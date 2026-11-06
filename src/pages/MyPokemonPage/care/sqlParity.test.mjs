// The database applies the same care rules as care.mjs and likes.mjs: the
// migration's pokemon_care_rules() holds CARE as JSON and its taste table
// holds LIKES in order.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { CARE } from './care.mjs'
import { LIKES } from './likes.mjs'

const sql = readFileSync(
  new URL(
    '../../../../supabase/migrations/20261113000000_pokemon_care.sql',
    import.meta.url
  ),
  'utf8'
)

test('pokemon_care_rules() is CARE', () => {
  const match = sql.match(
    /function public\.pokemon_care_rules\(\)[\s\S]*?\$rules\$([\s\S]*?)\$rules\$/
  )
  assert.ok(match, 'pokemon_care_rules() with a $rules$ JSON body')
  assert.deepEqual(JSON.parse(match[1]), CARE)
})

test('pokemon_care_taste holds LIKES in order', () => {
  const pairs = LIKES.map(
    ({ like, dislike }) => `array['${like}','${dislike}']`
  ).join(',\n    ')
  assert.ok(sql.includes(pairs), `taste table:\n    ${pairs}`)
})
