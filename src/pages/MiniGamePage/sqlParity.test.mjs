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
  const body = between(migration('20261122000000_minigame_v2_rules.sql'), '$rules$')
  assert.deepEqual(JSON.parse(body), MINIGAME)
})

test('trainer_avatars() equals AVATARS', async () => {
  const { AVATARS } = await import('./avatars.mjs')
  const body = between(migration('20261121000050_trainer_badges.sql'), '$avatars$')
  assert.deepEqual(JSON.parse(body), AVATARS)
})
