/*
 * A species' vibe from its Pokédex data: five scores from types, egg groups,
 * baby/legendary/mythical, habitat, shape, base stats and English genus and
 * flavor-text keywords; a short list of manual overrides wins. Ties break in
 * the order of VIBES. Pure; the route feeds it /pokemon-species/{id} and
 * /pokemon/{id}. Bump VIBE_VERSION when the rules change.
 */
export const VIBE_VERSION = 1
export const VIBES = ['cute', 'cool', 'fierce', 'mystic', 'nature'] as const
export type Vibe = (typeof VIBES)[number]
type Scores = Record<Vibe, number>
type Weights = Partial<Scores>

export const isSpeciesId = (value: string) =>
  /^[1-9]\d{0,3}$/.test(value) && Number(value) <= 1025

const TYPES: Record<string, Weights> = {
  fairy: { cute: 2, mystic: 1 },
  normal: { cute: 1 },
  psychic: { mystic: 2 },
  ghost: { mystic: 2, fierce: 0.5 },
  dark: { fierce: 1.5, cool: 0.5 },
  dragon: { cool: 1.5, fierce: 1 },
  fire: { cool: 1.5 },
  electric: { cool: 1.5 },
  steel: { cool: 1.5 },
  fighting: { cool: 1, fierce: 1 },
  poison: { fierce: 1.5 },
  grass: { nature: 2 },
  bug: { nature: 1.5 },
  ground: { nature: 1.5 },
  rock: { nature: 1, cool: 0.5 },
  water: { nature: 1, cool: 0.5 },
  ice: { mystic: 1, cool: 0.5 },
  flying: { cool: 0.5, nature: 0.5 },
}
const EGG_GROUPS: Record<string, Weights> = {
  fairy: { cute: 1.5 },
  monster: { fierce: 1 },
  dragon: { cool: 1 },
  plant: { nature: 1.5 },
  bug: { nature: 1 },
  amorphous: { mystic: 1 },
  mineral: { nature: 0.5, mystic: 0.5 },
  humanshape: { cool: 0.5 },
  water1: { nature: 0.5 },
  water2: { nature: 0.5 },
  water3: { nature: 0.5 },
}
const HABITATS: Record<string, Weights> = {
  forest: { nature: 1 },
  grassland: { nature: 1 },
  cave: { mystic: 0.5 },
  rare: { mystic: 1 },
  mountain: { cool: 0.5 },
  sea: { nature: 0.5 },
  'waters-edge': { nature: 0.5 },
  urban: { cool: 0.5 },
}
const SHAPES: Record<string, Weights> = {
  ball: { cute: 1 },
  blob: { cute: 0.5 },
  upright: { cool: 0.5 },
  armor: { fierce: 0.5 },
  tentacles: { mystic: 0.5 },
  squiggle: { mystic: 0.5 },
}
// a trailing * is a prefix; otherwise the whole word, plural allowed
const KEYWORDS: Record<Vibe, string[]> = {
  cute: [
    'cute*',
    'adorable',
    'cuddl*',
    'playful*',
    'friendl*',
    'gentle',
    'affection*',
    'smil*',
    'sweet*',
    'fluff*',
    'innocent',
    'lovel*',
    'hugs',
    'hugging',
    'charm*',
    'baby',
    'babies',
  ],
  cool: [
    'fast',
    'speed*',
    'swift*',
    'lightning',
    'blaz*',
    'flame*',
    'sharp*',
    'proud*',
    'sleek',
    'soar*',
    'jet',
    'roar*',
    'brave*',
    'blade*',
  ],
  fierce: [
    'fierce*',
    'ferocious*',
    'vicious*',
    'savage*',
    'violen*',
    'rage',
    'anger*',
    'angry',
    'destr*',
    'poison*',
    'venom*',
    'fang',
    'brutal*',
    'terrif*',
    'menac*',
    'merciless*',
  ],
  mystic: [
    'myster*',
    'psychic*',
    'spirit*',
    'ghost*',
    'legend*',
    'ancient',
    'dream*',
    'moon*',
    'cosmic',
    'space',
    'telepath*',
    'curse*',
    'shadow*',
    'aura',
    'myth*',
    'soul',
  ],
  nature: [
    'forest*',
    'flower*',
    'leaf',
    'leaves',
    'plant*',
    'seed*',
    'tree',
    'grass*',
    'soil',
    'bloom*',
    'river*',
    'sea',
    'ocean*',
    'pollen',
    'moss*',
    'garden*',
    'fruit*',
  ],
}
const MATCHERS = Object.fromEntries(
  VIBES.map((v) => [
    v,
    KEYWORDS[v].map((k) =>
      k.endsWith('*')
        ? new RegExp(`\\b${k.slice(0, -1)}`)
        : new RegExp(`\\b${k}(?:e?s)?\\b`)
    ),
  ])
) as Record<Vibe, RegExp[]>

