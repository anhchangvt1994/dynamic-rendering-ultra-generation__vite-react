// Builds supabase/seed/pokemon_evolution_v1.sql from public PokéAPI evolution
// chains. Trade evolutions are rewritten into item evolutions (Linking Cord, or
// the held item); conditions the game cannot evaluate are kept but flagged
// `unavailable`.
//   node scripts/pokemon-evolution/build-seed.mjs [--cache DIR] [--output FILE]
// Downloaded data is parsed as JSON only, never executed. Any malformed entry
// fails the whole build; no partial seed is ever written.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ITEMS } from '../../src/pages/QuizPage/items.mjs'

export const TOTAL = 1025
const API = 'https://pokeapi.co/api/v2/'
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const LINKING_CORD = 'linking-cord'

export const ROW_COLUMNS = [
  'from_species',
  'to_species',
  'alt',
  'trigger',
  'min_level',
  'item',
  'min_happiness',
  'min_affection',
  'min_beauty',
  'time_of_day',
  'gender',
  'known_move',
  'known_move_type',
  'relative_stats',
  'party_species',
  'party_type',
  'trade_species',
  'location',
  'unavailable',
].join(', ')

const BATTLE_TRIGGERS = new Set([
  'three-critical-hits',
  'take-damage',
  'recoil-damage',
  'agile-style-move',
  'strong-style-move',
  'use-move',
])
const SUPPORTED_KEYS = new Set([
  'trigger',
  'min_level',
  'item',
  'held_item',
  'known_move',
  'known_move_type',
  'location',
  'min_affection',
  'min_beauty',
  'min_happiness',
  'time_of_day',
  'gender',
  'party_species',
  'party_type',
  'relative_physical_stats',
  'trade_species',
])
const HANDLED_KEYS = new Set([
  ...SUPPORTED_KEYS,
  'needs_overworld_rain',
  'turn_upside_down',
  'min_steps',
  'min_damage_taken',
  'min_move_count',
  'region',
  'base_form',
  'version_group',
  'is_default',
  'required_pokemon_form',
  'evolved_pokemon_form',
])
const TIMES = new Set(['day', 'dusk', 'night'])
const CHUNK = 500

const fail = (msg) => {
  throw new Error(`pokemon-evolution seed: ${msg}`)
}
const range = (n) => Array.from({ length: n }, (_, i) => i + 1)
const lit = (s) =>
  s === null || s === undefined
    ? 'null'
    : `'${String(s).replaceAll("'", "''")}'`
const num = (v) => (v === null || v === undefined ? 'null' : Number(v))
const present = (v) => v !== null && v !== undefined && v !== '' && v !== false

const speciesId = (ref, what) => {
  const id = Number(/\/pokemon-species\/(\d+)\/?$/.exec(ref?.url ?? '')?.[1])
  return Number.isInteger(id) && id > 0 ? id : fail(`${what} has no species id`)
}
const slug = (ref) => ref?.name ?? null

/** First unsupported condition of one PokéAPI evolution detail, or null. */
function unsupported(d, trigger) {
  if (BATTLE_TRIGGERS.has(trigger)) return 'battle'
  if (
    present(d.min_damage_taken) ||
    present(d.min_move_count) ||
    present(d.used_move)
  )
    return 'battle'
  if (present(d.min_steps)) return 'steps'
  if (present(d.needs_overworld_rain)) return 'rain'
  if (present(d.turn_upside_down)) return 'upside-down'
  if (
    present(d.region) ||
    present(d.base_form) ||
    present(d.evolved_pokemon_form)
  )
    return 'region'
  if (trigger === 'level-up' && present(d.held_item)) return 'held-item'
  if (trigger !== 'level-up' && trigger !== 'use-item' && trigger !== 'trade')
    return 'other'
  if (present(d.party_type)) return 'other'
  if (present(d.time_of_day) && !TIMES.has(d.time_of_day)) return 'other'
  for (const [key, value] of Object.entries(d))
    if (!HANDLED_KEYS.has(key) && present(value)) return 'other'
  return null
}

