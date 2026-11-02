// The kitchen's public rules (docs/superpowers/specs/2026-11-02-kitchen-design.md):
// stats, flavours, kinds, how a dish's stats come from its ingredients, and
// a secret dish's clue. Nothing secret here: the page ships it.
import { FLAVORS, FLAVOR_INFO, itemById } from '../QuizPage/items.mjs'

/** The stats a dish feeds, each with the flavour behind it and its colour. */
export const STATS = {
  power: { label: 'Sức mạnh', flavor: 'spicy', color: '#e5483b' },
  beauty: { label: 'Sắc đẹp', flavor: 'dry', color: '#3b7be5' },
  happiness: { label: 'Hạnh phúc', flavor: 'sweet', color: '#f07cb4' },
  agility: { label: 'Linh hoạt', flavor: 'sour', color: '#e8c022' },
  wisdom: { label: 'Trí tuệ', flavor: 'bitter', color: '#3fa463' },
  friendship: { label: 'Thân thiện', flavor: null, color: '#ff9f43' },
}

export const FLAVOR_LABEL = Object.fromEntries(
  Object.entries(FLAVOR_INFO).map(([flavor, info]) => [flavor, info.label])
)
export const FLAVOR_STAT = {
  spicy: 'power',
  dry: 'beauty',
  sweet: 'happiness',
  sour: 'agility',
  bitter: 'wisdom',
}

/** The 8 kinds of dish, one drawing each (DishArt.tsx). */
export const KINDS = {
  poffin: { label: 'Poffin' },
  cake: { label: 'Bánh kem' },
  curry: { label: 'Cà ri' },
  smoothie: { label: 'Đồ uống' },
  jelly: { label: 'Kẹo dẻo' },
  sandwich: { label: 'Bánh kẹp' },
  soup: { label: 'Súp' },
  pudding: { label: 'Pudding' },
}

/** A recipe's identity: its ingredients sorted (a multiset). */
export const recipeKey = (ingredients) => [...ingredients].sort().join('+')

/**
 * What a dish gives: each flavour's potencies summed / 10 as its stat, the 3
 * strongest kept (ties by flavour name), friendship for every ingredient;
 * secret dishes × 1.5, rounded up.
 */
export function dishStats(ingredients, secret = false) {
  const sums = {}
  for (const id of ingredients)
    for (const [flavor, potency] of Object.entries(FLAVORS[id] ?? {}))
      sums[flavor] = (sums[flavor] ?? 0) + potency
  const boost = (points) => Math.ceil(points * (secret ? 1.5 : 1))
  const stats = {}
  for (const [flavor, potency] of Object.entries(sums)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3))
    stats[FLAVOR_STAT[flavor]] = boost(potency / 10)
  stats.friendship = boost(ingredients.length)
  return stats
}

/** An ingredient's group: berry, drink or sweet (cakes and candy). */
export const groupOf = (id) =>
  ({ berry: 'berry', drink: 'drink' })[itemById(id)?.kind] ?? 'sweet'
export const GROUP_LABEL = {
  berry: 'quả mọng',
  drink: 'đồ uống',
  sweet: 'bánh ngọt',
}

const SWEETS = new Set(['cake', 'candy'])

/**
 * A dish as the page shows it once known (the database's kitchen_dish):
 * rarity 1 (2 with a sweet), secret 3, legendary 4.
 */
export function dishView(
  id,
  name,
  kind,
  ingredients,
  { secret = false, rarity } = {}
) {
  const stats = dishStats(ingredients, secret)
  return {
    id,
    name,
    kind,
    secret,
    known: true,
    rarity:
      rarity ??
      (secret
        ? 3
        : ingredients.some((i) => SWEETS.has(itemById(i).kind))
          ? 2
          : 1),
    ingredients: [...ingredients].sort(),
    stats,
    top: Object.keys(stats)
      .filter((stat) => stat !== 'friendship')
      .slice(0, 2),
  }
}

/** A secret dish not found yet: its kind, count, groups, 2 strongest stats. */
export function clueOf(dish) {
  const groups = {}
  for (const id of dish.ingredients)
    groups[groupOf(id)] = (groups[groupOf(id)] ?? 0) + 1
  return {
    id: dish.id,
    kind: dish.kind,
    secret: true,
    known: false,
    rarity: dish.rarity,
    count: dish.ingredients.length,
    groups,
    top: dish.top,
  }
}

/**
 * A secret dish's clue in words, e.g. "Bánh kem · 3 nguyên liệu · 1 quả
 * mọng, 2 bánh ngọt · nổi bật Hạnh phúc và Linh hoạt".
 */
export function hintText(clue) {
  return [
    KINDS[clue.kind].label,
    `${clue.count} nguyên liệu`,
    ['berry', 'drink', 'sweet']
      .filter((group) => clue.groups[group])
      .map((group) => `${clue.groups[group]} ${GROUP_LABEL[group]}`)
      .join(', '),
    `nổi bật ${clue.top.map((stat) => STATS[stat].label).join(' và ')}`,
  ].join(' · ')
}

/** The menu's order (the database's): known first, by rarity, by id. */
export const byMenuOrder = (a, b) =>
  Number(a.secret) - Number(b.secret) ||
  a.rarity - b.rarity ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
