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

test('bubbleLayout keeps every bubble inside the stage and off the centre sprite', async () => {
  const { bubbleLayout, STAGE } = await import('./format.mjs')
  assert.deepEqual(STAGE, { w: 300, h: 170, sprite: { x: 115, y: 50, w: 70, h: 70 } })
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  for (let n = 1; n <= 8; n++) {
    const bubbles = bubbleLayout(n)
    assert.equal(bubbles.length, n)
    bubbles.forEach((b, i) => {
      const r = { x: b.x, y: b.y, w: b.size, h: b.size }
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.size <= STAGE.w && b.y + b.size <= STAGE.h, `n=${n} #${i} outside`)
      assert.ok(!hit(r, STAGE.sprite), `n=${n} #${i} covers the sprite`)
      bubbles.slice(i + 1).forEach((o, j) =>
        assert.ok(!hit(r, { x: o.x, y: o.y, w: o.size, h: o.size }), `n=${n} #${i}/#${i + 1 + j} overlap`)
      )
    })
  }
})

test('promptBranches: ready first, item-only left out, lines from the closest alt', async () => {
  const { promptBranches } = await import('./format.mjs')
  const r = (code, ok, need, have) => ({ code, ok, need, have })
  const options = {
    branches: [
      { to: 197, alts: [{ kind: 'affection', ok: false, reasons: [r('affection', false, 220), r('time', false, 'night')] }] },
      { to: 134, alts: [{ kind: 'item', item: 'water-stone', ok: true, reasons: [] }] },
      { to: 196, alts: [{ kind: 'affection', ok: true, reasons: [r('affection', true, 220), r('time', true, 'day')] }] },
    ],
  }
  const view = promptBranches(options)
  assert.deepEqual(view.map((b) => [b.to, b.ready]), [[196, true], [197, false]])
  assert.deepEqual(view[0].lines, [
    { ok: true, text: 'Đạt thân thiết 220' },
    { ok: true, text: 'Đạt ban ngày' },
  ])
  assert.equal(view[1].lines[1].text, 'Cần ban đêm')
  const stone = promptBranches(options, 'water-stone')
  assert.deepEqual(stone.map((b) => [b.to, b.ready]), [[134, true]])
  assert.deepEqual(promptBranches(null), [])
})
