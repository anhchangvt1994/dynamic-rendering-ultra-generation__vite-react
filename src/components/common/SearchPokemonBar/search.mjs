// Pokédex search over the full name list ({ name, url } from /pokemon).

const idOf = (url = '') => Number(url.match(/\/(\d+)\/?$/)?.[1]) || 0
const normalize = (text = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_.'’-]+/g, ' ')
    .trim()

// National Dex numbers: anything above is an alternate form
const SPECIES_MAX = 1025

// Species by name and by each leading part of its default form's name
// ("zygarde-50" also answers to "zygarde"), built once per list
const speciesIndex = new WeakMap()
const speciesOf = (list) => {
  let index = speciesIndex.get(list)
  if (index) return index
  index = new Map()
  for (const entry of list) {
    const id = idOf(entry?.url)
    if (!entry?.name || !id || id > SPECIES_MAX) continue
    const parts = entry.name.split('-')
    for (let size = parts.length; size > 0; size--) {
      const key = parts.slice(0, size).join('-')
      if (!index.has(key)) index.set(key, id)
    }
  }
  speciesIndex.set(list, index)
  return index
}

/**
 * The National Dex number of a form's species ("koraidon-swimming-build"
 * → 1007): the longest leading part of its name naming a species. A form's
 * own images can be missing; its species' are the last resort.
 */
export function baseIdOf(list = [], name = '') {
  const index = speciesOf(list)
  const parts = name.split('-')
  for (let size = parts.length - 1; size > 0; size--) {
    const id = index.get(parts.slice(0, size).join('-'))
    if (id) return id
  }
}

/**
 * Ranks matches: dex number, exact name, name start, word start, anywhere.
 * Alternate forms (id > 10000) rank after species with the same score.
 * "mr mime", "mr-mime" and "mr. mime" all match; "#25" and "25" find #25.
 */
export function searchPokemon(list = [], query = '', limit = 30) {
  const q = normalize(query.replace(/^#/, ''))
  if (!q) return []
  const number = /^\d+$/.test(q) ? Number(q) : 0

  const scored = []
  for (const entry of list) {
    if (!entry?.name) continue
    const id = idOf(entry.url)
    const name = normalize(entry.name)
    let score = -1
    if (number) {
      if (id === number) score = 0
      else if (String(id).startsWith(q) && id < 10000) score = 4
    } else if (name === q) score = 1
    else if (name.startsWith(q)) score = 2
    else if (name.includes(` ${q}`)) score = 3
    else if (name.includes(q)) score = 4
    if (score < 0) continue
    scored.push({ ...entry, id, score: score + (id > 10000 ? 0.5 : 0) })
  }
  return scored
    .sort((a, b) => a.score - b.score || a.id - b.id)
    .slice(0, limit)
    .map((entry) => ({
      name: entry.name,
      url: entry.url,
      id: entry.id,
      ...(entry.id > SPECIES_MAX ? { baseId: baseIdOf(list, entry.name) } : {}),
    }))
}

// where the typed text sits inside the displayed (hyphenated) name
export function matchRange(name = '', query = '') {
  const q = normalize(query.replace(/^#/, ''))
  if (!q || /^\d+$/.test(q)) return null
  const folded = normalize(name)
  // punctuation folding changed the length ("Mr. Mime"): offsets would
  // drift, so skip the highlight rather than mark the wrong letters
  if (folded.length !== name.length) return null
  const at = folded.indexOf(q)
  return at < 0 ? null : [at, at + q.length]
}