// manual calls where the scores miss a species' well-known character
const OVERRIDES: Record<Vibe, number[]> = {
  cute: [
    7, 25, 35, 36, 37, 39, 40, 52, 54, 79, 113, 133, 143, 149, 172, 173, 174,
    175, 183, 184, 242, 298, 311, 312, 417, 427, 468, 700, 702,
  ],
  cool: [6, 9, 26, 59, 169, 257, 448, 658, 727],
  fierce: [24, 89, 110, 130, 229, 248, 319, 373, 445, 461, 635],
  mystic: [38, 65, 92, 93, 94, 150, 151, 196, 197, 282, 359, 429, 609, 778],
  nature: [1, 2, 3, 154, 251, 389, 470],
}
const OVERRIDE = new Map<number, Vibe>(
  VIBES.flatMap((v) => OVERRIDES[v].map((id) => [id, v] as [number, Vibe]))
)

const list = (x: unknown): any[] => (Array.isArray(x) ? x : [])
const english = (x: unknown, field: string) =>
  list(x)
    .filter((e) => e?.language?.name === 'en' && typeof e?.[field] === 'string')
    .map((e) => (e[field] as string).replace(/\s+/g, ' ').toLowerCase())
const hits = (vibe: Vibe, text: string) =>
  MATCHERS[vibe].filter((re) => re.test(text)).length

export function vibeOf(
  species: any,
  pokemon: any
): { vibe: Vibe; scores: Scores } {
  const s = species ?? {}
  const p = pokemon ?? {}
  const scores: Scores = { cute: 0, cool: 0, fierce: 0, mystic: 0, nature: 0 }
  const add = (w?: Weights) => {
    for (const v of VIBES) scores[v] += w?.[v] ?? 0
  }
  for (const t of list(p.types)) add(TYPES[t?.type?.name])
  for (const e of list(s.egg_groups)) add(EGG_GROUPS[e?.name])
  if (s.is_baby) add({ cute: 3 })
  if (s.is_legendary) add({ mystic: 2, cool: 1 })
  if (s.is_mythical) add({ mystic: 3 })
  add(HABITATS[s.habitat?.name])
  add(SHAPES[s.shape?.name])
  const stat: Record<string, number> = {}
  for (const x of list(p.stats))
    if (typeof x?.stat?.name === 'string' && Number.isFinite(x?.base_stat))
      stat[x.stat.name] = x.base_stat
  const total = Object.values(stat).reduce((a, b) => a + b, 0)
  if (stat.attack >= 110) add({ fierce: 1 })
  if (Object.keys(stat).length === 6 && total < 330) add({ cute: 1 })
  if (stat.speed >= 100) add({ cool: 1 })
  if (stat['special-attack'] >= 110) add({ mystic: 0.5 })
  const flavor = [
    ...new Set(english(s.flavor_text_entries, 'flavor_text')),
  ].join(' ')
  const genus = english(s.genera, 'genus').join(' ')
  for (const v of VIBES) {
    scores[v] += Math.min(3, 0.5 * hits(v, flavor))
    if (hits(v, genus) > 0) scores[v] += 1
  }
  for (const v of VIBES) scores[v] = Math.round(scores[v] * 100) / 100
  const best = VIBES.reduce((a, b) => (scores[b] > scores[a] ? b : a))
  return { vibe: OVERRIDE.get(s.id) ?? best, scores }
}
