import assert from 'node:assert/strict'
import test from 'node:test'
import {
  branchProgress,
  defaultChoice,
  itemBranches,
  needsChoice,
  readyBranches,
  reasonText,
} from './format.mjs'

test('every reason code renders text', () => {
  const cases = [
    [{ code: 'level', ok: false, need: 16, have: 12 }, 'Cần cấp 16 (đang Lv 12)'],
    [{ code: 'affection', ok: false, need: 220, have: 10 }, 'Cần thân thiết 220'],
    [{ code: 'beauty', ok: false, need: 100, have: 3 }, 'Cần vẻ đẹp 100'],
    [{ code: 'time', ok: false, need: 'night', have: 'day' }, 'Cần ban đêm'],
    [{ code: 'time', ok: false, need: 'day' }, 'Cần ban ngày'],
    [{ code: 'time', ok: false, need: 'dusk' }, 'Cần hoàng hôn'],
    [{ code: 'gender', ok: false, need: 'female' }, 'Cần giới tính cái'],
    [{ code: 'gender', ok: false, need: 'male' }, 'Cần giới tính đực'],
    [{ code: 'move', ok: false, need: 'rollout' }, 'Cần biết chiêu rollout'],
    [{ code: 'move_type', ok: false, need: 'fairy' }, 'Cần chiêu hệ Tiên'],
    [{ code: 'stat_rel', ok: false, need: 1 }, 'Cần Tấn công cao hơn Phòng thủ'],
    [{ code: 'stat_rel', ok: false, need: -1 }, 'Cần Tấn công thấp hơn Phòng thủ'],
    [{ code: 'stat_rel', ok: false, need: 0 }, 'Cần Tấn công bằng Phòng thủ'],
    [{ code: 'location', ok: false, need: 'viridian-forest' }, 'Cần ở viridian-forest'],
    [{ code: 'party_species', ok: false, need: 14 }, 'Cần có Pokémon #14 trong đội'],
    [{ code: 'party_type', ok: false, need: 'dark' }, 'Cần Pokémon hệ Bóng tối trong đội'],
    [{ code: 'trade_species', ok: false, need: 25 }, 'Cần sở hữu Pokémon #25'],
    [{ code: 'unavailable', ok: false, why: 'battle' }, 'Chưa khả dụng'],
  ]
  for (const [reason, text] of cases) assert.equal(reasonText(reason), text)
})

test('reasonText names the item when given', () => {
  assert.equal(reasonText({ code: 'trade_species', ok: false, need: 25 }, { itemName: 'Dây liên kết' }), 'Cần sở hữu Pokémon #25')
})

const level = (need, have, ok) => ({ code: 'level', ok, need, have })
const alt = (kind, ok, reasons = [], extra = {}) => ({ alt: 0, kind, ok, reasons, item: null, owned: null, unavailable: null, ...extra })
const branch = (to, kind, alts) => ({ to, kind, eligible: alts.some((a) => a.ok), alts })

test('branchProgress reads the level reason', () => {
  const b = branch(5, 'level', [alt('level', false, [level(16, 12, false)])])
  assert.deepEqual(branchProgress(b), { have: 12, need: 16 })
  assert.equal(branchProgress(branch(6, 'item', [alt('item', true)])), null)
})

test('readyBranches ignores item branches, unavailable and not-ready ones', () => {
  const options = {
    branches: [
      branch(5, 'level', [alt('level', true, [level(16, 16, true)])]),
      branch(134, 'item', [alt('item', true, [], { item: 'water-stone', owned: 1 })]),
      branch(196, 'friend', [alt('friend', false)]),
      branch(197, 'other', [alt('other', false, [{ code: 'unavailable', ok: false, why: 'battle' }], { unavailable: 'battle' })]),
    ],
  }
  assert.deepEqual(readyBranches(options).map((b) => b.to), [5])
  assert.deepEqual(readyBranches({ branches: [] }), [])
})

test('itemBranches lists item alts with the bag count', () => {
  const options = {
    branches: [
      branch(134, 'item', [alt('item', true, [], { item: 'water-stone', owned: 0 })]),
      branch(5, 'level', [alt('level', true)]),
      branch(135, 'item', [alt('item', false, [{ code: 'time', ok: false }], { item: 'thunder-stone', owned: 2 })]),
    ],
  }
  assert.deepEqual(itemBranches(options), [{ to: 134, item: 'water-stone', owned: 0 }])
})

test('needsChoice and defaultChoice for 0, 1 and 3 branches', () => {
  const r = (n) => Array.from({ length: n }, (_, i) => ({ to: 10 + i }))
  assert.equal(needsChoice(r(0)), false)
  assert.equal(needsChoice(r(1)), false)
  assert.equal(needsChoice(r(3)), true)
  assert.equal(defaultChoice(r(0)), null)
  assert.equal(defaultChoice(r(1)), 10)
  assert.equal(defaultChoice(r(3)), null)
})
