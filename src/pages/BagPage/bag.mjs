// The bag page: pockets, order and numbers over the quiz's bag
// ({ [item id]: count }, kept by pages/QuizPage/progress.mjs).
import { GROUPS, ITEMS, VALUABLE } from '../QuizPage/items.mjs'
import { fullCount } from '../QuizPage/progress.mjs'

export const BAG_KEY = 'pokedex:bag'

/** The bag's pockets, as in the games: one per kind of use, each its colour. */
export const POCKETS = [
  { id: 'all', label: 'Tất cả', color: '#ffda55' },
  { id: 'stat', label: GROUPS.stat.label, color: '#ff6a4a' },
  { id: 'friend', label: GROUPS.friend.label, color: '#ff8fc8' },
  { id: 'evo', label: GROUPS.evo.label, color: '#ffb02e' },
  { id: 'heal', label: GROUPS.heal.label, color: '#4fd18b' },
  { id: 'move', label: GROUPS.move.label, color: '#4aa8ff' },
]
export const pocketOf = (id) => POCKETS.find((p) => p.id === id) ?? POCKETS[0]

export const SORTS = [
  { id: 'value', label: 'Giá trị' },
  { id: 'count', label: 'Số lượng' },
  { id: 'name', label: 'Tên' },
]

const owned = (bag, id) => Math.max(0, Math.floor(Number(bag?.[id]) || 0))

/**
 * The rows of a pocket: { item, count }, owned ones first unless the
 * catalogue is shown in full (then the missing ones come in their place).
 */
export function bagRows(
  bag,
  { pocket = 'all', sort = 'value', missing = false } = {}
) {
  const order = new Map(ITEMS.map((item, index) => [item.id, index]))
  const rows = ITEMS.filter((item) => pocket === 'all' || item.group === pocket)
    .map((item) => ({ item, count: owned(bag, item.id) }))
    .filter((row) => missing || row.count > 0)
  const byValue = (a, b) => order.get(a.item.id) - order.get(b.item.id)
  const compare =
    {
      value: byValue,
      count: (a, b) => b.count - a.count || byValue(a, b),
      name: (a, b) => a.item.name.localeCompare(b.item.name, 'en'),
    }[sort] ?? byValue
  return rows.sort(compare)
}

/** The bag in numbers: units, kinds out of the catalogue, units per tier and per pocket. */
export function bagStats(bag) {
  const stats = {
    total: 0,
    kinds: 0,
    catalogue: ITEMS.length,
    valuable: 0,
    tiers: { 4: 0, 3: 0, 2: 0, 1: 0 },
    pockets: {},
  }
  for (const pocket of POCKETS) stats.pockets[pocket.id] = 0
  for (const item of ITEMS) {
    const count = owned(bag, item.id)
    if (!count) continue
    stats.total += count
    stats.kinds += 1
    stats.tiers[item.tier] += count
    if (item.tier >= VALUABLE) stats.valuable += count
    stats.pockets.all += count
    stats.pockets[item.group] += count
  }
  return stats
}

/** A row's count: in full, up to 99.999 (five digits keep the column steady). */
export const rowCount = (n) => (n > 99999 ? '99.999+' : fullCount(n))
