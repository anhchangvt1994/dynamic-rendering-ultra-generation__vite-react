// Presentation helpers for a individual's build (the server computes it).

// "swords-dance" → "Swords Dance"
export const titleCase = (name = '') =>
  name
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')

// index = 5 × raised + lowered over (atk, def, spe, spa, spd); equal = neutral
export const NATURE_VI = [
  'Cứng cỏi',
  'Cô độc',
  'Dũng cảm',
  'Kiên quyết',
  'Nghịch ngợm',
  'Táo bạo',
  'Ngoan ngoãn',
  'Thư thái',
  'Tinh quái',
  'Phóng khoáng',
  'Nhút nhát',
  'Hấp tấp',
  'Nghiêm túc',
  'Vui vẻ',
  'Ngây thơ',
  'Khiêm tốn',
  'Hiền lành',
  'Điềm đạm',
  'E thẹn',
  'Liều lĩnh',
  'Bình tĩnh',
  'Dịu dàng',
  'Láo lếu',
  'Cẩn trọng',
  'Kỳ quặc',
]

const NATURE_STATS = [1, 2, 5, 3, 4]

/** Stat indexes (0..5) a nature raises and lowers; null when neutral. */
export function natureEffect(nature) {
  const up = Math.floor(nature / 5)
  const down = nature % 5
  return up === down ? null : { up: NATURE_STATS[up], down: NATURE_STATS[down] }
}

const STATS = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed']
export const statLabel = (idx) => STATS[idx] ?? ''

export const abilityLabel = ({ name, hidden }) =>
  `${titleCase(name)}${hidden ? ' (hiếm)' : ''}`

export const AFFECTION_MOVES = 150
export const AFFECTION_MOVES_LEVEL = 6

/**
 * Why a learnset entry can't be set yet, or null. `entry` is a learnset row
 * {move, method, level, item?}; `bag` maps item id → count.
 */
export function moveLockReason(entry, build, bag, affection = 0) {
  if (entry.method === 'level-up')
    return build.level >= entry.level ? null : `Cần cấp ${entry.level}`
  if (entry.method === 'machine')
    return (bag?.[entry.item] ?? 0) > 0
      ? null
      : `Cần TM ${titleCase(entry.move)}`
  return affection >= AFFECTION_MOVES
    ? null
    : `Cần thân thiết cấp ${AFFECTION_MOVES_LEVEL}`
}

const METHOD_ORDER = { 'level-up': 0, machine: 1, egg: 2, tutor: 3 }
export const METHOD_VI = {
  'level-up': 'Lên cấp',
  machine: 'TM',
  egg: 'Trứng',
  tutor: 'Dạy chiêu',
}

/**
 * One row per move for the picker: the route that opens it (else the
 * nearest one) and why it is still locked. Open moves first.
 */
export function mergeLearnset(learnset, moves, build, bag, affection = 0) {
  const byMove = new Map()
  for (const entry of learnset) {
    const reason = moveLockReason(entry, build, bag, affection)
    const best = byMove.get(entry.move)
    const better =
      !best ||
      (reason === null && best.reason !== null) ||
      ((reason === null) === (best.reason === null) &&
        (METHOD_ORDER[entry.method] ?? 9) < (METHOD_ORDER[best.method] ?? 9))
    if (better) byMove.set(entry.move, { ...entry, reason })
  }
  return [...byMove.values()]
    .map((row) => ({ ...row, ...(moves[row.move] ?? {}) }))
    .sort(
      (a, b) =>
        (a.reason === null ? 0 : 1) - (b.reason === null ? 0 : 1) ||
        (METHOD_ORDER[a.method] ?? 9) - (METHOD_ORDER[b.method] ?? 9) ||
        a.level - b.level ||
        a.move.localeCompare(b.move)
    )
}

/** Stars now: the server's build (items and awakening raise them), else the birth stars. */
export const starsFor = (build, birthStars) => build?.stars ?? birthStars

/** What changed between two builds of one individual; null when nothing did. */
export function buildDiff(prev, next) {
  if (!prev || !next || prev.species !== next.species) return null
  const stats = next.stats.map((v, i) => v - prev.stats[i])
  const ev = next.ev.map((v, i) => v - prev.ev[i])
  const level = next.level - prev.level
  const exp = next.exp - prev.exp
  if (!level && !exp && !stats.some(Boolean) && !ev.some(Boolean)) return null
  return { level, exp, stats, ev }
}
