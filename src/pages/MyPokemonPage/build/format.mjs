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
