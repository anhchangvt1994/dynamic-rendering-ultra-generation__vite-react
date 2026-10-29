// Presentation helpers for raw PokéAPI fields.
import { versionOrder } from './version-order.mjs'

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
  train: { order: 4, label: 'Huấn luyện' },
}

// How a move is learned in the most recent game that teaches it.
// Level 0 on a level-up move means "learned on evolution".
export function getMoveLearning(entry) {
  const details = entry?.version_group_details ?? []
  const id = (detail) => versionOrder(detail.version_group)
  const latestId = Math.max(0, ...details.map(id))
  const routes = latestId
    ? details.filter((detail) => id(detail) === latestId)
    : details.slice(-1)
  // Same game can teach the same move by level AND TM; prefer the earliest
  // level route instead of whichever record happens to occur last.
  const latest = [...routes].sort(
    (a, b) =>
      (METHODS[a.move_learn_method?.name]?.order ?? 4) -
        (METHODS[b.move_learn_method?.name]?.order ?? 4) ||
      (a.level_learned_at ?? 0) - (b.level_learned_at ?? 0)
  )[0]
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

// Official names that title-casing a slug cannot rebuild.
const OFFICIAL = {
  'mr-mime': 'Mr. Mime',
  'mime-jr': 'Mime Jr.',
  'mr-rime': 'Mr. Rime',
  farfetchd: 'Farfetch’d',
  sirfetchd: 'Sirfetch’d',
  'type-null': 'Type: Null',
  'nidoran-f': 'Nidoran♀',
  'nidoran-m': 'Nidoran♂',
  flabebe: 'Flabébé',
  'ho-oh': 'Ho-Oh',
  'porygon-z': 'Porygon-Z',
  'jangmo-o': 'Jangmo-o',
  'hakamo-o': 'Hakamo-o',
  'kommo-o': 'Kommo-o',
  'wo-chien': 'Wo-Chien',
  'chien-pao': 'Chien-Pao',
  'ting-lu': 'Ting-Lu',
  'chi-yu': 'Chi-Yu',
}

/**
 * Display name from a PokéAPI slug: official spellings (Mr. Mime, Ho-Oh,
 * Nidoran♀) and default-form suffixes dropped ("deoxys-normal" → "Deoxys").
 */
export function pokemonLabel(name = '') {
  if (OFFICIAL[name]) return OFFICIAL[name]
  const FORM_SUFFIX =
    /-(normal|altered|land|incarnate|ordinary|aria|average|50|plant|standard|shield|midday|solo|disguised|amped|full-belly|single-strike|red-striped|green-plumage|male|family-of-four|zero|curly|two-segment|baile|red-meteor|female)$/
  const species = name.replace(FORM_SUFFIX, '')
  if (OFFICIAL[species]) return OFFICIAL[species]
  return species
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}
