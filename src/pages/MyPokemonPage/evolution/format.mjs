// Text and selection helpers over the server's pokemon_evolution_options json.
const TYPES = {
  normal: 'Thường', fire: 'Lửa', water: 'Nước', electric: 'Điện', grass: 'Cỏ',
  ice: 'Băng', fighting: 'Giác đấu', poison: 'Độc', ground: 'Đất', flying: 'Bay',
  psychic: 'Siêu linh', bug: 'Bọ', rock: 'Đá', ghost: 'Ma', dragon: 'Rồng',
  dark: 'Bóng tối', steel: 'Thép', fairy: 'Tiên',
}
const TIMES = { day: 'ban ngày', dusk: 'hoàng hôn', night: 'ban đêm' }
const type = (t) => TYPES[t] ?? t

export function reasonText(reason) {
  const { code, need, have } = reason
  switch (code) {
    case 'level':
      return `Cần cấp ${need} (đang Lv ${have})`
    case 'affection':
      return `Cần thân thiết ${need}`
    case 'beauty':
      return `Cần vẻ đẹp ${need}`
    case 'time':
      return `Cần ${TIMES[need] ?? need}`
    case 'gender':
      return `Cần giới tính ${need === 'female' ? 'cái' : 'đực'}`
    case 'move':
      return `Cần biết chiêu ${need}`
    case 'move_type':
      return `Cần chiêu hệ ${type(need)}`
    case 'stat_rel':
      return `Cần Tấn công ${need > 0 ? 'cao hơn' : need < 0 ? 'thấp hơn' : 'bằng'} Phòng thủ`
    case 'location':
      return `Cần ở ${need}`
    case 'party_species':
      return `Cần có Pokémon #${need} trong đội`
    case 'party_type':
      return `Cần Pokémon hệ ${type(need)} trong đội`
    case 'trade_species':
      return `Cần sở hữu Pokémon #${need}`
    default:
      return 'Chưa khả dụng'
  }
}

/** {have, need} of the first level reason of the closest alt, else null. */
export function branchProgress(branch) {
  for (const alt of branch.alts) {
    const r = alt.reasons.find((x) => x.code === 'level')
    if (r) return { have: r.have, need: r.need }
  }
  return null
}

/** Branches that ask for a badge: eligible by something other than an item. */
export const readyBranches = (options) =>
  (options?.branches ?? []).filter((b) =>
    b.alts.some((a) => a.ok && a.kind !== 'item')
  )

/** Item alts that fit right now; `owned` comes from the server unless `bag` overrides. */
export const itemBranches = (options, bag = null) =>
  (options?.branches ?? []).flatMap((b) =>
    b.alts
      .filter((a) => a.ok && a.kind === 'item')
      .map((a) => ({ to: b.to, item: a.item, owned: bag ? (bag[a.item] ?? 0) : a.owned }))
  )

export const needsChoice = (ready) => ready.length >= 2
export const defaultChoice = (ready) => (ready.length === 1 ? ready[0].to : null)

/** Stage for the branch bubbles: centre sprite rect and the area bubbles may use. */
export const STAGE = { w: 300, h: 170, sprite: { x: 115, y: 50, w: 70, h: 70 } }

/**
 * Bubble rects (x, y = top-left, size) for `count` branches, none over the
 * centre sprite, none overlapping, all inside STAGE. One branch gets a big
 * bubble to the right; more spread over a left/right/top/bottom ring.
 */
export function bubbleLayout(count) {
  if (count <= 0) return []
  if (count === 1) return [{ x: 188, y: 20, size: 112 }]
  const size = count <= 4 ? 56 : 40
  const { w, h } = STAGE
  const slots = []
  // two columns either side of the sprite, then top and bottom rows
  const side = [
    [8, 12], [w - size - 8, 12], [8, h - size - 14], [w - size - 8, h - size - 14],
    [8, 58], [w - size - 8, 58],
    [w / 2 - size / 2 - size - 12, 4], [w / 2 + size / 2 + 12, 4],
  ]
  for (let i = 0; i < Math.min(count, side.length); i++) {
    slots.push({ x: Math.round(side[i][0]), y: Math.round(side[i][1]), size })
  }
  return slots
}

const okText = (reason) =>
  reasonText(reason).replace(/^Cần /, 'Đạt ').replace(/ \(đang .*\)$/, '')

/**
 * Branches for the prompt: [{to, ready, lines:[{ok,text}]}], ready first.
 * Without `item`: branches reachable without one (lines from the ready alt,
 * else the alt with most conditions met). With `item`: branches that stone fits.
 */
export function promptBranches(options, item = null) {
  const out = []
  for (const b of options?.branches ?? []) {
    const alts = b.alts.filter((a) => (item ? a.kind === 'item' && a.item === item : a.kind !== 'item'))
    if (!alts.length) continue
    const met = (a) => a.reasons.filter((r) => r.ok).length
    const best = alts.find((a) => a.ok) ?? alts.reduce((x, y) => (met(y) > met(x) ? y : x))
    out.push({
      to: b.to,
      ready: alts.some((a) => a.ok),
      lines: best.reasons.map((r) => ({ ok: r.ok, text: r.ok ? okText(r) : reasonText(r) })),
    })
  }
  return [...out.filter((b) => b.ready), ...out.filter((b) => !b.ready)]
}
