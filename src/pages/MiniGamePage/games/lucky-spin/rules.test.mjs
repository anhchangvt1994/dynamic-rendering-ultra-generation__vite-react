import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseOutcome, rewardFor } from './rules.mjs'

test('maps injected random boundaries into server-portable outcomes', () => {
  assert.equal(chooseOutcome(() => 0), 'common')
  assert.equal(chooseOutcome(() => 0.999999), 'rare')
  assert.deepEqual(rewardFor('common'), { xp: 1, items: [] })
  assert.throws(() => rewardFor('cash'), { message: 'bad_outcome' })
})
