// "Ai đây?" — Who's that Pokémon? rounds over the National Pokédex.

export const SPECIES_MAX = 1025

const idOf = (url = '') => Number(url.match(/\/(\d+)\/?$/)?.[1]) || 0

/** Species entries ({ id, name }) from the /pokemon list; forms excluded. */
export function speciesFromList(results = []) {
  return results
    .map((entry) => ({ id: idOf(entry?.url), name: entry?.name ?? '' }))
    .filter((entry) => entry.id >= 1 && entry.id <= SPECIES_MAX && entry.name)
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

/** "deoxys-normal" → "Deoxys": the list names default forms; show species. */
export function quizLabel(name = '') {
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

/** Small seeded PRNG (mulberry32) so rounds are testable and reproducible. */
export function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * One round: an answer plus `count` distinct options (answer included, in a
 * random position). Avoids repeating any id in `recent`.
 */
export function makeRound(
  species,
  random = Math.random,
  recent = [],
  count = 4
) {
  if (species.length < count) return null
  const pick = (exclude) => {
    for (let tries = 0; tries < 50; tries++) {
      const entry = species[Math.floor(random() * species.length)]
      if (!exclude.has(entry.id)) return entry
    }
    return species.find((entry) => !exclude.has(entry.id))
  }
  const answer = pick(new Set(recent))
  const used = new Set([answer.id])
  const options = [answer]
  while (options.length < count) {
    const option = pick(used)
    used.add(option.id)
    options.push(option)
  }
  // Fisher–Yates with the same random source
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { answer, options }
}

const BEST_KEY = 'pokedex:quiz-best'

export function readBest(storage = globalThis.localStorage) {
  try {
    return Math.max(0, Number(storage?.getItem(BEST_KEY)) || 0)
  } catch {
    return 0
  }
}

export function saveBest(value, storage = globalThis.localStorage) {
  try {
    storage?.setItem(BEST_KEY, String(value))
  } catch {
    // private mode / quota: the streak still counts for this visit
  }
}
