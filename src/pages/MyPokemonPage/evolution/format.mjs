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
