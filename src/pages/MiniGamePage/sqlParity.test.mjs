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
  const body = between(migration('20261121000000_trainer.sql'), '$rules$')
  assert.deepEqual(JSON.parse(body), MINIGAME)
})
