// Side-by-side numbers for two Pokémon payloads (PokéAPI /pokemon).

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

/** Reads ?a=&b= (slugs only), so a comparison link is shareable. */
export function readComparePair(search = '') {
  const params = new URLSearchParams(search)
  const clean = (value) => (/^[a-z0-9-]{1,40}$/.test(value || '') ? value : '')
  return { a: clean(params.get('a')), b: clean(params.get('b')) }
}
