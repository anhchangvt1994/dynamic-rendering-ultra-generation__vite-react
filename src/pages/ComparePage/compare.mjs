// Side-by-side numbers for two Pokémon payloads (PokéAPI /pokemon).

import { pokemonLabel } from '../../components/pokemon-page/format.mjs'
import { TYPE_DATA } from '../../components/pokemon-page/type-data.mjs'
import { getDefenses } from '../PokemonPage/effectiveness.mjs'
import { getPokemonPower } from '../PokemonPage/power.mjs'

export const STAT_ORDER = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
]

export const statsOf = (pokemon) =>
  Object.fromEntries(
    STAT_ORDER.map((name) => [
      name,
      Number(pokemon?.stats?.find((s) => s?.stat?.name === name)?.base_stat) ||
        0,
    ])
  )

/**
 * Per stat: both values, the difference (a − b) and who leads
 * ('a' | 'b' | 'tie'); plus totals and how many stats each side wins.
 */
export function compareStats(a, b) {
  const left = statsOf(a)
  const right = statsOf(b)
  const rows = STAT_ORDER.map((name) => {
    const diff = left[name] - right[name]
    return {
      name,
      a: left[name],
      b: right[name],
      diff,
      lead: diff > 0 ? 'a' : diff < 0 ? 'b' : 'tie',
    }
  })
  const total = (side) => rows.reduce((sum, row) => sum + row[side], 0)
  return {
    rows,
    totalA: total('a'),
    totalB: total('b'),
    winsA: rows.filter((row) => row.lead === 'a').length,
    winsB: rows.filter((row) => row.lead === 'b').length,
  }
}

const cleanSlug = (value) =>
  /^[a-z0-9-]{1,40}$/.test(value || '') ? value : ''

/** Reads the old ?a=&b= links (slugs only); they move to comparePath. */
export function readComparePair(search = '') {
  const params = new URLSearchParams(search)
  return { a: cleanSlug(params.get('a')), b: cleanSlug(params.get('b')) }
}

/**
 * Reads the pair from the path: /so-sanh/charizard-vs-blastoise, only A
 * /so-sanh/charizard, only B /so-sanh/vs-blastoise. No Pokémon name holds
 * "-vs-" or starts with "vs-".
 */
export function readComparePath(pathname = '') {
  const match = pathname.match(/^\/so-sanh\/([^/?#]+)\/?$/)
  if (!match) return { a: '', b: '' }
  let pair = ''
  try {
    pair = decodeURIComponent(match[1]).toLowerCase()
  } catch {
    return { a: '', b: '' }
  }
  if (pair.startsWith('vs-')) return { a: '', b: cleanSlug(pair.slice(3)) }
  const at = pair.indexOf('-vs-')
  if (at < 0) return { a: cleanSlug(pair), b: '' }
  return { a: cleanSlug(pair.slice(0, at)), b: cleanSlug(pair.slice(at + 4)) }
}

/** The page of a pair: one clean, shareable, indexable path per pair. */
export function comparePath({ a = '', b = '' } = {}) {
  if (a && b) return `/so-sanh/${a}-vs-${b}`
  if (a) return `/so-sanh/${a}`
  if (b) return `/so-sanh/vs-${b}`
  return '/so-sanh'
}

/** Who leads: the higher total, then more stats won; null on a dead heat. */
export function leaderOf(result) {
  if (!result) return null
  if (result.totalA !== result.totalB)
    return result.totalA > result.totalB ? 'a' : 'b'
  if (result.winsA !== result.winsB)
    return result.winsA > result.winsB ? 'a' : 'b'
  return null
}

/** The one-line verdict shown under the arena (and shared). */
export function verdictOf(a, b, result = compareStats(a, b)) {
  const leader = leaderOf(result)
  if (!leader) return 'Ngang tài ngang sức!'
  const name = pokemonLabel((leader === 'a' ? a : b).name)
  const wins = leader === 'a' ? result.winsA : result.winsB
  const gap = Math.abs(result.totalA - result.totalB)
  return gap
    ? `${name} nhỉnh hơn ${gap} điểm, thắng ${wins}/6 chỉ số.`
    : `Cùng ${result.totalA} điểm; ${name} thắng ${wins}/6 chỉ số.`
}

const typesText = (pokemon) =>
  (pokemon?.types ?? [])
    .map(({ type }) => TYPE_DATA[type?.name]?.label ?? type?.name)
    .join('/')

/**
 * What a shared comparison says before anyone opens it: title (≤ 60
 * characters for the common pairs), a description with the numbers that
 * make people click, and the share card's alt text. Works for 0, 1 or 2
 * Pokémon.
 */
export function compareCopy(a, b) {
  if (a && b) {
    const nameA = pokemonLabel(a.name)
    const nameB = pokemonLabel(b.name)
    const powerA = getPokemonPower(a.stats)
    const powerB = getPokemonPower(b.stats)
    const verdict = verdictOf(a, b)
    return {
      title: `${nameA} vs ${nameB}: ai mạnh hơn? | Pokédex`,
      description: `${nameA} (hạng ${powerA.rank}, ${powerA.bst} BST) đấu ${nameB} (hạng ${powerB.rank}, ${powerB.bst} BST). ${verdict} Xem từng chỉ số và hệ khắc chế!`,
      alt: `${nameA} đối đầu ${nameB}: ${verdict}`,
    }
  }
  const one = a || b
  if (one) {
    const name = pokemonLabel(one.name)
    const power = getPokemonPower(one.stats)
    return {
      title: `${name} đấu với ai thì thắng? So sánh | Pokédex`,
      description: `${name} (${typesText(one)}, hạng ${power.rank}, ${power.bst} BST) đang chờ đối thủ. Chọn một Pokémon để xem ai mạnh hơn ở từng chỉ số và hệ nào khắc chế.`,
      alt: `${name} đang chờ đối thủ`,
    }
  }
  return {
    title: 'So sánh Pokémon: ai mạnh hơn? | Pokédex',
    description:
      'Đặt hai Pokémon cạnh nhau: hạng sức mạnh, tổng chỉ số (BST), hệ khắc chế và 6 chỉ số cơ bản. Chọn cặp đấu rồi chia sẻ kết quả cho bạn bè!',
    alt: 'Hai Pokéball đối mặt: ai mạnh hơn?',
  }
}

/**
 * The attacker's strongest same-type hit on the defender: each of its own
 * types against the defender's typing (PokéAPI /type payloads). Null until
 * every defender type has loaded.
 */
export function bestHit(attackerTypes = [], defenderTypes = []) {
  const defenses = getDefenses(defenderTypes)
  if (!attackerTypes.length || !defenses.length) return null
  return attackerTypes
    .map((type) => ({
      type,
      multiplier:
        defenses.find((entry) => entry.name === type)?.multiplier ?? 1,
    }))
    .reduce((best, hit) => (hit.multiplier > best.multiplier ? hit : best))
}

/** Plain words for a damage multiplier. */
export function hitLabel(multiplier) {
  if (multiplier >= 4) return 'Cực kỳ hiệu quả'
  if (multiplier >= 2) return 'Rất hiệu quả'
  if (multiplier === 1) return 'Bình thường'
  if (multiplier === 0) return 'Không tác dụng'
  return 'Kém hiệu quả'
}

/** ×2, ×½, ×¼ … as printed on the card. */
export const formatMultiplier = (multiplier) =>
  `×${{ 0.5: '½', 0.25: '¼' }[multiplier] ?? multiplier}`
