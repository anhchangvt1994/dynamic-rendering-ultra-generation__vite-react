// Presentation helpers for raw PokéAPI fields.

const vi = (value, digits) =>
  value.toLocaleString('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

// "swords-dance" → "Swords Dance"
export const titleCase = (name = '') =>
  name
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')

// PokéAPI height is in decimetres, weight in hectograms.
export const formatHeight = (decimetres) =>
  Number.isFinite(decimetres) ? `${vi(decimetres / 10, 1)} m` : '—'

export const formatWeight = (hectograms) =>
  Number.isFinite(hectograms)
    ? `${vi(hectograms / 10, hectograms % 10 ? 1 : 0)} kg`
    : '—'

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

export const statLabel = (name) => STAT_LABELS[name] || titleCase(name)

const METHODS = {
  'level-up': { order: 0, label: 'Lên cấp' },
  machine: { order: 1, label: 'TM' },
  egg: { order: 2, label: 'Trứng' },
  tutor: { order: 3, label: 'Dạy chiêu' },
}

// How a move is learned in the most recent game that teaches it.
// Level 0 on a level-up move means "learned on evolution".
export function getMoveLearning(entry) {
  const details = entry?.version_group_details ?? []
  const latest = details[details.length - 1]
  const method = latest?.move_learn_method?.name
  const level = latest?.level_learned_at ?? 0
  const known = METHODS[method]
  if (method === 'level-up') {
    return {
      order: known.order,
      level,
      label: level > 0 ? `Lv ${level}` : 'Tiến hóa',
    }
  }
  return {
    order: known ? known.order : 4,
    level: 0,
    label: known ? known.label : 'Khác',
  }
}

// Level-up moves by level first, then TM, egg, tutor; alphabetical within.
export function sortMoves(moves = []) {
  return moves
    .filter((entry) => entry?.move?.name)
    .map((entry) => ({ entry, learning: getMoveLearning(entry) }))
    .sort(
      (a, b) =>
        a.learning.order - b.learning.order ||
        a.learning.level - b.learning.level ||
        a.entry.move.name.localeCompare(b.entry.move.name)
    )
}
