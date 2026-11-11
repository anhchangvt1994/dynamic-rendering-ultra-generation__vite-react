import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { QUESTS, questState, streakDots } from './quests.mjs'

test('QUESTS equals the quests migration catalog', () => {
  const sql = readFileSync(
    new URL('../../../supabase/migrations/20261122000200_minigame_quests.sql', import.meta.url),
    'utf8',
  )
  const parts = sql.split('$quests$')
  assert.ok(parts.length >= 3)
  assert.deepEqual(JSON.parse(parts[1]), QUESTS)
})

test('questState: doing, done, claimed', () => {
  assert.equal(questState({ progress: 0, goal: 2, claimed: false }), 'doing')
  assert.equal(questState({ progress: 1, goal: 2, claimed: false }), 'doing')
  assert.equal(questState({ progress: 2, goal: 2, claimed: false }), 'done')
  assert.equal(questState({ progress: 2, goal: 2, claimed: true }), 'claimed')
})

test('streakDots lights as many dots as the streak, claimed today or not', () => {
  assert.deepEqual(streakDots(3, false), [true, true, true, false, false, false, false])
  assert.deepEqual(streakDots(3, true), [true, true, true, false, false, false, false])
  assert.deepEqual(streakDots(0, true), Array(7).fill(false))
  assert.equal(streakDots(9, true).length, 7)
})
