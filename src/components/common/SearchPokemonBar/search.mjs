// Pokédex search over the full name list ({ name, url } from /pokemon).

const idOf = (url = '') => Number(url.match(/\/(\d+)\/?$/)?.[1]) || 0
const normalize = (text = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_.'’-]+/g, ' ')
    .trim()

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
    .map(({ score, ...entry }) => entry)
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
