import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { MINIGAME } from './minigame.mjs'

const migration = (name) =>
  readFileSync(
    new URL(`../../../supabase/migrations/${name}`, import.meta.url),
    'utf8',
  )

const between = (sql, tag) => {
  const parts = sql.split(tag)
  assert.ok(parts.length >= 3, `${tag} block not found`)
  return parts[1]
}

test('minigame_rules() equals MINIGAME', () => {
  const body = between(migration('20261123000000_minigame_candy.sql'), '$rules$')
  assert.deepEqual(JSON.parse(body), MINIGAME)
})

test('trainer_avatars() equals AVATARS', async () => {
  const { AVATARS } = await import('./avatars.mjs')
  const body = between(migration('20261122000400_avatar_unlocks.sql'), '$avatars$')
  assert.deepEqual(JSON.parse(body), AVATARS)
})

test('the candy pgTAP file carries every vector', () => {
  const sql = readFileSync(
    new URL('../../../supabase/tests/database/minigame_candy.test.sql', import.meta.url),
    'utf8',
  )
  const vectors = JSON.parse(
    readFileSync(new URL('./games/candy/vectors.json', import.meta.url), 'utf8'),
  )
  assert.ok(vectors.length >= 5)
  for (const v of vectors) {
    assert.ok(sql.includes(JSON.stringify(v.tape)), `${v.name}: tape`)
    assert.ok(sql.includes(JSON.stringify(v.moves)), `${v.name}: moves`)
    assert.ok(sql.includes(`"score":${v.score}`), `${v.name}: score`)
  }
})
