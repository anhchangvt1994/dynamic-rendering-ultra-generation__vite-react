import test from 'node:test'
import assert from 'node:assert/strict'
import { REGIONS, BREAKPOINTS } from './regions.mjs'

test('every region has positive base/md/lg heights', () => {
  for (const key of ['title', 'trainer', 'booth', 'quests']) {
    const r = REGIONS[key]
    assert.ok(r, key)
    for (const k of ['base', 'md', 'lg']) assert.ok(Number.isFinite(r[k]) && r[k] > 0, `${key}.${k}`)
  }
})
test('trainer and quests are tall enough for their content at 320', () => {
  assert.ok(REGIONS.trainer.base >= 160)
  assert.ok(REGIONS.quests.base >= 360)
})
test('breakpoints are 640 and 1024', () => {
  assert.deepEqual(BREAKPOINTS, { md: 640, lg: 1024 })
})
