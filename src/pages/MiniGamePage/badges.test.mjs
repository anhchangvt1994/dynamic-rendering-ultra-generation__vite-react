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

test('twelve unique avatars, three free, none unlocked by a badge', () => {
  assert.equal(AVATARS.length, 12)
  assert.equal(new Set(AVATARS.map((a) => a.id)).size, 12)
  assert.equal(AVATARS.filter((a) => a.unlock.type === 'free').length, 3)
  assert.equal(AVATARS[0].id, 'rookie')
  assert.equal(AVATARS.filter((a) => a.unlock.type === 'badge').length, 0)
})

test('avatarUnlocked by level, wins, owned and team', () => {
  const by = (id) => AVATARS.find((a) => a.id === id)
  const none = { level: 1, wins: 0, owned: 0, team: 0 }
  assert.equal(avatarUnlocked(by('hiker'), { ...none, level: 4 }), false)
  assert.equal(avatarUnlocked(by('hiker'), { ...none, level: 5 }), true)
  assert.equal(avatarUnlocked(by('duelist'), none), false)
  assert.equal(avatarUnlocked(by('duelist'), { ...none, wins: 1 }), true)
  assert.equal(avatarUnlocked(by('sage'), { ...none, wins: 9 }), false)
  assert.equal(avatarUnlocked(by('sage'), { ...none, wins: 10 }), true)
  assert.equal(avatarUnlocked(by('collector'), { ...none, owned: 19 }), false)
  assert.equal(avatarUnlocked(by('collector'), { ...none, owned: 20 }), true)
  assert.equal(avatarUnlocked(by('captain'), { ...none, team: 5 }), false)
  assert.equal(avatarUnlocked(by('captain'), { ...none, team: 6 }), true)
  assert.equal(avatarUnlocked(AVATARS[0], none), true)
})
