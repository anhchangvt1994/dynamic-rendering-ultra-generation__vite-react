import test from 'node:test'
import assert from 'node:assert/strict'
import { REGIONS, BREAKPOINTS } from './regions.mjs'

test('regions are exactly title, booth and quests, with positive base/md/lg heights', () => {
  assert.deepEqual(Object.keys(REGIONS), ['title', 'booth', 'quests'])
  for (const [key, r] of Object.entries(REGIONS))
    for (const k of ['base', 'md', 'lg']) assert.ok(Number.isFinite(r[k]) && r[k] > 0, `${key}.${k}`)
})
test('cabinets grow with the screen', () => {
  assert.ok(REGIONS.booth.lg >= REGIONS.booth.md && REGIONS.booth.md >= REGIONS.booth.base)
})
test('the quests strip is shorter from md up than on a phone', () => {
  assert.ok(REGIONS.quests.md < REGIONS.quests.base)
  assert.ok(REGIONS.quests.lg <= REGIONS.quests.md)
})
test('breakpoints are 640 and 1024', () => {
  assert.deepEqual(BREAKPOINTS, { md: 640, lg: 1024 })
})
