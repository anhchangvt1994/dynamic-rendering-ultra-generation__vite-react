// Who's That Pokémon? rounds over the National Pokédex.

export const SPECIES_MAX = 1025

const idOf = (url = '') => Number(url.match(/\/(\d+)\/?$/)?.[1]) || 0

/** Species entries ({ id, name }) from the /pokemon list; forms excluded. */
export function speciesFromList(results = []) {
  return results
    .map((entry) => ({ id: idOf(entry?.url), name: entry?.name ?? '' }))
    .filter((entry) => entry.id >= 1 && entry.id <= SPECIES_MAX && entry.name)
}

// Display names live with the other formatters (search, cards use them too)
import { pokemonLabel as quizLabel } from '../../components/pokemon-page/format.mjs'

export { quizLabel }

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

/** Species of one generation ({ start, end }); everything when none. */
export function inGeneration(species, generation) {
  if (!generation) return species
  return species.filter(
    (entry) => entry.id >= generation.start && entry.id <= generation.end
  )
}

const fold = (text = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .replace(/[^a-z0-9]/g, '')

/**
 * Hard mode: does a typed guess name this species? Ignores case, accents,
 * spaces and punctuation ("mr mime" = "Mr. Mime", "flabebe" = "Flabébé"),
 * and accepts the bare species for default forms ("deoxys").
 */
export function matchesGuess(guess, name) {
  const typed = fold(guess)
  if (!typed) return false
  return typed === fold(name) || typed === fold(quizLabel(name))
}

/** Typed mode: the Pokémon a typed name stands for, -1 when none. */
export function findGuess(guess, species = []) {
  return species.find((entry) => matchesGuess(guess, entry.name))?.id ?? -1
}

export const VEILS = ['warp', 'shards', 'torch']

/** The veil of the next round: never the same one twice in a row. */
export function pickVeil(random = Math.random, previous) {
  const choices = VEILS.filter((veil) => veil !== previous)
  return choices[Math.floor(random() * choices.length)]
}

/** The stage's frame for a streak: 0 plain, 1 gold (2+), 2 fire (3+), 3 rainbow (5, the chest). */
export function tierOf(streak) {
  return streak >= 5 ? 3 : streak >= 3 ? 2 : streak >= 2 ? 1 : 0
}

const MILESTONES = {
  3: '🔥 Chuỗi 3: sắp tới rương quà!',
  5: '🌟 Chuỗi 5: Bậc thầy bóng đen! Mở rương nào!',
}

/** The title a streak earns when it reaches a milestone, else ''. */
export function milestoneOf(streak) {
  return MILESTONES[streak] ?? ''
}

export function readFlag(key, storage = globalThis.localStorage) {
  try {
    return storage?.getItem(key) === '1'
  } catch {
    return false
  }
}

export function saveFlag(key, storage = globalThis.localStorage) {
  try {
    storage?.setItem(key, '1')
  } catch {
    // private mode: the hint shows again next visit
  }
}
