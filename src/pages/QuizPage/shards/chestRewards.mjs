import manifest from './catalog.json' with { type: 'json' }

export const isRare = (entry) =>
  !!(entry.legendary || entry.mythical || entry.captureRate <= 45)

// Membership and metadata both belong to frozen catalog v1. A partial seed
// must not silently change either the pool or the 70/30 split.
const expected = new Map(manifest.species.map((entry) => [entry.id, entry]))
export function completeCatalog(entries) {
  if (!Array.isArray(entries) || entries.length !== expected.size) return false
  const seen = new Set()
  return entries.every((entry) => {
    const source = expected.get(entry?.id)
    if (!source || seen.has(entry.id)) return false
    seen.add(entry.id)
    return ['captureRate', 'legendary', 'mythical'].every(
      (key) => entry[key] === source[key]
    )
  })
}

const roll = (value) => {
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new RangeError('invalid_entropy')
  return value
}

export function drawChestShards(kind, entries, entropy) {
  if (kind !== 'combo' && kind !== 'special')
    throw new TypeError('invalid_kind')
  if (!completeCatalog(entries)) throw new Error('catalog_unavailable')
  const n = Math.floor(roll(entropy?.countRoll) * 4)
  if (!Array.isArray(entropy.pieces) || entropy.pieces.length !== 3)
    throw new TypeError('invalid_entropy')
  for (const piece of entropy.pieces) {
    roll(piece?.groupRoll)
    roll(piece?.speciesRoll)
  }
  const all = [...entries].sort((a, b) => a.id - b.id)
  const rare = all.filter(isRare)
  const common = all.filter((entry) => !isRare(entry))
  const counts = new Map()
  for (const piece of entropy.pieces.slice(0, n)) {
    const pool = kind === 'combo' ? all : piece.groupRoll < 0.7 ? rare : common
    const id = pool[Math.floor(piece.speciesRoll * pool.length)].id
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return [...counts]
    .sort(([a], [b]) => a - b)
    .map(([speciesId, count]) => ({ speciesId, count }))
}