/** Rows of one PokéAPI evolution chain payload. */
export function parseChain(payload) {
  const root = payload?.chain ?? fail('chain payload without a chain')
  const rows = []
  const walk = (node) => {
    const from = speciesId(node.species, 'chain node')
    for (const next of node.evolves_to ?? []) {
      const to = speciesId(next.species, 'evolution target')
      const details = next.evolution_details
      if (!Array.isArray(details))
        fail(`evolution ${from}→${to} has no details array`)
      // No details = not an evolution (Manaphy hatches from Phione's egg).
      const chosen = details.some((d) => d.is_default)
        ? details.filter((d) => d.is_default)
        : details
      let alt = 0
      chosen.forEach((d) => {
        const trigger =
          d.trigger?.name ?? fail(`evolution ${from}→${to} has no trigger`)
        const unavailable = unsupported(d, trigger)
        let item = null
        if (!unavailable) {
          if (trigger === 'trade')
            item = d.trade_species ? null : (slug(d.held_item) ?? LINKING_CORD)
          else if (trigger === 'use-item')
            item = slug(d.item) ?? fail(`evolution ${from}→${to} has no item`)
        }
        // trading for a species: own that species, or use a Linking Cord
        const swap = !unavailable && trigger === 'trade' && d.trade_species
        rows.push({
          from,
          to,
          alt: alt++,
          trigger:
            unavailable || trigger === 'level-up' || swap
              ? 'level-up'
              : 'use-item',
          minLevel: d.min_level ?? null,
          item,
          minHappiness: d.min_happiness ?? null,
          minAffection: d.min_affection ?? null,
          minBeauty: d.min_beauty ?? null,
          timeOfDay: TIMES.has(d.time_of_day) ? d.time_of_day : null,
          gender: d.gender ?? null,
          knownMove: slug(d.known_move),
          knownMoveType: slug(d.known_move_type),
          relativeStats: d.relative_physical_stats ?? null,
          partySpecies: d.party_species
            ? speciesId(d.party_species, 'party')
            : null,
          partyType: slug(d.party_type),
          tradeSpecies: d.trade_species
            ? speciesId(d.trade_species, 'trade')
            : null,
          location: slug(d.location),
          unavailable,
        })
        if (swap)
          rows.push({
            ...rows.at(-1),
            alt: alt++,
            trigger: 'use-item',
            item: LINKING_CORD,
            tradeSpecies: null,
          })
      })
      walk(next)
    }
  }
  walk(root)
  return rows
}

/** Distinct item ids the supported rows need. */
export const itemsOf = (rows) => [
  ...new Set(rows.map((r) => r.item).filter(Boolean)),
]

export function buildSeed(rows) {
  const tuples = rows
    .toSorted((a, b) => a.from - b.from || a.to - b.to || a.alt - b.alt)
    .map(
      (r) =>
        `  (${[
          r.from,
          r.to,
          r.alt,
          lit(r.trigger),
          num(r.minLevel),
          lit(r.item),
          num(r.minHappiness),
          num(r.minAffection),
          num(r.minBeauty),
          lit(r.timeOfDay),
          num(r.gender),
          lit(r.knownMove),
          lit(r.knownMoveType),
          num(r.relativeStats),
          num(r.partySpecies),
          lit(r.partyType),
          num(r.tradeSpecies),
          lit(r.location),
          lit(r.unavailable),
        ].join(', ')})`
    )
  const out = [
    '-- Generated by scripts/pokemon-evolution/build-seed.mjs. Do not edit.',
    'begin;',
  ]
  for (let i = 0; i < tuples.length; i += CHUNK)
    out.push(
      `insert into public.pokemon_evolutions (${ROW_COLUMNS}) values\n${tuples
        .slice(i, i + CHUNK)
        .join(',\n')}\non conflict (from_species, to_species, alt) do nothing;`
    )
  out.push('commit;', '')
  return out.join('\n')
}

async function getJson(url, cacheFile) {
  if (fs.existsSync(cacheFile))
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.text()
      const json = JSON.parse(body)
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
      fs.writeFileSync(cacheFile, body)
      return json
    } catch (err) {
      if (attempt === 4) fail(`cannot fetch ${url}: ${err.message}`)
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
}

async function pool(items, size, fn) {
  const out = new Map()
  let next = 0
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const item = items[next++]
        out.set(item, await fn(item))
      }
    })
  )
  return out
}

export async function fetchChains(dir, ids = range(TOTAL)) {
  const get = (kind) => (key) =>
    getJson(`${API}${kind}/${key}`, path.join(dir, kind, `${key}.json`))
  const species = await pool(ids, 10, get('pokemon-species'))
  const chainIds = new Set()
  for (const id of ids) {
    const url = species.get(id)?.evolution_chain?.url
    const chainId = Number(/\/evolution-chain\/(\d+)\/?$/.exec(url ?? '')?.[1])
    if (!chainId) fail(`species ${id} has no evolution chain`)
    chainIds.add(chainId)
  }
  return pool(
    [...chainIds].sort((a, b) => a - b),
    10,
    get('evolution-chain')
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (flag, fallback) => {
    const i = process.argv.indexOf(flag)
    return i > 0 ? process.argv[i + 1] : fallback
  }
  const cache = arg('--cache', path.join(ROOT, '.superpowers/pokeapi-build'))
  const output = arg(
    '--output',
    path.join(ROOT, 'supabase/seed/pokemon_evolution_v1.sql')
  )
  const chains = await fetchChains(cache)
  const rows = [...chains.values()].flatMap(parseChain)
  fs.writeFileSync(output, buildSeed(rows))
  const known = new Set(ITEMS.map((i) => i.id))
  const missing = itemsOf(rows).filter((id) => !known.has(id))
  const report = path.join(ROOT, '.superpowers/qa/evolution-missing-items.json')
  fs.mkdirSync(path.dirname(report), { recursive: true })
  fs.writeFileSync(report, JSON.stringify(missing, null, 2))
  console.log(
    `wrote ${path.relative(ROOT, output)} (${rows.length} rows, ${missing.length} items missing from the catalogue)`
  )
}
