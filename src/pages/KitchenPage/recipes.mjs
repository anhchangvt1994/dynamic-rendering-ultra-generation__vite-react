// The kitchen's dishes (docs/superpowers/specs/2026-11-02-kitchen-design.md):
// 12 with a known recipe, 8 secret ones to find in the pot. Their stats come
// from their ingredients' flavours, never negative. The kitchen's migration
// (20261104000000_kitchen.sql) has the same recipes: recipes.test.mjs checks
import { FLAVORS, itemById } from '../QuizPage/items.mjs'

/** The stats a dish feeds, each with the flavour behind it and its colour. */
export const STATS = {
  power: { label: 'Sức mạnh', flavor: 'spicy', color: '#e5483b' },
  beauty: { label: 'Sắc đẹp', flavor: 'dry', color: '#3b7be5' },
  happiness: { label: 'Hạnh phúc', flavor: 'sweet', color: '#f07cb4' },
  agility: { label: 'Linh hoạt', flavor: 'sour', color: '#e8c022' },
  wisdom: { label: 'Trí tuệ', flavor: 'bitter', color: '#3fa463' },
  friendship: { label: 'Thân thiện', flavor: null, color: '#ff9f43' },
}

export const FLAVOR_LABEL = {
  spicy: 'Cay',
  dry: 'Chát',
  sweet: 'Ngọt',
  bitter: 'Đắng',
  sour: 'Chua',
}
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

const dish = (
  id,
  name,
  kind,
  ingredients,
  { secret = false, rarity } = {}
) => ({
  id,
  name,
  kind,
  ingredients,
  secret,
  // known 1 (2 with a sweet), secret 3, legendary 4
  rarity:
    rarity ??
    (secret
      ? 3
      : ingredients.some((i) => ['cake', 'candy'].includes(itemById(i).kind))
        ? 2
        : 1),
  stats: dishStats(ingredients, secret),
})
const SECRET = { secret: true }

export const DISHES = [
  dish('poffin-pecha', 'Poffin Pecha', 'poffin', [
    'pecha-berry',
    'pecha-berry',
    'moomoo-milk',
  ]),
  dish('poffin-cheri', 'Poffin Cheri', 'poffin', [
    'cheri-berry',
    'cheri-berry',
    'lava-cookie',
  ]),
  dish('tra-da-chesto', 'Trà đá Chesto', 'smoothie', [
    'chesto-berry',
    'chesto-berry',
    'fresh-water',
  ]),
  dish('nuoc-chanh-aspear', 'Nước chanh Aspear', 'smoothie', [
    'aspear-berry',
    'lemonade',
  ]),
  dish('sup-rawst', 'Súp Rawst', 'soup', [
    'rawst-berry',
    'rawst-berry',
    'oran-berry',
    'fresh-water',
  ]),
  dish('sinh-to-cau-vong', 'Sinh tố cầu vồng', 'smoothie', [
    'oran-berry',
    'pecha-berry',
    'cheri-berry',
    'soda-pop',
  ]),
  dish('banh-kem-sitrus', 'Bánh kem Sitrus', 'cake', [
    'sitrus-berry',
    'moomoo-milk',
    'casteliacone',
  ]),
  dish('keo-deo-leppa', 'Kẹo dẻo Leppa', 'jelly', ['leppa-berry', 'soda-pop']),
  dish('banh-mi-lum', 'Bánh mì kẹp Lum', 'sandwich', [
    'lum-berry',
    'big-malasada',
    'cheri-berry',
  ]),
  dish('ca-ri-lua', 'Cà ri lửa', 'curry', [
    'cheri-berry',
    'lava-cookie',
    'rage-candy-bar',
  ]),
  dish('pudding-lumiose', 'Pudding Lumiose', 'pudding', [
    'lumiose-galette',
    'moomoo-milk',
    'chesto-berry',
  ]),
  dish('banh-quy-pewter', 'Bánh quy Pewter', 'sandwich', [
    'pewter-crunchies',
    'rawst-berry',
    'oran-berry',
  ]),
  dish(
    'poffin-hoang-gia',
    'Poffin Hoàng gia',
    'poffin',
    ['pomeg-berry', 'pecha-berry', 'moomoo-milk'],
    SECRET
  ),
  dish(
    'thach-bien-kelpsy',
    'Thạch biển Kelpsy',
    'jelly',
    ['kelpsy-berry', 'aspear-berry', 'fresh-water'],
    SECRET
  ),
  dish(
    'banh-kem-qualot',
    'Bánh kem Qualot',
    'cake',
    ['qualot-berry', 'big-malasada', 'shalour-sable'],
    SECRET
  ),
  dish(
    'ca-ri-hondew',
    'Cà ri Hondew',
    'curry',
    ['hondew-berry', 'rawst-berry', 'lava-cookie'],
    SECRET
  ),
  dish(
    'sinh-to-grepa',
    'Sinh tố Grepa',
    'smoothie',
    ['grepa-berry', 'lemonade', 'casteliacone'],
    SECRET
  ),
  dish(
    'sup-lua-tamato',
    'Súp lửa Tamato',
    'soup',
    ['tamato-berry', 'cheri-berry', 'cheri-berry'],
    SECRET
  ),
  dish(
    'pudding-co-dien',
    'Pudding cổ điển',
    'pudding',
    ['old-gateau', 'pomeg-berry', 'moomoo-milk'],
    SECRET
  ),
  dish(
    'dai-tiec-cau-vong',
    'Đại tiệc cầu vồng',
    'cake',
    ['pomeg-berry', 'kelpsy-berry', 'qualot-berry', 'hondew-berry'],
    { secret: true, rarity: 4 }
  ),
]

const BY_ID = new Map(DISHES.map((d) => [d.id, d]))
export const dishById = (id) => BY_ID.get(id)

const GROUP = {
  berry: 'quả mọng',
  drink: 'đồ uống',
  cake: 'bánh ngọt',
  candy: 'bánh ngọt',
}

/**
 * A secret dish's clue: its kind, how many ingredients and of which groups,
 * its 2 strongest stats. E.g. "Bánh kem · 3 nguyên liệu · 1 quả mọng, 2 bánh
 * ngọt · nổi bật Hạnh phúc và Linh hoạt".
 */
export function hintOf(dish) {
  const groups = {}
  for (const id of dish.ingredients) {
    const group = GROUP[itemById(id).kind]
    groups[group] = (groups[group] ?? 0) + 1
  }
  const top = Object.keys(dish.stats)
    .filter((stat) => stat !== 'friendship')
    .slice(0, 2)
    .map((stat) => STATS[stat].label)
  return [
    KINDS[dish.kind].label,
    `${dish.ingredients.length} nguyên liệu`,
    Object.entries(groups)
      .map(([group, n]) => `${n} ${group}`)
      .join(', '),
    `nổi bật ${top.join(' và ')}`,
  ].join(' · ')
}
