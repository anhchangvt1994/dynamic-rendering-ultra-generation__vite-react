import assert from 'node:assert/strict'
import test from 'node:test'
import { AVATARS, avatarUnlocked } from './avatars.mjs'
import { BADGES } from './badges.mjs'

test('badge catalog has the eleven badges', () => {
  assert.deepEqual(
    BADGES.map((b) => b.id),
    [
      'first_win',
      'wins10_memory',
      'flawless',
      'owned_5',
      'owned_20',
      'owned_50',
      'full_team',
      'level_5',
      'level_10',
      'level_20',
      'level_30',
    ],
  )
  for (const b of BADGES) assert.ok(b.label && b.hint, b.id)
})

test('twelve unique avatars, three free, every badge unlock exists', () => {
  assert.equal(AVATARS.length, 12)
  assert.equal(new Set(AVATARS.map((a) => a.id)).size, 12)
  assert.equal(AVATARS.filter((a) => a.unlock.type === 'free').length, 3)
  assert.equal(AVATARS[0].id, 'rookie')
  const badgeIds = new Set(BADGES.map((b) => b.id))
  for (const a of AVATARS) {
    if (a.unlock.type === 'badge') assert.ok(badgeIds.has(a.unlock.badge), a.id)
  }
})

test('avatarUnlocked by level and by badge', () => {
  const byLevel = AVATARS.find((a) => a.unlock.type === 'level' && a.unlock.level === 5)
  assert.equal(avatarUnlocked(byLevel, { level: 4, badges: [] }), false)
  assert.equal(avatarUnlocked(byLevel, { level: 5, badges: [] }), true)
  const byBadge = AVATARS.find((a) => a.unlock.type === 'badge')
  assert.equal(avatarUnlocked(byBadge, { level: 30, badges: [] }), false)
  assert.equal(
    avatarUnlocked(byBadge, { level: 1, badges: [byBadge.unlock.badge] }),
    true,
  )
  assert.equal(avatarUnlocked(AVATARS[0], { level: 1, badges: [] }), true)
})
